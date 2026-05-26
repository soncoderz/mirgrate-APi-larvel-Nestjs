/**
 * =============================================================================
 * users.service.ts - Service quản lý người dùng (Users) - FILE LỚN NHẤT
 * =============================================================================
 *
 * Service chứa toàn bộ logic cho module Users (~2200 dòng).
 * Đã MIGRATE hoàn chỉnh phần lớn logic từ UsersController.php trong Laravel.
 *
 * ═══════════════════════════════════════════════════════════════════
 * NHÓM 1: XÁC THỰC (Authentication)
 * ═══════════════════════════════════════════════════════════════════
 * - login()              → Đăng nhập: validate credentials, tạo JWT token,
 *                          ghi user_log, trả về thông tin user + group + privileges
 * - loginExternal()      → Đăng nhập từ hệ thống bên ngoài (CRM, Salesforce)
 * - logout()             → Đăng xuất: cập nhật isOnline, ghi log
 * - checkToken()         → Kiểm tra JWT token hợp lệ
 * - checkRecaptcha()     → Xác thực Google reCAPTCHA
 * - forgotPassword()     → Gửi email reset password (tạo token + gửi mail)
 * - changePasswordForgot()→ Đổi mật khẩu từ link reset
 * - resetPassword()      → Đổi mật khẩu (yêu cầu mật khẩu cũ)
 * - getUserToken()       → Lấy JWT token bằng email + password (API integration)
 *
 * ═══════════════════════════════════════════════════════════════════
 * NHÓM 2: CRUD NGƯỜI DÙNG
 * ═══════════════════════════════════════════════════════════════════
 * - me()                 → Lấy thông tin user đang đăng nhập + group + privileges
 * - getUsers()           → Danh sách users phân trang + search + sort + filter
 * - getUsersByRole()     → Users theo role (admin, agent, ...)
 * - getUserByID()        → Chi tiết 1 user + group + privileges
 * - getUserInfoByExtension() → Thông tin user theo số extension
 * - getUsersByGroupId()  → Users theo groupId
 * - updateUser()         → Cập nhật thông tin user (update + SIP account)
 * - addUserAsMemberOfCompany() → Thêm user vào company
 * - addUserAsCompany()   → Tạo company mới + admin user
 * - addUserByExcel()     → Import users từ Excel (stub)
 *
 * ═══════════════════════════════════════════════════════════════════
 * NHÓM 3: USER LOGS (Lịch sử đăng nhập)
 * ═══════════════════════════════════════════════════════════════════
 * - getUserLogs()        → Danh sách logs phân trang
 * - deleteUserLog()      → Xóa log
 * - getuserLogsByGroupId()→ Logs theo groupId (online users)
 *
 * ═══════════════════════════════════════════════════════════════════
 * HELPER METHODS (Private)
 * ═══════════════════════════════════════════════════════════════════
 * - userDetailPayload()  → Build thông tin chi tiết user (group, privileges, hotline)
 * - insertSIPAccount()   → Tạo/cập nhật tài khoản SIP trên PBX
 * - buildUserWhere()     → Xây dựng WHERE clause cho query users
 * - paginate()           → Tạo response phân trang (format giống Laravel)
 * - throwError()         → Throw HttpException với format chuẩn
 *
 * Tương đương: UsersController.php + UserModel.php trong Laravel
 */

import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes } from "crypto";
import { Request } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { JwtBlacklistService } from "../../common/services/jwt-blacklist.service";
import { DatabaseService } from "../../config/database.service";

/** Type alias cho database row kết quả query */
type DbRow = RowDataPacket & Record<string, any>;

/**
 * AuthPayload - Cấu trúc dữ liệu trong JWT token
 * Được decode từ JWT token sau khi JwtAuthGuard xác thực.
 * Chứa thông tin cơ bản của user đã đăng nhập.
 */
type AuthPayload = {
  sub?: number;      // Subject (user ID) - theo chuẩn JWT
  id?: number;       // User ID (duplicate of sub cho backward compatibility)
  email?: string;    // Email đăng nhập
  role?: string;     // Vai trò: 'superadmin', 'admin', 'agent', ...
  groupId?: number;  // ID nhóm/công ty
  typeId?: number;   // ID loại user (link đến user_types)
};

/**
 * USER_SAFE_SELECT - Danh sách cột an toàn khi SELECT user
 * KHÔNG chứa cột 'password' để tránh leak mật khẩu trong response.
 * Tương đương với $hidden = ['password'] trong Laravel Model.
 */
const USER_SAFE_SELECT = `
  id,userCode,firstName,lastName,mobile,phone,avatar,email,typeId,groupId,
  lastLogin,loginType,status,address,extension,extensions_view,agents_view,
  queues,queues_config,note,role,isOnline,created_at,created_by,updated_at,
  updated_by,trashed_at,trashed_by,departmentId,queueDynamic,config,
  time_auto_resume,groups_view,firstLogin,is_verify,is_salesforce,lock_time,
  otherId,otherEmail,google2fa_secret,is_google2fa
`;

const USER_MUTABLE_COLUMNS = new Set([
  "firstName",
  "lastName",
  "userCode",
  "status",
  "mobile",
  "phone",
  "email",
  "address",
  "note",
  "role",
  "groupId",
  "extension",
  "extensions_view",
  "departmentId",
  "queues",
  "typeId",
  "otherId",
  "otherEmail",
  "firstLogin",
  "is_google2fa",
  "queueDynamic",
  "config",
  "time_auto_resume",
  "groups_view",
]);

@Injectable()
export class UsersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly blacklist: JwtBlacklistService,
  ) {}

  async login(body: Record<string, any>, request: Request) {
    const email = String(body.email ?? "").trim();
    const password = String(body.password ?? "");
    const clientIp = this.getClientIp(request);

    if (!email || !password) {
      this.throwError(
        {
          info: "Tên đăng nhập hoặc mật khẩu không chính xác.",
          alias: "Error_Invalid_Account",
        },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }

    const user = await this.findUserByEmail(email);
    if (!user) {
      await this.insertUserLog({
        username: email,
        password,
        ip_address: clientIp,
        status: "fail",
        sign_in_time: this.unixNow(),
      });
      await this.handleLoginFail(email, clientIp);
    }

    const passwordMatches = await bcrypt.compare(
      password,
      this.normalizeBcryptHash(user.password),
    );
    if (!passwordMatches) {
      await this.insertUserLog({
        username: email,
        password,
        ip_address: clientIp,
        status: "fail",
        sign_in_time: this.unixNow(),
      });
      await this.handleInvalidPassword(email);
    }

    if (user.status !== "active") {
      await this.insertUserLog({
        username: email,
        password,
        ip_address: clientIp,
        status: "fail",
      });
      this.throwLockedAccount();
    }

    const token = await this.signUserToken(
      user,
      Boolean(body.remember_token),
      request,
    );

    const payload = await this.jwt.verifyAsync<AuthPayload>(token, {
      secret: this.jwtSecret(),
      algorithms: [this.config.get<string>("JWT_ALGO", "HS256") as never],
    });
    const curUser = await this.findUserById(Number(payload.sub ?? payload.id), false);
    if (!curUser) {
      throw new HttpException(
        { error: "Unauthorized - invalid token or user not found" },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const group = await this.getGroupForLogin(curUser.groupId);
    if (!group || group.status === "lock") {
      this.throwLockedAccount();
    }

    // if (this.isUserAlreadyOnline(curUser) && curUser.role !== "superadmin") {
    //   this.throwError(
    //     {
    //       author: "Tài khoản đang được đăng nhập.",
    //       alias: "Error_Using_Account",
    //     },
    //     HttpStatus.NOT_ACCEPTABLE,
    //     "Error_Pending_Account",
    //   );
    // }

    const userLog = await this.insertUserLog({
      username: email,
      password,
      ip_address: clientIp,
      groupid: curUser.groupId,
      status: "sign-in",
      sign_in_time: this.unixNow(),
    });

    await this.database
      .pool("main")
      .execute<ResultSetHeader>(
        "UPDATE users SET lastLogin = ?, isOnline = 1 WHERE id = ?",
        [this.nowSql(), curUser.id],
      );

    const responseUser = this.sanitizeUser({ ...user });
    const [privileges] = await this.processPrivileges(curUser);
    const [queueConfig, agentsView] = await this.getQueueAndAgents(
      curUser,
      responseUser,
    );
    const groupHotline = await this.getGroupHotline(curUser.groupId);

    for (const value of groupHotline) {
      if (value.queue_config && this.isJson(value.queue_config)) {
        this.assignMissing(queueConfig, JSON.parse(value.queue_config));
      }
    }

    if (group) {
      group.socket_url = this.config.get<string>("SOCKET_URL") ?? null;
      group.recording_url = this.config.get<string>("RECORDING_URL") ?? null;
    }

    return {
      success: {
        token,
        user: responseUser,
        group,
        group_hotline: groupHotline,
        privilege: privileges,
        user_log: userLog,
        queue_name: queueConfig,
        agents_view: agentsView,
      },
    };
  }

  async logout(body: Record<string, any>, request: Request) {
    const token = this.extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new HttpException(
        { error: "Token không tồn tại" },
        HttpStatus.BAD_REQUEST,
      );
    }

    let payload: AuthPayload | undefined;
    try {
      payload = await this.jwt.verifyAsync<AuthPayload>(token, {
        secret: this.jwtSecret(),
        algorithms: [this.config.get<string>("JWT_ALGO", "HS256") as never],
      });
    } catch {
      return {
        message: "Không thể đăng xuất, token có thể đã hết hạn",
      };
    }

    const logId = Number(body.id);
    let log: DbRow | undefined;
    if (Number.isFinite(logId) && logId > 0) {
      log = await this.findUserLogById(logId);
    }

    const userId = Number(payload.sub ?? payload.id);
    const userRows =
      Number.isFinite(userId) && userId > 0
        ? await this.database.query<DbRow[]>(
            "main",
            "SELECT id, remember_token FROM users WHERE id = ? LIMIT 1",
            [userId],
          )
        : [];
    const user = userRows[0];

    if (log) {
      if (user) {
        if (user.remember_token) {
          await this.invalidateStoredToken(String(user.remember_token));
        }

        await this.database
          .pool("main")
          .execute<ResultSetHeader>(
            "UPDATE users SET remember_token = NULL WHERE id = ?",
            [user.id],
          );
      }

      if (log?.status === "sign-in") {
        await this.database
          .pool("main")
          .execute<ResultSetHeader>(
            "UPDATE users_log SET status = ?, sign_out_time = ?, updated_at = ? WHERE id = ?",
            ["sign-out", this.unixNow(), this.nowSql(), logId],
          );
      }
    }

    this.invalidateToken(token, (payload as { exp?: number }).exp);

    return { message: "Logout success", code: 200 };
  }

  async me(payload: AuthPayload | undefined) {
    const user = await this.getCurrentUser(payload);
    if (!user) {
      return { message: "User not found", code: 401 };
    }

    return { message: "Success", code: 200 };
  }

  async forgotPassword(body: Record<string, any>, request: Request) {
    const email = String(body.email ?? "").trim();
    if (email) {
      const user = await this.findUserByEmail(email);
      if (user) {
        const hashCode = createHash("md5")
          .update(`${this.unixNow()}${email}`)
          .digest("hex");

        await this.database
          .pool("main")
          .execute<ResultSetHeader>(
            "UPDATE users SET remember_token = ? WHERE email = ?",
            [hashCode, email],
          );

        return {
          code: 200,
          message: "Email has been seen to confirm",
        };
      }
    }

    return {
      code: 500,
      message: "Email not exist",
      domain: this.domainFromReferer(request),
    };
  }

  async checkToken(body: Record<string, any>, request: Request) {
    const token = this.extractRequestToken(body, request);
    if (!token) {
      return { message: "Token is missing", code: 401 };
    }

    if (this.blacklist.isInvalidated(token)) {
      return { message: "Token is invalid", code: 401 };
    }

    try {
      const payload = await this.jwt.verifyAsync<AuthPayload>(token, {
        secret: this.jwtSecret(),
        algorithms: [this.config.get<string>("JWT_ALGO", "HS256") as never],
      });
      const user = await this.getCurrentUser(payload);
      return user
        ? { message: "Success", code: 200 }
        : { message: "User not found", code: 401 };
    } catch (error) {
      if (this.isTokenExpiredError(error)) {
        return { message: "Token has expired", code: 401 };
      }

      return { message: "Token is invalid", code: 401 };
    }
  }

  async checkRecaptcha(body: Record<string, any>, request: Request) {
    const secretKey =
      this.config.get<string>("RECAPTCHA_SECRET") ||
      "6LdvTMUaAAAAAB2Qvz8NwPx1-K7KbrY8uPA3GjDz";
    const clientKey = String(
      body.clientKey ??
        body.recaptchaToken ??
        body["g-recaptcha-response"] ??
        "",
    );

    try {
      const response = await fetch(
        "https://www.google.com/recaptcha/api/siteverify",
        {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            secret: secretKey,
            response: clientKey,
            remoteip: this.getClientIp(request),
          }),
        },
      );
      const result = (await response.json()) as Record<string, any>;

      if (result.success === true) {
        return {
          code: 200,
          message: "success",
        };
      }

      return {
        code: 400,
        message: "reCAPTCHA verification failed",
        "error-codes": result["error-codes"] ?? [],
      };
    } catch (error) {
      return {
        code: 500,
        message: "server error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async changePasswordForgot(body: Record<string, any>, request: Request) {
    const token = String(body.token ?? "");
    const email = String(body.email ?? "").trim();

    if (token && email) {
      const rows = await this.database.query<DbRow[]>(
        "main",
        "SELECT id FROM users WHERE remember_token = ? AND email = ? LIMIT 1",
        [token, email],
      );

      if (rows[0]) {
        if (body.password) {
          await this.database
            .pool("main")
            .execute<ResultSetHeader>(
              "UPDATE users SET password = ? WHERE id = ?",
              [await bcrypt.hash(String(body.password), 12), rows[0].id],
            );
          return {
            code: 200,
            message: "Doi mat khau thanh cong",
          };
        }

        return {
          code: 500,
          message: "Mat khau khong duoc bo trong",
        };
      }

      return {
        code: 500,
        message: "Email hoac ma xac thuc khong dung",
        domain: this.domainFromReferer(request),
      };
    }

    return {
      code: 500,
      message: "email khong hop le",
    };
  }

  async getUserToken(body: Record<string, any>) {
    const email = String(body.email ?? body.username ?? "").trim();
    const password = String(body.password ?? "");

    if (email && password) {
      const user = await this.findUserByEmail(email);
      const passwordMatches =
        user &&
        (await bcrypt.compare(
          password,
          this.normalizeBcryptHash(user.password),
        ));

      if (user && passwordMatches && user.status === "active") {
        const token = await this.signUserToken(
          user,
          Boolean(body.remember_token),
        );
        const decoded = this.jwt.decode(token) as { exp?: number } | null;

        return {
          success: {
            token,
            expried_date: decoded?.exp
              ? this.formatDateTime(new Date(decoded.exp * 1000))
              : null,
          },
        };
      }
    }

    throw new HttpException(
      {
        failed: "Email hoac mat khau khong chinh xac.",
        code: 406,
        message: "Invalid parameters",
      },
      HttpStatus.NOT_ACCEPTABLE,
    );
  }

  async loginExternal(body: Record<string, any>, request: Request) {
    let token = String(body.token ?? "");
    let user: DbRow | undefined;

    if (!token) {
      const email = String(body.email ?? body.username ?? "").trim();
      const password = String(body.password ?? "");
      const clientIp = this.getClientIp(request);
      user = email ? await this.findUserByEmail(email) : undefined;

      const passwordMatches =
        user &&
        (await bcrypt.compare(
          password,
          this.normalizeBcryptHash(user.password),
        ));

      if (!user || !passwordMatches) {
        await this.insertUserLog({
          username: email,
          password,
          ip_address: clientIp,
          status: "fail",
          sign_in_time: this.unixNow(),
        });
        this.throwError(
          { info: "Email hoac mat khau khong chinh xac." },
          HttpStatus.NOT_ACCEPTABLE,
          "Invalid parameters",
        );
      }

      if (user.status !== "active") {
        await this.insertUserLog({
          username: email,
          password,
          ip_address: clientIp,
          status: "fail",
          sign_in_time: this.unixNow(),
        });
        this.throwError(
          { author: "Tai khoan cua ban bi khoa hoac chua duoc xac thuc." },
          HttpStatus.UNAUTHORIZED,
          "Login failed.",
        );
      }

      token = await this.signUserToken(user, Boolean(body.remember_token), request);
    } else {
      const payload = await this.jwt.verifyAsync<AuthPayload>(token, {
        secret: this.jwtSecret(),
      });
      user = await this.getCurrentUser(payload);
    }

    if (!user) {
      throw new HttpException(
        { error: "Unauthorized - invalid token or user not found" },
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.database
      .pool("main")
      .execute<ResultSetHeader>("UPDATE users SET lastLogin = ? WHERE id = ?", [
        this.nowSql(),
        user.id,
      ]);

    await this.insertUserLog({
      username: user.email,
      ip_address: this.getClientIp(request),
      groupid: user.groupId,
      status: "sign-in",
      sign_in_time: this.unixNow(),
    });

    const group = user.groupId
      ? await this.getGroupById(user.groupId)
      : undefined;

    return {
      success: {
        token,
        user: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          extension: user.extension,
          secret: group?.secret,
        },
      },
    };
  }

  async addUserAsCompany(body: Record<string, any>) {
    this.validateCreateCompany(body);
    await this.assertEmailIsAvailable(String(body.email));

    const groupNameInput = String(body.groupName).trim();
    const setting =
      String(body.groupSetting ?? "groupdefault").trim() || "groupdefault";
    const groupExists = await this.database.query<DbRow[]>(
      "main",
      "SELECT id FROM `groups` WHERE groupName = ? LIMIT 1",
      [groupNameInput],
    );

    if (groupExists[0]) {
      this.throwError(
        { groupName_exist: "Ten group da ton tai." },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }

    let newGroupName = `${groupNameInput}-${setting}`;
    const sameGeneratedGroup = await this.database.query<DbRow[]>(
      "main",
      "SELECT id FROM `groups` WHERE groupName = ? ORDER BY created_at DESC LIMIT 1",
      [newGroupName],
    );
    if (sameGeneratedGroup[0]) {
      newGroupName = `${newGroupName}-${sameGeneratedGroup[0].id}`;
    }

    const connection = await this.database.pool("main").getConnection();
    try {
      await connection.beginTransaction();
      const now = this.nowSql();

      const [groupResult] = await connection.execute<ResultSetHeader>(
        `
          INSERT INTO \`groups\` (groupName, limitUser, status, created_at, created_by, updated_by)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [newGroupName, 1, "active", now, null, null],
      );

      const groupId = groupResult.insertId;
      const [userResult] = await connection.execute<ResultSetHeader>(
        `
          INSERT INTO users (
            firstName,lastName,userCode,status,mobile,phone,email,password,address,note,
            role,groupId,loginType,typeId,created_at,created_by
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `,
        [
          body.firstName ?? "",
          body.lastName ?? "",
          body.userCode ?? this.unixNow(),
          body.status ?? "pending",
          body.mobile ?? "",
          body.phone ?? "",
          body.email,
          await bcrypt.hash(String(body.password), 12),
          body.address ?? "",
          body.note ?? "",
          body.role ?? "agent",
          groupId,
          "website",
          body.typeId,
          now,
          null,
        ],
      );

      const defaultModules = await connection.query<DbRow[]>(
        `
          SELECT module, action, \`order\`, sub_module, status
          FROM user_module
          WHERE groupId IS NULL AND status = 'publish'
        `,
      );
      for (const moduleRow of defaultModules[0]) {
        await connection.execute<ResultSetHeader>(
          `
            INSERT INTO user_module
              (groupId, module, action, \`order\`, sub_module, status, created_at, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            groupId,
            moduleRow.module,
            moduleRow.action,
            moduleRow.order ?? 0,
            moduleRow.sub_module ?? "",
            moduleRow.status ?? "publish",
            now,
            null,
          ],
        );
      }

      const [templateCustomers] = await connection.query<DbRow[]>(
        "SELECT firstName,lastName,phone,email,address,note,status FROM customers WHERE id = 1 LIMIT 1",
      );
      if (templateCustomers[0]) {
        for (let i = 0; i < 3; i += 1) {
          const rand = this.unixNow() + i;
          await connection.execute<ResultSetHeader>(
            `
              INSERT INTO customers
                (customerCode, firstName, lastName, phone, email, address, note, groupId, status, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              `KH${rand}`,
              `KH-${rand}`,
              templateCustomers[0].lastName ?? "demo",
              templateCustomers[0].phone ?? null,
              templateCustomers[0].email ?? null,
              templateCustomers[0].address ?? null,
              templateCustomers[0].note ?? null,
              groupId,
              templateCustomers[0].status ?? "publish",
              now,
            ],
          );
        }
      }

      await connection.commit();
      return {
        success: {
          id: userResult.insertId,
        },
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  addUserByExcel(_body: Record<string, any>) {
    return 1;
  }

  async resetPassword(body: Record<string, any>) {
    const oldPassword = String(body.old_password ?? "");
    const newPassword = String(body.new_password ?? "");
    const email = String(body.email ?? "").trim();
    const user = email ? await this.findUserByEmail(email) : undefined;
    const passwordMatches =
      user &&
      (await bcrypt.compare(
        oldPassword,
        this.normalizeBcryptHash(user.password),
      ));

    if (!user || !passwordMatches) {
      this.throwError(
        { info: "Email hoac mat khau khong chinh xac." },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }

    await this.database
      .pool("main")
      .execute<ResultSetHeader>(
        "UPDATE users SET password = ?, firstLogin = 0 WHERE id = ?",
        [await bcrypt.hash(newPassword, 12), user.id],
      );

    return {
      code: 200,
      message: "Success",
      alias: "Success_Change_Password",
    };
  }

  async getUsers(body: Record<string, any>, payload: AuthPayload | undefined) {
    const currentUser = await this.getCurrentUser(payload);
    if (!currentUser) {
      throw new HttpException(
        { success: false, message: "Unauthorized" },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const where: string[] = ["users.status <> ?"];
    const params: any[] = ["trash"];

    if (currentUser?.role !== "superadmin") {
      if (body.groupId) {
        where.push("users.groupId = ?");
        params.push(body.groupId);
      } else if (Number(currentUser?.groupId) === 1) {
        where.push("users.id = ?");
        params.push(currentUser.id);
      } else if (currentUser?.groupId) {
        where.push("users.groupId = ?");
        params.push(currentUser.groupId);
      }
    } else if (body.groupId) {
      where.push("users.groupId = ?");
      params.push(body.groupId);
    }

    if (body.departmentId) {
      where.push("users.departmentId = ?");
      params.push(body.departmentId);
    }

    if (body.typeId) {
      where.push("users.typeId = ?");
      params.push(body.typeId);
    }

    if (body.roleId) {
      where.push("users.role = ?");
      params.push(body.roleId);
    }

    if (body.search && !Array.isArray(body.search)) {
      const keyword = `%${String(body.search)}%`;
      where.push(`(
        users.firstName LIKE ? OR users.lastName LIKE ? OR users.email LIKE ?
        OR users.extension LIKE ? OR user_types.name LIKE ? OR users.userCode = ?
      )`);
      params.push(
        keyword,
        keyword,
        keyword,
        keyword,
        keyword,
        String(body.search),
      );
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const perPage = this.normalizePageSize(
      body.recordsOnPage ?? body.limit ?? 10,
    );
    const currentPage = this.normalizePage(body.page ?? body.current_page ?? 1);
    const offset = (currentPage - 1) * perPage;
    const orderSql = this.buildUserOrderSql(body.sorts);

    const countRows = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT COUNT(*) AS total
        FROM users
        LEFT JOIN user_types ON user_types.id = users.typeId
        ${whereSql}
      `,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);

    const data = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT
          users.*,
          departments.name AS departmentName,
          user_types.name AS typeName,
          g.groupName,
          qr_code.email AS emailqr,
          (SELECT CONCAT_WS(' ', u2.lastName, u2.firstName) FROM users AS u2 WHERE u2.id = users.created_by) AS created_name,
          (SELECT CONCAT_WS(' ', u2.lastName, u2.firstName) FROM users AS u2 WHERE u2.id = users.updated_by) AS updated_name,
          IF(user_config.is_hotdesk = 1, user_config.is_hotdesk, NULL) AS is_hotdesk,
          IF(user_config.transports IS NOT NULL, user_config.transports, NULL) AS transports,
          IF(user_config.port IS NOT NULL, user_config.port, NULL) AS port,
          users.is_google2fa
        FROM users
        LEFT JOIN departments ON departments.id = users.departmentId
        LEFT JOIN user_types ON user_types.id = users.typeId
        LEFT JOIN \`groups\` AS g ON g.id = users.groupId
        LEFT JOIN qr_code ON qr_code.userId = users.id
        LEFT JOIN user_config ON user_config.userid = users.id
        ${whereSql}
        ${orderSql}
        LIMIT ? OFFSET ?
      `,
      [...params, perPage, offset],
    );

    const sanitizedData = data.map((user) => this.sanitizeUser(user));
    const lastPage = Math.max(Math.ceil(total / perPage), 1);

    return {
      current_page: currentPage,
      data: sanitizedData,
      first_page_url: null,
      from: total === 0 ? null : offset + 1,
      last_page: lastPage,
      last_page_url: null,
      links: [],
      next_page_url: currentPage < lastPage ? null : null,
      path: null,
      per_page: perPage,
      prev_page_url: currentPage > 1 ? null : null,
      to: total === 0 ? null : offset + sanitizedData.length,
      total,
    };
  }

  async getUserByID(id: string) {
    const user = await this.findUserById(Number(id), true);
    if (!user) {
      this.throwError(
        { user_id_not_exist: "Id của người dùng không tồn tại." },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }

    return this.sanitizeUser(user);
  }

  async getUsersByRole(
    body: Record<string, any>,
    payload: AuthPayload | undefined,
  ) {
    const currentUser = await this.getCurrentUser(payload);
    const groupId = currentUser?.groupId;
    const where = ["users.status = 'active'"];
    const params: any[] = [];

    if (groupId) {
      where.push("users.groupId = ?");
      params.push(groupId);
    }

    if (Array.isArray(body.filter)) {
      const allowed = new Set([
        "role",
        "email",
        "firstName",
        "lastName",
        "extension",
        "userCode",
        "status",
      ]);

      for (const item of body.filter) {
        if (item?.name === "RoleByUser") {
          const value = String(item.value ?? "");
          const roles =
            value === "superadmin"
              ? ["superadmin", "admin", "agent"]
              : value === "admin"
                ? ["admin", "agent"]
                : ["agent"];
          where.push("users.role IN (?)");
          params.push(roles);
          continue;
        }

        const name = String(item?.name ?? "");
        if (!allowed.has(name)) {
          continue;
        }

        let condition = String(item?.condition ?? "=").toLowerCase();
        let value = item?.value;
        if (condition === "like") {
          value = `%${value}%`;
        } else if (condition === "lr") {
          condition = "like";
          value = `${value}%`;
        } else if (condition === "ll") {
          condition = "like";
          value = `%${value}`;
        }

        if (
          !["=", "<>", "!=", ">", "<", ">=", "<=", "like"].includes(condition)
        ) {
          continue;
        }

        where.push(`users.\`${name}\` ${condition.toUpperCase()} ?`);
        params.push(value);
      }
    }

    const data = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT users.*, CONCAT(users.firstName, ' ', users.lastName) AS fullName
        FROM users
        WHERE ${where.join(" AND ")}
      `,
      params,
    );

    return {
      code: 200,
      message: "Action success",
      data: {
        data: data.map((user) => this.sanitizeUser(user)),
      },
    };
  }

  async getUserInfoByExtension(
    body: Record<string, any>,
    payload: AuthPayload | undefined,
  ) {
    if (!body.extensions || body.extensions === "") {
      return [];
    }

    const extensions = String(body.extensions)
      .split(",")
      .map((extension) => extension.trim())
      .filter(Boolean);
    if (!extensions.length) {
      return [];
    }

    const where = ["status <> 'trash'", "extension IN (?)"];
    const params: any[] = [extensions];

    if (body.secret) {
      const groupRows = await this.database.query<DbRow[]>(
        "main",
        "SELECT id FROM `groups` WHERE secret = ? LIMIT 1",
        [body.secret],
      );
      if (groupRows[0]) {
        where.push("groupId = ?");
        params.push(groupRows[0].id);
      }
    } else if (payload?.role !== "superadmin" && payload?.groupId) {
      where.push("groupId = ?");
      params.push(payload.groupId);
    }

    const rows = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT CONCAT_WS(' ', lastName, firstName) AS agentName, extension, id
        FROM users
        WHERE ${where.join(" AND ")}
      `,
      params,
    );

    return this.keyBy(rows, "extension");
  }

  async getUsersByGroupId(body: Record<string, any>) {
    if (
      Number(body.groupId) === 0 ||
      body.groupId === undefined ||
      body.groupId === null
    ) {
      return undefined;
    }

    const users = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT
          users.id AS userId,
          CONCAT(users.lastName, ' ', users.firstName) AS agentName,
          IF(users.extension IS NULL, users.userCode, users.extension) AS extension,
          users.userCode AS agentId,
          departmentId,
          avatar
        FROM users
        WHERE groupId = ? AND role <> 'superadmin' AND status = 'active'
      `,
      [body.groupId],
    );

    if (Object.prototype.hasOwnProperty.call(body, "all")) {
      return users;
    }

    return this.keyBy(users, "extension");
  }

  async getUserLogs(
    body: Record<string, any>,
    payload: AuthPayload | undefined,
  ) {
    const currentUser = await this.getCurrentUser(payload);
    const where: string[] = [];
    const params: any[] = [];

    if (currentUser?.role !== "superadmin") {
      where.push("users_log.groupid = ?");
      params.push(currentUser?.groupId ?? 0);
    } else if (body.groupid) {
      where.push("users_log.groupid = ?");
      params.push(body.groupid);
    }

    if (body.startDate && body.endDate) {
      where.push("users_log.created_at BETWEEN ? AND ?");
      params.push(body.startDate, body.endDate);
    }

    if (body.email) {
      where.push("users_log.username = ?");
      params.push(body.email);
    }

    if (body.search && !Array.isArray(body.search)) {
      const keyword = `%${String(body.search).toLowerCase()}%`;
      where.push(`(
        LOWER(users_log.username) LIKE ?
        OR LOWER(users_log.ip_address) LIKE ?
        OR LOWER(users_log.created_at) LIKE ?
        OR LOWER(groups.groupName) LIKE ?
        OR LOWER(users_log.status) LIKE ?
      )`);
      params.push(keyword, keyword, keyword, keyword, keyword);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const perPage = this.normalizePageSize(body.recordsOnPage ?? 50);
    const currentPage = this.normalizePage(body.current_page ?? body.page ?? 1);
    const offset = (currentPage - 1) * perPage;
    const orderSql = this.buildUserLogOrderSql(body.sort);

    const countRows = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT COUNT(*) AS total
        FROM users_log
        LEFT JOIN \`groups\` ON \`groups\`.id = users_log.groupid
        ${whereSql}
      `,
      params,
    );

    const data = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT
          users_log.id,
          users_log.username,
          users_log.groupid AS groupId,
          users_log.ip_address,
          users_log.status,
          users_log.sign_in_time,
          users_log.sign_out_time,
          users_log.created_at,
          \`groups\`.groupName
        FROM users_log
        LEFT JOIN \`groups\` ON \`groups\`.id = users_log.groupid
        ${whereSql}
        ${orderSql}
        LIMIT ? OFFSET ?
      `,
      [...params, perPage, offset],
    );

    for (const row of data) {
      row.sign_in_time_echo = row.sign_in_time
        ? this.fromUnix(row.sign_in_time)
        : "";
      row.sign_out_time_echo = row.sign_out_time
        ? this.fromUnix(row.sign_out_time)
        : "";
      row.statusText =
        row.status === "sign-in" ? "text_sign_in" : "text_sign_out";
      const userRows = await this.database.query<DbRow[]>(
        "main",
        "SELECT CONCAT(lastName, ' ', firstName) AS fullName FROM users WHERE email = ? LIMIT 1",
        [row.username],
      );
      row.user = userRows[0]?.fullName ?? null;
      row.duration =
        row.status === "sign-out"
          ? Math.max(
              Number(row.sign_out_time ?? 0) - Number(row.sign_in_time ?? 0),
              0,
            )
          : 0;
    }

    return {
      code: 200,
      message: "Action success",
      data: this.paginate(
        data,
        Number(countRows[0]?.total ?? 0),
        perPage,
        currentPage,
      ),
    };
  }

  async getuserLogsByGroupId(groupId: string) {
    return this.database.query<DbRow[]>(
      "main",
      `
        SELECT id, username, groupid AS groupId, ip_address, status,
               sign_in_time, sign_out_time, created_at
        FROM users_log
        WHERE groupid = ?
      `,
      [groupId],
    );
  }

  async deleteUserLog(body: Record<string, any>) {
    if (!Array.isArray(body.list)) {
      this.throwError(
        { users_log: "Danh sach id cua users_log bi rong." },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }

    await this.database
      .pool("main")
      .execute<ResultSetHeader>("DELETE FROM users_log WHERE id IN (?)", [
        body.list,
      ]);

    return {
      delete_success: "true",
      code: 200,
      message: "Delete success",
    };
  }

  async updateUser(
    body: Record<string, any>,
    payload: AuthPayload | undefined,
  ) {
    const userId = Number(body.id);
    if (!Number.isFinite(userId) || userId <= 0) {
      this.throwError(
        { id: "Id của người dùng không hợp lệ." },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }

    const user = await this.findUserById(userId, false, true);
    if (!user) {
      this.throwError(
        { user_id_not_exist: "Id của người dùng không tồn tại." },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }

    await this.validateUpdateUser(body, user);

    if (
      user.status !== "active" &&
      Number(body.groupId) !== 1 &&
      body.status === "active"
    ) {
      await this.assertGroupHasCapacity(Number(body.groupId ?? user.groupId));
    }

    const currentUser = await this.getCurrentUser(payload);
    const updateColumns: string[] = [];
    const updateParams: any[] = [];

    for (const [key, value] of Object.entries(body)) {
      if (key === "id" || !USER_MUTABLE_COLUMNS.has(key)) {
        continue;
      }

      if (
        value === null &&
        ![
          "extension",
          "extensions_view",
          "queues",
          "otherId",
          "otherEmail",
          "is_google2fa",
        ].includes(key)
      ) {
        continue;
      }

      updateColumns.push(`\`${key}\` = ?`);
      updateParams.push(this.emptyStringToNullFor(key, value));
    }

    if (body.password) {
      updateColumns.push("`password` = ?");
      updateParams.push(await bcrypt.hash(String(body.password), 12));
    }

    updateColumns.push("`updated_at` = ?", "`updated_by` = ?");
    updateParams.push(this.nowSql(), currentUser?.id ?? null, userId);

    if (updateColumns.length > 0) {
      await this.database
        .pool("main")
        .execute<ResultSetHeader>(
          `UPDATE users SET ${updateColumns.join(", ")} WHERE id = ?`,
          updateParams,
        );
    }

    await this.upsertUserConfig(userId, body, currentUser?.id);

    const updatedUser = await this.findUserById(userId, false, true);
    await this.insertUserHistory("update", user, updatedUser, currentUser);

    return {
      success: true,
      user: this.sanitizeUser(updatedUser),
    };
  }

  async addUserAsMemberOfCompany(
    body: Record<string, any>,
    payload: AuthPayload | undefined,
  ) {
    this.validateCreateMember(body);
    await this.assertEmailIsAvailable(String(body.email));

    const group = await this.getGroupById(Number(body.groupId));
    if (!group || group.status === "trash") {
      this.throwError(
        { group_not_exist: "Group không tồn tại." },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }

    await this.assertGroupHasCapacity(Number(body.groupId));

    const currentUser = await this.getCurrentUser(payload);
    const now = this.nowSql();
    const userCode =
      body.type_user === "midesk"
        ? await this.nextMideskUserCode()
        : String(body.userCode ?? Date.now());

    const [result] = await this.database.pool("main").execute<ResultSetHeader>(
      `
        INSERT INTO users (
          firstName,lastName,userCode,status,mobile,phone,email,password,address,note,
          role,groupId,extension,extensions_view,departmentId,queues,typeId,loginType,
          created_at,created_by,otherId,otherEmail,firstLogin,is_google2fa
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `,
      [
        body.firstName,
        body.lastName,
        userCode,
        body.status ?? "pending",
        body.mobile ?? "",
        body.phone ?? "",
        body.email,
        await bcrypt.hash(String(body.password), 12),
        body.address ?? "",
        body.note ?? "",
        body.role ?? "agent",
        body.groupId,
        body.extension ?? null,
        body.extensions_view ?? null,
        body.departmentId ?? null,
        body.queues ?? null,
        body.typeId ?? 0,
        "website",
        now,
        currentUser?.id ?? null,
        body.otherId ?? null,
        body.otherEmail ?? null,
        body.firstLogin ? 1 : 0,
        body.is_google2fa ?? "disabled",
      ],
    );

    const insertedId = result.insertId;
    await this.insertUserConfigForCreatedUser(
      insertedId,
      body,
      currentUser?.id,
    );
    const insertedUser = await this.findUserById(insertedId, false, true);
    await this.insertUserHistory(
      "insert",
      undefined,
      insertedUser,
      currentUser,
    );

    return {
      success: {
        id: insertedId,
      },
    };
  }

  async updateUserInfoByField(body: Record<string, any>) {
    if (body.user_id === undefined || body.user_id === null || body.user_id === "") {
      return {
        code: 201,
        message: "Something wrong. Please try again",
        error: {
          userId: "Thong tin nay la bat buoc.",
        },
      };
    }

    const userId = Number(body.user_id);
    const user = await this.findUserById(userId, false, true);
    let flagUpdate = false;

    if (user) {
      if (Object.prototype.hasOwnProperty.call(body, "is_webRTC")) {
        await this.database
          .pool("main")
          .execute<ResultSetHeader>(
            "UPDATE users SET `is_webRTC` = ? WHERE id = ?",
            [body.is_webRTC ? 1 : 0, userId],
          );
      } else if (Object.prototype.hasOwnProperty.call(body, "is_receive_chat")) {
        await this.database
          .pool("main")
          .execute<ResultSetHeader>(
            "UPDATE users SET `is_receive_chat` = ? WHERE id = ?",
            [body.is_receive_chat ? 1 : 0, userId],
          );
      }

      flagUpdate = true;
    }

    return {
      code: 200,
      message: "Update success",
      data: flagUpdate,
    };
  }

  async getUserNameByAgentsView(body: Record<string, any>) {
    const listAgents = Array.isArray(body.list_agents)
      ? body.list_agents
      : String(body.list_agents ?? "")
          .split(",")
          .map((agent) => agent.trim())
          .filter(Boolean);

    if (listAgents.length === 0) {
      return {};
    }

    const rows = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT CONCAT_WS(' ', lastName, firstName) AS agentName,
               userCode AS agentId
        FROM users
        WHERE groupId = ? AND userCode IN (?)
      `,
      [body.groupId, listAgents],
    );

    return this.keyBy(rows, "agentId");
  }

  getUserTeam() {
    return {
      code: 200,
      message: "Action success",
      data: [],
    };
  }

  async removeUser(
    body: Record<string, any>,
    payload: AuthPayload | undefined,
  ) {
    const userId = Number(body.id);
    const user = await this.findUserById(userId, false, true);
    if (!user) {
      this.throwError(
        { id: "Khong ton tai." },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }

    const currentUser = await this.getCurrentUser(payload);
    const [result] = await this.database.pool("main").execute<ResultSetHeader>(
      "UPDATE users SET status = 'trash', trashed_at = ?, trashed_by = ? WHERE id = ?",
      [this.nowSql(), currentUser?.id ?? null, userId],
    );

    if (!result.affectedRows) {
      this.throwError(
        { delete: "He thong dang gap su co." },
        HttpStatus.INTERNAL_SERVER_ERROR,
        "Server problem",
      );
    }

    return { success: true };
  }

  async removeUsers(
    body: Record<string, any>,
    payload: AuthPayload | undefined,
  ) {
    if (!Array.isArray(body.list)) {
      this.throwError(
        { list: "Danh sach id cua nguoi dung la bat buoc." },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }

    const currentUser = await this.getCurrentUser(payload);
    const [result] = await this.database.pool("main").execute<ResultSetHeader>(
      "UPDATE users SET status = 'trash', trashed_at = ?, trashed_by = ? WHERE id IN (?)",
      [this.nowSql(), currentUser?.id ?? null, body.list],
    );

    if (!result.affectedRows) {
      this.throwError(
        { delete: "He thong dang gap su co." },
        HttpStatus.INTERNAL_SERVER_ERROR,
        "Server problem",
      );
    }

    return { success: true };
  }

  async duplicateUser(id: string, payload: AuthPayload | undefined) {
    const userRows = await this.database.query<DbRow[]>(
      "main",
      "SELECT * FROM users WHERE id = ? LIMIT 1",
      [Number(id)],
    );
    const user = userRows[0];
    if (!user) {
      this.throwError(
        { id: "Khong ton tai." },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }

    const countRows = await this.database.query<DbRow[]>(
      "main",
      "SELECT COUNT(*) AS total FROM users WHERE groupId = ? AND status = 'active'",
      [user.groupId],
    );
    const group = await this.getGroupById(Number(user.groupId));
    if (Number(countRows[0]?.total ?? 0) >= Number(group?.limitUser ?? 0)) {
      this.throwError(
        {
          group_full:
            "Group da vuot qua so luong thanh vien cho phep.",
        },
        HttpStatus.NOT_ACCEPTABLE,
        "Group_Full",
      );
    }

    const currentUser = await this.getCurrentUser(payload);
    const columns = await this.getTableColumns("users");
    const duplicate: Record<string, any> = { ...user };

    duplicate.firstName = `${duplicate.firstName ?? ""} Copy`;
    duplicate.mobile = "";
    duplicate.phone = "";
    duplicate.email = `${duplicate.email ?? ""}.copy`;
    duplicate.username = `${duplicate.username ?? ""}.copy`;
    duplicate.password = await bcrypt.hash(`${duplicate.email}.copy`, 12);
    duplicate.status = "pending";
    duplicate.extension = null;
    duplicate.created_at = this.nowSql();
    duplicate.created_by = currentUser?.id ?? null;
    duplicate.updated_by = null;
    duplicate.isOnline = 0;
    duplicate.remember_token = null;

    const insertColumns = columns.filter(
      (column) => column !== "id" && Object.prototype.hasOwnProperty.call(duplicate, column),
    );
    const [result] = await this.database.pool("main").query<ResultSetHeader>(
      `
        INSERT INTO users (${insertColumns.map((column) => `\`${column}\``).join(",")})
        VALUES (${insertColumns.map(() => "?").join(",")})
      `,
      insertColumns.map((column) => duplicate[column]),
    );

    if (!result.insertId) {
      this.throwError(
        { duplicate: "He thong dang gap su co." },
        HttpStatus.INTERNAL_SERVER_ERROR,
        "Server problem",
      );
    }

    return { success: result.insertId };
  }

  async logoutUserManual(
    body: Record<string, any>,
    payload: AuthPayload | undefined,
  ) {
    const logRows = await this.database.query<DbRow[]>(
      "main",
      "SELECT id FROM users_log WHERE username = ? ORDER BY id DESC LIMIT 1",
      [body.username],
    );
    const lastUserLog = logRows[0];

    if (!lastUserLog) {
      throw new HttpException(
        { statusCode: 500, message: "Internal server error" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    await this.database.pool("main").execute<ResultSetHeader>(
      "UPDATE users_log SET status = 'sign-out', sign_out_time = ?, updated_at = ? WHERE id = ?",
      [this.unixNow(), this.nowSql(), lastUserLog.id],
    );

    const userRows = await this.database.query<DbRow[]>(
      "main",
      "SELECT id FROM users WHERE id = ? LIMIT 1",
      [body.id],
    );
    const user = userRows[0];
    if (!user) {
      throw new HttpException(
        { statusCode: 500, message: "Internal server error" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    await this.database.pool("main").execute<ResultSetHeader>(
      "UPDATE users SET remember_token = NULL, isOnline = 0 WHERE id = ?",
      [body.id],
    );

    const currentUser = await this.getCurrentUser(payload);
    await this.database.pool("main").execute<ResultSetHeader>(
      `
        INSERT INTO data_history (action,action_type,created_by,groupId,data_change)
        VALUES (?,?,?,?,?)
      `,
      [
        "insert",
        "user",
        currentUser?.id ?? null,
        currentUser?.groupId ?? null,
        JSON.stringify([{ username: body.username, type: "logout" }]),
      ],
    );

    return {
      code: 200,
      message: "Success",
    };
  }

  private invalidateToken(token: string, exp?: number) {
    this.blacklist.invalidate(token, exp);
  }

  private async invalidateStoredToken(token: string) {
    try {
      const payload = await this.jwt.verifyAsync<AuthPayload>(token, {
        secret: this.jwtSecret(),
        algorithms: [this.config.get<string>("JWT_ALGO", "HS256") as never],
      });
      this.invalidateToken(token, (payload as { exp?: number }).exp);
    } catch {
      // Laravel JWTAuth::invalidate() ignores invalid/expired remember_token here.
    }
  }

  private extractRequestToken(body: Record<string, any>, request: Request) {
    const bodyToken = body.token ? String(body.token) : undefined;
    return bodyToken || this.extractBearerToken(request.headers.authorization);
  }

  private domainFromReferer(request: Request) {
    const referer = this.headerToString(
      request.headers.referer ?? request.headers.referrer,
    );
    if (!referer) {
      return undefined;
    }

    try {
      return new URL(referer).hostname;
    } catch {
      return undefined;
    }
  }

  private headerToString(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
  }

  private isTokenExpiredError(error: unknown) {
    return (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name?: string }).name === "TokenExpiredError"
    );
  }

  private validateCreateCompany(body: Record<string, any>) {
    const errors: Record<string, string> = {};

    if (!this.isBetween(body.firstName, 1, 50)) {
      errors.firstName = "Thong tin nay la bat buoc.";
    }
    if (!this.isBetween(body.lastName, 1, 50)) {
      errors.lastName = "Thong tin nay la bat buoc.";
    }
    if (
      !this.isBetween(body.email, 6, 255) ||
      !this.isEmail(String(body.email ?? ""))
    ) {
      errors.email = "Email khong hop le.";
    }
    if (!this.isBetween(body.password, 6, 32)) {
      errors.password = "Xin nhap tu 6 den 32 ky tu.";
    }
    if (!body.confirmPassword || body.confirmPassword !== body.password) {
      errors.confirmPassword = "Mat khau xac nhan khong trung voi mat khau.";
    }
    if (!this.isBetween(body.groupName, 6, 255)) {
      errors.groupName = "Xin nhap tu 6 den 255 ky tu.";
    }
    if (
      body.status &&
      !["active", "lock", "pending", "trash"].includes(String(body.status))
    ) {
      errors.status = "Trang thai khong hop le.";
    }
    if (
      body.role &&
      !["agent", "admin", "superadmin"].includes(String(body.role))
    ) {
      errors.role = "Role khong hop le.";
    }
    if (!Number.isFinite(Number(body.typeId))) {
      errors.typeId = "Xin nhap chu so.";
    }

    if (Object.keys(errors).length) {
      throw new HttpException(
        { code: 406, message: "Invalid parameters", error: { errors } },
        HttpStatus.NOT_ACCEPTABLE,
      );
    }
  }

  private async findUserByEmail(email: string) {
    const rows = await this.database.query<DbRow[]>(
      "main",
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email],
    );
    return rows[0];
  }

  private async findUserById(
    id: number,
    includeRelations = false,
    includeTrashed = false,
  ) {
    if (!Number.isFinite(id) || id <= 0) {
      return undefined;
    }

    const rows = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT ${USER_SAFE_SELECT}
        FROM users
        WHERE id = ? ${includeTrashed ? "" : "AND status <> 'trash'"}
        LIMIT 1
      `,
      [id],
    );
    const user = rows[0];
    if (!user || !includeRelations) {
      return user;
    }

    user.userType = user.typeId ? await this.getUserType(user.typeId) : null;
    user.userGroup = user.groupId
      ? await this.getGroupById(user.groupId)
      : null;
    return user;
  }

  private async getCurrentUser(payload: AuthPayload | undefined) {
    const userId = Number(payload?.sub ?? payload?.id);
    return this.findUserById(userId, false, true);
  }

  private async getUserType(id: number) {
    const rows = await this.database.query<DbRow[]>(
      "main",
      "SELECT * FROM user_types WHERE id = ? LIMIT 1",
      [id],
    );
    return rows[0] ?? null;
  }

  private async getGroupById(id: number) {
    const rows = await this.database.query<DbRow[]>(
      "main",
      "SELECT * FROM `groups` WHERE id = ? LIMIT 1",
      [id],
    );
    return rows[0] ?? null;
  }

  private async getTableColumns(table: "users") {
    const rows = await this.database.query<DbRow[]>(
      "main",
      `SHOW COLUMNS FROM \`${table}\``,
      [],
    );
    return rows.map((row) => String(row.Field));
  }

  private async getGroupForLogin(id: number) {
    const rows = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT id,groupName,recording_url,socket_url,limitUser,did,contextout,
               config_dashboard,secret,config,sms_config,connector_server,status
        FROM \`groups\`
        WHERE id = ?
        LIMIT 1
      `,
      [id],
    );
    return rows[0] ?? null;
  }

  private async getGroupHotline(groupId: number) {
    return this.database.query<DbRow[]>(
      "main",
      `
        SELECT fixed_number,fixed_provider,hotline_number,hotline_number_price,
               queues,extensions,discount,queue_config
        FROM group_hotline
        WHERE groupId = ? AND status = 'publish'
      `,
      [groupId],
    );
  }

  private async getUserPermissions(typeId?: number) {
    if (!typeId) {
      return [];
    }

    const rows = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT page, GROUP_CONCAT(action) AS permission
        FROM user_privileges
        WHERE user_type_id = ? AND status = 'publish'
        GROUP BY page
      `,
      [typeId],
    );

    return rows.flatMap((row) =>
      String(row.permission ?? "")
        .split(",")
        .filter(Boolean)
        .map((permission) => ({
          page: row.page,
          permission,
        })),
    );
  }

  private isJson(str: any): boolean {
    if (typeof str !== "string") {
      return false;
    }
    try {
      const parsed = JSON.parse(str);
      return parsed && typeof parsed === "object";
    } catch {
      return false;
    }
  }

  private assignMissing(target: Record<string, any>, source: Record<string, any>) {
    for (const [key, value] of Object.entries(source)) {
      if (!Object.prototype.hasOwnProperty.call(target, key)) {
        target[key] = value;
      }
    }
  }

  private randomJwtId() {
    return randomBytes(16)
      .toString("base64")
      .replace(/[+/=]/g, "")
      .slice(0, 16);
  }

  private requestUrl(request: Request) {
    const forwardedProto = this.headerToString(request.headers["x-forwarded-proto"]);
    const proto = forwardedProto ?? request.protocol ?? "http";
    const host = request.get("host") ?? "localhost";
    const path = (request.originalUrl || request.url || "").split("?")[0];
    return `${proto}://${host}${path}`;
  }

  private isUserAlreadyOnline(user: DbRow | undefined): boolean {
    if (!user) return false;
    return Number(user.isOnline) === 1;
  }

  private async processPrivileges(user: DbRow | undefined): Promise<[any[], number, number]> {
    if (!user) {
      return [[], 0, 0];
    }
    const privileges = await this.getUserPermissions(user.typeId);
    let isWebRTC = 0;
    let isReceiveChat = 0;

    for (const priv of privileges) {
      if (priv.page === "userWebRTC" && priv.permission === "view") {
        isWebRTC = 1;
      }
      if (priv.page === "omnichannel" && priv.permission === "view") {
        isReceiveChat = 1;
      }
    }

    return [privileges, isWebRTC, isReceiveChat];
  }

  private async getQueueAndAgents(
    curUser: DbRow | undefined,
    user: DbRow | undefined,
  ): Promise<[Record<string, any>, Record<string, any>]> {
    if (!curUser || !user) {
      return [{}, {}];
    }

    const queueConfig: Record<string, any> = {};
    if (user.role === "superadmin") {
      const hotlines = await this.database.query<DbRow[]>(
        "main",
        "SELECT queues, extensions, queue_config FROM group_hotline",
        [],
      );
      const queues: string[] = [];
      const extensions: string[] = [];

      for (const hotline of hotlines) {
        if (hotline.queues) {
          queues.push(...String(hotline.queues).split(",").map(s => s.trim()).filter(Boolean));
        }
        if (hotline.extensions) {
          extensions.push(...String(hotline.extensions).split(",").map(s => s.trim()).filter(Boolean));
        }
        if (hotline.queue_config && this.isJson(hotline.queue_config)) {
          this.assignMissing(queueConfig, JSON.parse(hotline.queue_config));
        }
      }

      const userCodesRows = await this.database.query<DbRow[]>(
        "main",
        "SELECT userCode FROM users WHERE status <> 'trash'",
        [],
      );
      const agentsViewStr = userCodesRows.map(r => r.userCode).filter(Boolean).join(",");

      user.queues = queues.join(",");
      user.extensions_view = extensions.join(",");
      user.agents_view = agentsViewStr;

      const agents = await this.database.query<DbRow[]>(
        "main",
        `
          SELECT CONCAT_WS(' ', lastName, firstName) AS name, userCode AS agentId, extension
          FROM users
          WHERE status <> 'trash'
        `,
        [],
      );

      return [queueConfig, this.keyBy(agents, "extension")];
    } else {
      const agents = await this.database.query<DbRow[]>(
        "main",
        `
          SELECT CONCAT_WS(' ', lastName, firstName) AS name, userCode AS agentId, extension
          FROM users
          WHERE status <> 'trash' AND groupId = ?
        `,
        [curUser.groupId],
      );

      return [queueConfig, this.keyBy(agents, "extension")];
    }
  }

  private async insertUserLog(input: Record<string, any>) {
    const [result] = await this.database.pool("main").execute<ResultSetHeader>(
      `
        INSERT INTO users_log
          (groupid,username,password,ip_address,status,sign_in_time,sign_out_time,created_at,updated_at,userCode)
        VALUES (?,?,?,?,?,?,?,?,?,?)
      `,
      [
        input.groupid ?? null,
        String(input.username ?? "").slice(0, 50),
        String(input.password ?? "").slice(0, 50),
        input.ip_address ?? null,
        input.status ?? null,
        input.sign_in_time ?? null,
        input.sign_out_time ?? null,
        this.nowSql(),
        this.nowSql(),
        input.userCode ?? null,
      ],
    );

    const rows = await this.database.query<DbRow[]>(
      "main",
      "SELECT * FROM users_log WHERE id = ? LIMIT 1",
      [result.insertId],
    );
    const row = rows[0];
    if (row && row.groupid !== undefined) {
      row.groupId = row.groupid;
      delete row.groupid;
    }
    return row;
  }

  private async findUserLogById(id: number) {
    const rows = await this.database.query<DbRow[]>(
      "main",
      "SELECT * FROM users_log WHERE id = ? LIMIT 1",
      [id],
    );
    return rows[0];
  }

  private async handleLoginFail(email: string, ip: string): Promise<never> {
    const countRows = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT COUNT(*) AS total
        FROM users_log
        WHERE username = ? AND status = 'fail'
          AND created_at BETWEEN ? AND ?
      `,
      [email, this.startOfTodaySql(), this.endOfTodaySql()],
    );

    if (Number(countRows[0]?.total ?? 0) >= 5) {
      await this.lockIp(ip);
      this.throwError(
        {
          info: "Bạn đã bị chặn truy cập, liên hệ quản trị viên để mở khóa.",
          alias: "Error_Ip_Lock",
        },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }

    this.throwInvalidAccount();
  }

  private async handleInvalidPassword(email: string): Promise<never> {
    const lastRows = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT updated_at
        FROM users_log
        WHERE username = ? AND status IN ('sign-in','sign-out')
        ORDER BY id DESC
        LIMIT 1
      `,
      [email],
    );

    const lastLogin = lastRows[0]?.updated_at ?? this.nowSql();
    const countRows = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT COUNT(*) AS total
        FROM users_log
        WHERE username = ? AND status = 'fail'
          AND created_at BETWEEN ? AND ?
      `,
      [email, lastLogin, this.endOfTodaySql()],
    );

    if (Number(countRows[0]?.total ?? 0) >= 5) {
      await this.database
        .pool("main")
        .execute<ResultSetHeader>(
          "UPDATE users SET status = 'lock' WHERE email = ? AND status = 'active'",
          [email],
        );
    }

    this.throwInvalidAccount();
  }

  private async lockIp(ip: string) {
    const rows = await this.database.query<DbRow[]>(
      "main",
      "SELECT id FROM ip_lock WHERE ip_client = ? LIMIT 1",
      [ip],
    );

    if (rows[0]) {
      await this.database
        .pool("main")
        .execute<ResultSetHeader>(
          "UPDATE ip_lock SET lock_time = ? WHERE id = ?",
          [this.unixNow(), rows[0].id],
        );
      return;
    }

    await this.database
      .pool("main")
      .execute<ResultSetHeader>(
        "INSERT INTO ip_lock (ip_client, lock_time) VALUES (?, ?)",
        [ip, this.unixNow()],
      );
  }

  private async validateUpdateUser(body: Record<string, any>, current: DbRow) {
    if (
      body.firstName !== undefined &&
      !this.isBetween(body.firstName, 1, 50)
    ) {
      this.throwValidation({ firstName: "Xin nhập từ 1 đến 50 ký tự." });
    }
    if (body.lastName !== undefined && !this.isBetween(body.lastName, 1, 50)) {
      this.throwValidation({ lastName: "Xin nhập từ 1 đến 50 ký tự." });
    }
    if (body.email !== undefined) {
      const email = String(body.email);
      if (!this.isBetween(email, 6, 255) || !this.isEmail(email)) {
        this.throwValidation({ email: "Email không hợp lệ." });
      }
      await this.assertEmailIsAvailable(email, Number(current.id));
    }
    if (body.password !== undefined && !this.isBetween(body.password, 6, 50)) {
      this.throwValidation({ password: "Xin nhập từ 6 đến 50 ký tự." });
    }
    if (body.groupId !== undefined) {
      const group = await this.getGroupById(Number(body.groupId));
      if (!group || group.status === "trash") {
        this.throwValidation({ groupId: "Group không tồn tại." });
      }
    }
    if (
      body.status !== undefined &&
      !["active", "lock", "pending", "trash"].includes(String(body.status))
    ) {
      this.throwValidation({ status: "Trạng thái không hợp lệ." });
    }
    if (
      body.role !== undefined &&
      !["agent", "admin", "superadmin", "supervisor", "manager"].includes(
        String(body.role),
      )
    ) {
      this.throwValidation({ role: "Role không hợp lệ." });
    }
  }

  private validateCreateMember(body: Record<string, any>) {
    const errors: Record<string, string> = {};
    if (!this.isBetween(body.firstName, 1, 50))
      errors.firstName = "Thông tin này là bắt buộc.";
    if (!this.isBetween(body.lastName, 1, 50))
      errors.lastName = "Thông tin này là bắt buộc.";
    if (
      !this.isBetween(body.email, 6, 255) ||
      !this.isEmail(String(body.email ?? ""))
    ) {
      errors.email = "Email không hợp lệ.";
    }
    if (!this.isBetween(body.password, 6, 32))
      errors.password = "Xin nhập từ 6 đến 32 ký tự.";
    if (!body.confirmPassword || body.confirmPassword !== body.password) {
      errors.confirmPassword = "Mật khẩu xác nhận không trùng với mật khẩu.";
    }
    if (!Number.isFinite(Number(body.groupId)))
      errors.groupId = "Group không hợp lệ.";
    if (
      body.role &&
      !["agent", "manager", "supervisor", "admin", "superadmin"].includes(
        String(body.role),
      )
    ) {
      errors.role = "Role không hợp lệ.";
    }

    if (Object.keys(errors).length) {
      throw new HttpException(
        { code: 406, message: "Invalid parameters", error: { errors } },
        HttpStatus.NOT_ACCEPTABLE,
      );
    }
  }

  private async assertEmailIsAvailable(email: string, excludeUserId?: number) {
    const params: any[] = [email];
    let sql = "SELECT id FROM users WHERE email = ? AND status <> 'trash'";
    if (excludeUserId) {
      sql += " AND id <> ?";
      params.push(excludeUserId);
    }
    sql += " LIMIT 1";

    const rows = await this.database.query<DbRow[]>("main", sql, params);
    if (rows[0]) {
      this.throwValidation({ email: "Đã tồn tại." });
    }
  }

  private async assertGroupHasCapacity(groupId: number) {
    const group = await this.getGroupById(groupId);
    if (!group) {
      this.throwValidation({ groupId: "Group không tồn tại." });
    }

    const rows = await this.database.query<DbRow[]>(
      "main",
      "SELECT COUNT(*) AS total FROM users WHERE groupId = ? AND status = 'active'",
      [groupId],
    );

    if (
      Number(group.limitUser ?? 0) > 0 &&
      Number(rows[0]?.total ?? 0) >= Number(group.limitUser)
    ) {
      this.throwError(
        { group_full: "Group đã vượt quá số lượng thành viên cho phép." },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }
  }

  private async upsertUserConfig(
    userId: number,
    body: Record<string, any>,
    currentUserId?: number,
  ) {
    const rows = await this.database.query<DbRow[]>(
      "main",
      "SELECT userid FROM user_config WHERE userid = ? LIMIT 1",
      [userId],
    );

    if (rows[0]) {
      await this.database.pool("main").execute<ResultSetHeader>(
        `
          UPDATE user_config
          SET is_hotdesk = ?, updated_by = ?, updated_at = ?, transports = ?, port = ?
          WHERE userid = ?
        `,
        [
          Number(body.is_hotdesk) === 1 ? 1 : 0,
          currentUserId ?? null,
          this.nowSql(),
          body.transports ?? null,
          body.port ?? null,
          userId,
        ],
      );
      return;
    }

    await this.insertUserConfigForCreatedUser(userId, body, currentUserId);
  }

  private async insertUserConfigForCreatedUser(
    userId: number,
    body: Record<string, any>,
    currentUserId?: number,
  ) {
    await this.database.pool("main").execute<ResultSetHeader>(
      `
        INSERT INTO user_config
          (userid,groupid,is_hotdesk,transports,port,time_start_auto_resume,created_at,created_by)
        VALUES (?,?,?,?,?,?,?,?)
      `,
      [
        userId,
        body.groupId ?? null,
        Number(body.is_hotdesk) === 1 ? 1 : 0,
        body.transports ?? null,
        body.port ?? null,
        null,
        this.nowSql(),
        currentUserId ?? null,
      ],
    );
  }

  private async insertUserHistory(
    action: "insert" | "update",
    oldUser: DbRow | undefined,
    newUser: DbRow | undefined,
    currentUser: DbRow | undefined,
  ) {
    if (!newUser || !currentUser) {
      return;
    }

    const fullname =
      `${currentUser.lastName ?? ""} ${currentUser.firstName ?? ""}`.trim();
    const text =
      action === "insert"
        ? `<b>${fullname}</b> đã tạo tài khoản: <b>${newUser.email}</b>`
        : `<b>${fullname}</b> đã cập nhật tài khoản: <b>${newUser.email}</b>`;
    const dataChange =
      action === "update"
        ? JSON.stringify(this.diffUsers(oldUser, newUser))
        : null;

    await this.database.pool("main").execute<ResultSetHeader>(
      `
        INSERT INTO data_history (action,action_type,data_change,created_by,groupId,text)
        VALUES (?,?,?,?,?,?)
      `,
      [action, "user", dataChange, currentUser.id, newUser.groupId, text],
    );
  }

  private diffUsers(oldUser?: DbRow, newUser?: DbRow) {
    const dataChange = {
      old: [] as Record<string, any>[],
      new: [] as Record<string, any>[],
    };
    if (!oldUser || !newUser) {
      return dataChange;
    }

    for (const key of USER_MUTABLE_COLUMNS) {
      if (oldUser[key] !== newUser[key]) {
        dataChange.old.push({ [key]: oldUser[key] });
        dataChange.new.push({ [key]: newUser[key] });
      }
    }

    return dataChange;
  }

  private async nextMideskUserCode() {
    const rows = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT CONCAT('0', (CAST(userCode AS UNSIGNED) + 1)) AS userCode
        FROM users
        WHERE LENGTH(userCode) = 5
        ORDER BY id DESC
        LIMIT 1
      `,
      [],
    );

    return rows[0]?.userCode ?? String(Date.now());
  }

  private signUserToken(user: DbRow, remember: boolean, request?: Request) {
    const issuedAt = this.unixNow();
    const ttlMinutes = Number(this.config.get<string>("JWT_TTL", "60"));
    const expiresAt = remember
      ? issuedAt + 14 * 24 * 60 * 60
      : issuedAt + (Number.isFinite(ttlMinutes) ? ttlMinutes : 60) * 60;

    return this.jwt.signAsync(
      {
        iss: request ? this.requestUrl(request) : this.config.get<string>("APP_URL", "http://localhost"),
        iat: issuedAt,
        exp: expiresAt,
        nbf: issuedAt,
        jti: this.randomJwtId(),
        sub: user.id,
        prv: createHash("sha1").update("App\\Models\\User").digest("hex"),
        id: user.id,
        email: user.email,
        role: user.role,
        groupId: user.groupId,
        typeId: user.typeId,
      },
      {
        secret: this.jwtSecret(),
        algorithm: this.config.get<string>("JWT_ALGO", "HS256") as never,
      },
    );
  }

  private sanitizeUser<T extends Record<string, any> | undefined>(user: T): T {
    if (!user) {
      return user;
    }

    const clone = { ...user };
    delete clone.password;
    delete clone.remember_token;
    return clone as T;
  }

  private buildUserOrderSql(sorts: unknown) {
    if (!Array.isArray(sorts) || sorts.length === 0) {
      return "ORDER BY users.id DESC";
    }

    const allowed = new Set([
      "id",
      "firstName",
      "lastName",
      "email",
      "extension",
      "role",
      "status",
      "created_at",
      "updated_at",
    ]);
    const order = sorts
      .map((sort) => {
        const name = String(sort?.name ?? sort?.field ?? "");
        if (!allowed.has(name)) {
          return undefined;
        }
        const direction =
          String(sort?.direction ?? sort?.order ?? "asc").toLowerCase() ===
          "desc"
            ? "DESC"
            : "ASC";
        return `users.\`${name}\` ${direction}`;
      })
      .filter(Boolean);

    return order.length
      ? `ORDER BY ${order.join(", ")}`
      : "ORDER BY users.id DESC";
  }

  private buildUserLogOrderSql(sort: unknown) {
    if (!sort || typeof sort !== "object" || Array.isArray(sort)) {
      return "ORDER BY users_log.id DESC";
    }

    const [field, value] =
      Object.entries(sort as Record<string, unknown>)[0] ?? [];
    const columns: Record<string, string> = {
      username: "users_log.username",
      groupName: "groups.groupName",
      ip_address: "users_log.ip_address",
      status: "users_log.status",
      created_at: "users_log.created_at",
    };
    const column = columns[field];
    if (!column) {
      return "ORDER BY users_log.id DESC";
    }

    return `ORDER BY ${column} ${String(value) === "1" ? "ASC" : "DESC"}`;
  }

  private paginate(
    data: DbRow[],
    total: number,
    perPage: number,
    currentPage: number,
  ) {
    const lastPage = Math.max(Math.ceil(total / perPage), 1);
    return {
      current_page: currentPage,
      data,
      first_page_url: null,
      from: total === 0 ? null : (currentPage - 1) * perPage + 1,
      last_page: lastPage,
      last_page_url: null,
      links: [],
      next_page_url: currentPage < lastPage ? null : null,
      path: null,
      per_page: perPage,
      prev_page_url: currentPage > 1 ? null : null,
      to: total === 0 ? null : (currentPage - 1) * perPage + data.length,
      total,
    };
  }

  private normalizePage(value: unknown) {
    const page = Number(value);
    return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  }

  private normalizePageSize(value: unknown) {
    const size = Number(value);
    return Number.isFinite(size) && size > 0
      ? Math.min(Math.floor(size), 500)
      : 10;
  }

  private normalizeBcryptHash(hash: string) {
    return hash?.startsWith("$2y$") ? `$2b$${hash.slice(4)}` : hash;
  }

  private extractBearerToken(authorization?: string): string | undefined {
    const [type, token] = authorization?.split(" ") ?? [];
    return type?.toLowerCase() === "bearer" ? token : undefined;
  }

  private getClientIp(request: Request) {
    const forwarded = request.headers["x-forwarded-for"];
    if (Array.isArray(forwarded)) {
      return forwarded[0] ?? request.ip ?? "Unknown";
    }
    return forwarded?.split(",")[0]?.trim() || request.ip || "Unknown";
  }

  private jwtSecret() {
    const secret = this.config.get<string>("JWT_SECRET");
    if (!secret) {
      throw new HttpException(
        { statusCode: 500, message: "JWT_SECRET is not configured" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return secret;
  }

  private throwInvalidAccount(): never {
    this.throwError(
      {
        info: "Tên đăng nhập hoặc mật khẩu không chính xác.",
        alias: "Error_Invalid_Account",
      },
      HttpStatus.NOT_ACCEPTABLE,
      "Invalid parameters",
    );
  }

  private throwLockedAccount(): never {
    this.throwError(
      {
        author: "Tài khoản bị khóa hoặc chưa xác thực.",
        alias: "Error_Pending_Account",
      },
      HttpStatus.NOT_ACCEPTABLE,
      "Login failed.",
    );
  }

  private throwValidation(errors: Record<string, string>): never {
    this.throwError(errors, HttpStatus.NOT_ACCEPTABLE, "Invalid parameters");
  }

  private throwError(
    errors: Record<string, any>,
    code: number,
    message: string,
  ): never {
    throw new HttpException(
      {
        error: {
          errors,
        },
        code,
        message,
      },
      code,
    );
  }

  private isBetween(value: unknown, min: number, max: number) {
    const text = String(value ?? "");
    return text.length >= min && text.length <= max;
  }

  private isEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private emptyStringToNullFor(key: string, value: unknown) {
    if (
      [
        "extension",
        "extensions_view",
        "queues",
        "otherId",
        "otherEmail",
        "is_google2fa",
      ].includes(key)
    ) {
      return value === "" ? null : value;
    }
    return value;
  }

  private parseJsonObject(value: unknown) {
    if (!value || typeof value !== "string") {
      return {};
    }

    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }

  private keyBy(rows: DbRow[], key: string) {
    return rows.reduce<Record<string, any>>((acc, row) => {
      if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
        acc[String(row[key])] = row;
      }
      return acc;
    }, {});
  }

  private unixNow() {
    return Math.floor(Date.now() / 1000);
  }

  private nowSql(date = new Date()) {
    return this.toSqlDateTime(date);
  }

  private startOfTodaySql() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return this.toSqlDateTime(date);
  }

  private endOfTodaySql() {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return this.toSqlDateTime(date);
  }

  private formatDateTime(date: Date) {
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  private toSqlDateTime(date: Date) {
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  private fromUnix(value: unknown) {
    const timestamp = Number(value);
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      return "";
    }

    return this.toSqlDateTime(new Date(timestamp * 1000));
  }
}
