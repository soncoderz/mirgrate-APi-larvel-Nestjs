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
 * - logout()             → Đăng xuất: cập nhật isOnline, ghi log
 *
 * ═══════════════════════════════════════════════════════════════════
 * NHÓM 2: CRUD NGƯỜI DÙNG
 * ═══════════════════════════════════════════════════════════════════
 * - me()                 → Lấy thông tin user đang đăng nhập + group + privileges
 * - getUsers()           → Danh sách users phân trang + search + sort + filter
 * - getUserByID()        → Chi tiết 1 user + group + privileges
 * - updateUser()         → Cập nhật thông tin user (update + SIP account)
 * - addUserAsMemberOfCompany() → Thêm user vào company
 *
 * Tương đương: UsersController.php + UserModel.php trong Laravel
 */

import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { extname, join } from "path";
import { Request } from "express";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, EntityManager, Not, Brackets, SelectQueryBuilder, Between, In } from "typeorm";
import { JwtBlacklistService } from "../../common/services/jwt-blacklist.service";
import { UserEntity } from "./entities/user.entity";
import { GroupEntity } from "./entities/group.entity";
import { UserLogEntity } from "./entities/user-log.entity";
import {
  updateUserSchema,
  addUserAsMemberOfCompanySchema
} from "./schemas/users.schemas";

/** Type alias cho database row kết quả query */
type DbRow = Record<string, any>;

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

const USER_TABLE_COLUMNS = new Set([
  "id",
  "userCode",
  "firstName",
  "lastName",
  "mobile",
  "phone",
  "avatar",
  "email",
  "password",
  "typeId",
  "groupId",
  "lastLogin",
  "loginType",
  "status",
  "address",
  "extension",
  "extensions_view",
  "agents_view",
  "queues",
  "queues_config",
  "note",
  "role",
  "isOnline",
  "remember_token",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
  "trashed_at",
  "trashed_by",
  "departmentId",
  "queueDynamic",
  "config",
  "time_auto_resume",
  "groups_view",
  "firstLogin",
  "is_verify",
  "is_salesforce",
  "lock_time",
  "otherId",
  "otherEmail",
  "google2fa_secret",
  "is_google2fa",
]);

const USER_FILTER_TYPES = new Set([
  "like",
  "like_left",
  "like_right",
  "not_like",
  "not_like_left",
  "not_like_right",
  "more",
  "less",
  "other",
  "more_equal",
  "more_less",
]);

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(GroupEntity)
    private readonly groupRepository: Repository<GroupEntity>,
    @InjectRepository(UserLogEntity)
    private readonly userLogRepository: Repository<UserLogEntity>,
    private readonly entityManager: EntityManager,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly blacklist: JwtBlacklistService,
  ) {}

  async login(body: Record<string, any>, request: Request) {
    const email = String(body.email ?? "").trim();
    const password = String(body.password ?? "");
    const clientIp = this.getClientIp(request);

    if (!email || !password) {
      await this.insertUserLog({
        username: email,
        password,
        ip_address: clientIp,
        status: "fail",
        sign_in_time: this.unixNow(),
      });
      await this.handleLoginFail(email, clientIp);
      throw new HttpException({ error: "Invalid credentials" }, HttpStatus.UNAUTHORIZED);
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
      throw new HttpException({ error: "Invalid credentials" }, HttpStatus.UNAUTHORIZED);
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
      throw new HttpException({ error: "Invalid credentials" }, HttpStatus.UNAUTHORIZED);
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

    const group = curUser.groupId ? await this.getGroupForLogin(curUser.groupId) : null;
    if (!group || group.status === "lock") {
      this.throwLockedAccount();
    }

    const userLog = await this.insertUserLog({
      username: email,
      password,
      ip_address: clientIp,
      groupid: curUser.groupId,
      status: "sign-in",
      sign_in_time: this.unixNow(),
    });

    await this.userRepository.update(curUser.id, {
      lastLogin: this.nowSql(),
      isOnline: 1,
    });

    const responseUser = this.sanitizeUser({ ...user });
    const [privileges] = await this.processPrivileges(curUser);
    const [queueConfig, agentsView] = await this.getQueueAndAgents(
      curUser,
      responseUser,
    );
    const groupHotline = curUser.groupId ? await this.getGroupHotline(curUser.groupId) : [];

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
    let log: UserLogEntity | null = null;
    if (Number.isFinite(logId) && logId > 0) {
      log = await this.findUserLogById(logId);
    }

    const userId = Number(payload.sub ?? payload.id);
    const user =
      Number.isFinite(userId) && userId > 0
        ? await this.userRepository.findOne({
            select: { id: true, remember_token: true },
            where: { id: userId },
          })
        : null;

    if (log) {
      if (user) {
        if (user.remember_token) {
          await this.invalidateStoredToken(String(user.remember_token));
        }

        await this.userRepository.update(user.id, {
          remember_token: null,
        });
      }

      if (log.status === "sign-in") {
        await this.userLogRepository.update(logId, {
          status: "sign-out",
          sign_out_time: this.unixNow(),
          updated_at: this.nowSql(),
        });
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

  async getUsers(
    body: Record<string, any>,
    payload: AuthPayload | undefined,
    request?: Request,
  ) {
    const currentUser = await this.getCurrentUser(payload);
    if (!currentUser) {
      throw new HttpException(
        { success: false, message: "Unauthorized" },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const qb = this.userRepository.createQueryBuilder("users")
      .leftJoin("departments", "departments", "departments.id = users.departmentId")
      .leftJoin("user_types", "user_types", "user_types.id = users.typeId")
      .leftJoin("groups", "groups", "groups.id = users.groupId")
      .leftJoin("qr_code", "qr_code", "qr_code.userId = users.id")
      .leftJoin("user_config", "user_config", "user_config.userid = users.id");

    qb.where("users.status <> :statusTrash", { statusTrash: "trash" });

    if (currentUser?.role !== "superadmin") {
      if (!this.isPhpEmpty(body.groupId)) {
        qb.andWhere("users.groupId = :groupId", { groupId: body.groupId });
      } else if (Number(currentUser?.groupId) === 1) {
        qb.andWhere("users.id = :currentUserId", { currentUserId: currentUser.id });
      } else if (currentUser?.groupId) {
        qb.andWhere("users.groupId = :currentUserGroupId", { currentUserGroupId: currentUser.groupId });
      }
    } else if (!this.isPhpEmpty(body.groupId)) {
      qb.andWhere("users.groupId = :groupId", { groupId: body.groupId });
    }

    if (!this.isPhpEmpty(body.departmentId)) {
      qb.andWhere("users.departmentId = :departmentId", { departmentId: body.departmentId });
    }

    if (!this.isPhpEmpty(body.typeId)) {
      qb.andWhere("users.typeId = :typeId", { typeId: body.typeId });
    }

    if (!this.isPhpEmpty(body.roleId)) {
      qb.andWhere("users.role = :roleId", { roleId: body.roleId });
    }

    if (!this.isPhpEmpty(body.search) && !Array.isArray(body.search)) {
      const keyword = `%${String(body.search)}%`;
      qb.andWhere(new Brackets(qbSub => {
        qbSub.where("users.firstName LIKE :keyword", { keyword })
          .orWhere("users.lastName LIKE :keyword")
          .orWhere("users.email LIKE :keyword")
          .orWhere("users.extension LIKE :keyword")
          .orWhere("user_types.name LIKE :keyword")
          .orWhere("users.userCode = :searchVal", { searchVal: String(body.search) });
      }));
    }

    this.applyUserFilters(body.filters, qb);

    const total = await qb.getCount();

    const perPage = this.normalizeLaravelRecordsOnPage(body.recordsOnPage);
    const currentPage = this.normalizePage(body.page ?? 1);
    const offset = (currentPage - 1) * perPage;

    qb.select("users.*")
      .addSelect("departments.name", "departmentName")
      .addSelect("user_types.name", "typeName")
      .addSelect("groups.groupName", "groupName")
      .addSelect("qr_code.email", "emailqr")
      .addSelect("(SELECT CONCAT_WS(' ', u2.lastName, u2.firstName) FROM users u2 WHERE u2.id = users.created_by)", "created_name")
      .addSelect("(SELECT CONCAT_WS(' ', u2.lastName, u2.firstName) FROM users u2 WHERE u2.id = users.updated_by)", "updated_name")
      .addSelect("IF(user_config.is_hotdesk = 1, user_config.is_hotdesk, NULL)", "is_hotdesk")
      .addSelect("IF(user_config.transports IS NOT NULL, user_config.transports, NULL)", "transports")
      .addSelect("IF(user_config.port IS NOT NULL, user_config.port, NULL)", "port");

    qb.limit(perPage).offset(offset);

    this.applyUserOrder(qb, body.sorts);

    const data = await qb.getRawMany();

    const sanitizedData = data.map((user) => this.sanitizeUser(user));
    return this.paginateLaravel(sanitizedData, total, perPage, currentPage, request);
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

  async updateUser(
    body: Record<string, any>,
    payload: AuthPayload | undefined,
    avatar?: { originalname?: string; buffer?: Buffer },
  ) {
    const userId = Number(body.id);
    const params = this.filteredUpdateUserParams(body);
    
    // Call Zod validation (throws HttpException 406 on failure)
    await this.validateUpdateUserZod(params, userId);

    const user = await this.findRawUserById(userId, true);
    if (!user) {
      this.throwError(
        { user_id_not_exist: "Id của người dùng không tồn tại." },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }

    const currentUser = await this.getCurrentUser(payload);
    const updates = await this.buildLaravelUpdateUserColumns(
      params,
      body,
      userId,
      avatar,
      currentUser?.id,
    );

    const updateObj: Record<string, any> = {};
    for (const [key, value] of updates.entries()) {
      updateObj[key] = value;
    }
    await this.userRepository.update(userId, updateObj);

    await this.syncJntUserAccessScopes(userId, body);
    await this.upsertUserConfig(userId, body, currentUser?.id);

    const updatedUserRaw = await this.findRawUserById(userId, true);
    await this.insertUpdateUserHistory(params, user, updatedUserRaw, currentUser);
    await this.updateDepartmentExtension(body);

    const updatedUser = await this.findUserById(userId, false, true);

    return {
      success: true,
      user: this.sanitizeUser(updatedUser),
    };
  }

  async addUserAsMemberOfCompany(
    body: Record<string, any>,
    payload: AuthPayload | undefined,
    avatar?: { originalname?: string; buffer?: Buffer },
  ) {
    // Call Zod validation (throws HttpException 406 wrapped in HttpStatus.OK on failure)
    await this.validateAddMemberOfCompanyZod(body);

    const currentUser = await this.getCurrentUser(payload);
    const now = this.nowSql();
    const userCode =
      body.type_user === "midesk"
        ? await this.nextMideskUserCode()
        : String(body.userCode ?? this.unixNow());

    const newUser = this.userRepository.create({
      firstName: body.firstName,
      lastName: body.lastName,
      userCode,
      status: body.status ?? "pending",
      mobile: body.mobile ?? "",
      phone: body.phone ?? "",
      email: body.email,
      password: await bcrypt.hash(String(body.password), 12),
      address: body.address ?? "",
      note: body.note ?? "",
      role: body.role ?? "agent",
      groupId: body.groupId,
      extension: body.extension ?? null,
      extensions_view: body.extensions_view ?? null,
      departmentId: body.departmentId ?? null,
      queues: body.queues ?? null,
      typeId: body.typeId ?? 0,
      loginType: "website",
      created_at: now,
      created_by: currentUser?.id ?? null,
      otherId: body.otherId ?? null,
      otherEmail: body.otherEmail ?? null,
      firstLogin: body.firstLogin ? 1 : 0,
      is_google2fa: body.is_google2fa ?? "disabled",
    });

    const savedUser = await this.userRepository.save(newUser);
    const insertedId = savedUser.id;

    // 1. Đồng bộ JnTUserAccessScopes (list_region, list_branch, list_department)
    await this.syncJntUserAccessScopes(insertedId, body);

    // 2. Insert QRCodeMifone nếu có emailqr
    if (!this.isPhpEmpty(body.emailqr)) {
      if (await this.tableExists("qrcode_mifone")) {
        await this.entityManager.query(
          "INSERT INTO qrcode_mifone (userId, groupId, email) VALUES (?, ?, ?)",
          [insertedId, body.groupId ?? null, String(body.emailqr)],
        );
      }
    }

    // 3. Upload avatar nếu có file
    if (avatar?.buffer) {
      const avatarName = await this.storeUserAvatar(insertedId, avatar);
      await this.userRepository.update(insertedId, { avatar: avatarName });
    }

    const insertedUser = await this.findUserById(insertedId, false, true);
    await this.insertUserHistory(
      "insert",
      undefined,
      insertedUser,
      currentUser,
    );

    // 4. Update departments.extensions nếu có departmentId và extension
    await this.updateDepartmentExtension(body);

    return {
      success: {
        id: insertedId,
      },
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

  private extractBearerToken(authorization?: string): string | undefined {
    const [type, token] = authorization?.split(" ") ?? [];
    return type?.toLowerCase() === "bearer" ? token : undefined;
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

  private requestUrl(request: Request) {
    const forwardedProto = this.headerToString(request.headers["x-forwarded-proto"]);
    const proto = forwardedProto ?? request.protocol ?? "http";
    const host = request.get("host") ?? "localhost";
    const path = (request.originalUrl || request.url || "").split("?")[0];
    return `${proto}://${host}${path}`;
  }

  private async findUserByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } });
  }

  private async findUserById(
    id: number,
    includeRelations = false,
    includeTrashed = false,
  ) {
    if (!Number.isFinite(id) || id <= 0) {
      return undefined;
    }

    const user = await this.userRepository.findOne({
      where: {
        id,
        ...(includeTrashed ? {} : { status: Not("trash") as any }),
      },
    });

    if (!user) {
      return undefined;
    }

    const userObj = { ...user };
    delete (userObj as any).password;
    delete (userObj as any).remember_token;

    if (!includeRelations) {
      return userObj;
    }

    (userObj as any).userType = user.typeId ? await this.getUserType(user.typeId) : null;
    (userObj as any).userGroup = user.groupId
      ? await this.getGroupById(user.groupId)
      : null;
    return userObj;
  }

  private async findRawUserById(id: number, includeTrashed = false) {
    if (!Number.isFinite(id) || id <= 0) {
      return undefined;
    }

    return (await this.userRepository.findOne({
      where: {
        id,
        ...(includeTrashed ? {} : { status: Not("trash") as any }),
      },
    })) ?? undefined;
  }

  private async getCurrentUser(payload: AuthPayload | undefined) {
    const userId = Number(payload?.sub ?? payload?.id);
    return this.findUserById(userId, false, true);
  }

  private async getUserType(id: number) {
    const rows = await this.entityManager.query(
      "SELECT * FROM user_types WHERE id = ? LIMIT 1",
      [id],
    );
    return rows[0] ?? null;
  }

  private async getGroupById(id: number) {
    return (await this.groupRepository.findOne({ where: { id } })) ?? null;
  }

  private async getTableColumns(table: "users") {
    const rows = await this.entityManager.query(
      `SHOW COLUMNS FROM \`${table}\``,
    );
    return rows.map((row) => String(row.Field));
  }

  private async tableExists(table: string) {
    const rows = await this.entityManager.query(
      "SHOW TABLES LIKE ?",
      [table],
    );
    return rows.length > 0;
  }

  private async getGroupForLogin(id: number) {
    return (await this.groupRepository.findOne({ where: { id } })) ?? null;
  }

  private async getGroupHotline(groupId: number) {
    return this.entityManager.query(
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

    const rows = await this.entityManager.query(
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
      const hotlines = await this.entityManager.query(
        "SELECT queues, extensions, queue_config FROM group_hotline",
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

      const userCodesRows = await this.userRepository.find({
        select: { userCode: true },
        where: { status: Not("trash") as any },
      });
      const agentsViewStr = userCodesRows.map(r => r.userCode).filter(Boolean).join(",");

      user.queues = queues.join(",");
      user.extensions_view = extensions.join(",");
      user.agents_view = agentsViewStr;

      const agents = await this.entityManager.query(
        `
          SELECT CONCAT_WS(' ', lastName, firstName) AS name, userCode AS agentId, extension
          FROM users
          WHERE status <> 'trash'
        `,
      );

      return [queueConfig, this.keyBy(agents, "extension")];
    } else {
      const agents = await this.entityManager.query(
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
    const userLog = this.userLogRepository.create({
      groupId: input.groupid ?? null,
      username: String(input.username ?? "").slice(0, 50),
      password: String(input.password ?? "").slice(0, 50),
      ip_address: input.ip_address ?? null,
      status: input.status ?? null,
      sign_in_time: input.sign_in_time ?? null,
      sign_out_time: input.sign_out_time ?? null,
      created_at: this.nowSql(),
      updated_at: this.nowSql(),
      userCode: input.userCode ?? null,
    });

    const savedLog = await this.userLogRepository.save(userLog);
    return savedLog;
  }

  private async findUserLogById(id: number) {
    return this.userLogRepository.findOne({ where: { id } });
  }

  private async handleLoginFail(email: string, ip: string): Promise<never> {
    const total = await this.userLogRepository.count({
      where: {
        username: email,
        status: "fail",
        created_at: Between(this.startOfTodaySql(), this.endOfTodaySql())
      }
    });

    if (total >= 5) {
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
    const lastLog = await this.userLogRepository.findOne({
      where: {
        username: email,
        status: In(["sign-in", "sign-out"])
      },
      order: { id: "DESC" }
    });

    const lastLogin = lastLog?.updated_at ?? this.nowSql();
    const total = await this.userLogRepository.count({
      where: {
        username: email,
        status: "fail",
        created_at: Between(lastLogin, this.endOfTodaySql())
      }
    });

    if (total >= 5) {
      await this.userRepository.update(
        { email, status: "active" },
        { status: "lock" }
      );
    }

    this.throwInvalidAccount();
  }

  private async lockIp(ip: string) {
    const rows = await this.entityManager.query(
      "SELECT id FROM ip_lock WHERE ip_client = ? LIMIT 1",
      [ip],
    );

    if (rows[0]) {
      await this.entityManager.query(
        "UPDATE ip_lock SET lock_time = ? WHERE id = ?",
        [this.unixNow(), rows[0].id],
      );
      return;
    }

    await this.entityManager.query(
      "INSERT INTO ip_lock (ip_client, lock_time) VALUES (?, ?)",
      [ip, this.unixNow()],
    );
  }

  private filteredUpdateUserParams(body: Record<string, any>) {
    const keepNullKeys = new Set([
      "avatar",
      "id",
      "extensions_view",
      "queues",
      "extension",
    ]);
    const params: Record<string, any> = {};

    for (const [key, value] of Object.entries(body)) {
      if (!keepNullKeys.has(key) && this.isLaravelNullLoose(value)) {
        continue;
      }
      params[key] = value;
    }

    return params;
  }

  private async validateUpdateUserZod(body: any, userId: number) {
    const schema = updateUserSchema.superRefine(async (data, ctx) => {
      if (data.email) {
        const emailExists = await this.userRepository.findOne({
          where: { email: data.email, status: Not("trash") as any, id: Not(userId) }
        });
        if (emailExists) {
          ctx.addIssue({
            code: "custom",
            path: ["email"],
            message: "Đã tồn tại",
          });
        }
      }
      if (data.groupId) {
        const group = await this.groupRepository.findOne({
          where: { id: Number(data.groupId), status: Not("trash") as any }
        });
        if (!group) {
          ctx.addIssue({
            code: "custom",
            path: ["groupId"],
            message: "Không tồn tại.",
          });
        } else {
          const currentUser = await this.userRepository.findOne({ where: { id: userId } });
          if (currentUser && currentUser.status !== "active" && data.status === "active") {
            const totalActive = await this.userRepository.count({
              where: { groupId: Number(data.groupId), status: "active" }
            });
            if (totalActive >= Number(group.limitUser ?? 0)) {
              ctx.addIssue({
                code: "custom",
                path: ["group_full"],
                message: "Group đã vượt quá số lương thành viên cho phép.",
              });
            }
          }
        }
      }
    });

    const result = await schema.safeParseAsync(body);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errors[issue.path.join(".")] = issue.message;
      }
      throw new HttpException(
        {
          code: 406,
          message: "Invalid parameters",
          error: { errors },
        },
        HttpStatus.NOT_ACCEPTABLE,
      );
    }
  }

  private async validateAddMemberOfCompanyZod(body: any) {
    const schema = addUserAsMemberOfCompanySchema.superRefine(async (data, ctx) => {
      if (data.email) {
        const emailExists = await this.userRepository.findOne({
          where: { email: data.email, status: Not("trash") as any }
        });
        if (emailExists) {
          ctx.addIssue({
            code: "custom",
            path: ["email"],
            message: "Đã tồn tại",
          });
        }
      }
      if (data.groupId) {
        const group = await this.groupRepository.findOne({
          where: { id: Number(data.groupId), status: Not("trash") as any }
        });
        if (!group) {
          ctx.addIssue({
            code: "custom",
            path: ["groupId"],
            message: "Không tồn tại.",
          });
        } else {
          const totalActive = await this.userRepository.count({
            where: { groupId: Number(data.groupId), status: "active" }
          });
          if (
            Number(group.limitUser ?? 0) > 0 &&
            totalActive >= Number(group.limitUser)
          ) {
            ctx.addIssue({
              code: "custom",
              path: ["group_full"],
              message: "Group đã vượt quá số lượng thành viên cho phép.",
            });
          }
        }
      }
    });

    const result = await schema.safeParseAsync(body);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errors[issue.path.join(".")] = issue.message;
      }
      throw new HttpException(
        {
          code: 406,
          message: "Invalid parameters",
          error: { errors },
        },
        HttpStatus.OK,
      );
    }
  }

  private async buildLaravelUpdateUserColumns(
    params: Record<string, any>,
    body: Record<string, any>,
    userId: number,
    avatar: { originalname?: string; buffer?: Buffer } | undefined,
    currentUserId?: number,
  ) {
    const excludedGeneralKeys = new Set([
      "confirmPassword",
      "avatar",
      "phone",
      "address",
      "mobile",
      "note",
      "emailqr",
      "is_hotdesk",
      "transports",
      "port",
      "list_region",
      "list_department",
      "list_branch",
    ]);
    const updates = new Map<string, any>();

    for (const [key, value] of Object.entries(params)) {
      if (key === "id") {
        continue;
      }
      if (key === "password") {
        updates.set("password", await bcrypt.hash(String(body.password), 12));
        continue;
      }
      if (!excludedGeneralKeys.has(key) && USER_TABLE_COLUMNS.has(key)) {
        updates.set(key, value);
      }
    }

    updates.set(
      "firstName",
      !this.isPhpEmpty(body.firstName) ? body.firstName : null,
    );
    updates.set("phone", !this.isPhpEmpty(body.phone) ? body.phone : "");
    updates.set("mobile", !this.isPhpEmpty(body.mobile) ? body.mobile : "");
    updates.set("address", !this.isPhpEmpty(body.address) ? body.address : "");
    updates.set("note", !this.isPhpEmpty(body.note) ? body.note : "");
    updates.set("otherId", !this.isPhpEmpty(body.otherId) ? body.otherId : null);
    updates.set(
      "otherEmail",
      !this.isPhpEmpty(body.otherEmail) ? body.otherEmail : null,
    );
    updates.set(
      "is_google2fa",
      !this.isPhpEmpty(body.is_google2fa) ? body.is_google2fa : null,
    );

    if (Object.prototype.hasOwnProperty.call(body, "queues")) {
      updates.set("queues", this.isPhpEmpty(body.queues) ? null : body.queues);
    }
    if (Object.prototype.hasOwnProperty.call(body, "extension")) {
      updates.set(
        "extension",
        this.isPhpEmpty(body.extension) ? null : body.extension,
      );
    }
    if (Object.prototype.hasOwnProperty.call(body, "extensions_view")) {
      updates.set(
        "extensions_view",
        this.isPhpEmpty(body.extensions_view) ? null : body.extensions_view,
      );
    }

    if (avatar) {
      updates.set("avatar", await this.storeUserAvatar(userId, avatar));
    }

    updates.set("updated_at", this.nowSql());
    updates.set("updated_by", currentUserId ?? null);

    return updates;
  }

  private async storeUserAvatar(
    userId: number,
    avatar: { originalname?: string; buffer?: Buffer },
  ) {
    const ext = extname(avatar.originalname ?? "").replace(".", "");
    if (!["jpg", "jpeg", "png", "bmp", "gif", "svg", "JPG", "PNG"].includes(ext)) {
      this.throwError(
        { avatar: "Chỉ cho phép hình ảnh jpeg, png, bmp, gif, hoặc svg." },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }

    if (!avatar.buffer) {
      this.throwError(
        { avatar: "Không thể upload hình ảnh." },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }

    const name = `${userId}-${this.unixNow()}.${ext}`;
    const dir = join(process.cwd(), "img", "user_avatar");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, name), avatar.buffer);
    return name;
  }

  private async upsertUserConfig(
    userId: number,
    body: Record<string, any>,
    currentUserId?: number,
  ) {
    const rows = await this.entityManager.query(
      "SELECT userid FROM user_config WHERE userid = ? LIMIT 1",
      [userId],
    );

    if (rows[0]) {
      await this.entityManager.query(
        `
          UPDATE user_config
          SET is_hotdesk = ?, updated_by = ?, transports = ?, port = ?
          WHERE userid = ?
        `,
        [
          Number(body.is_hotdesk) === 1 ? 1 : 0,
          currentUserId ?? null,
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
    await this.entityManager.query(
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

  private async syncJntUserAccessScopes(
    userId: number,
    body: Record<string, any>,
  ) {
    if (!(await this.tableExists("jnt_user_access_scopes"))) {
      return;
    }

    const scopes: Record<string, unknown> = {
      region: body.list_region ? body.list_region : [],
      branch: body.list_branch ? body.list_branch : [],
      department: body.list_department ? body.list_department : [],
    };

    for (const [type, rawIds] of Object.entries(scopes)) {
      await this.entityManager.query(
        "DELETE FROM jnt_user_access_scopes WHERE user_id = ? AND scope_type = ?",
        [userId, type],
      );

      for (const scopeId of this.normalizeScopeIds(rawIds)) {
        await this.entityManager.query(
          "INSERT INTO jnt_user_access_scopes (user_id, scope_type, scope_id) VALUES (?, ?, ?)",
          [userId, type, scopeId],
        );
      }
    }
  }

  private normalizeScopeIds(value: unknown) {
    const ids = Array.isArray(value) ? value : String(value ?? "").split(",");
    return ids.filter((id) => !this.isPhpEmpty(id));
  }

  private async updateDepartmentExtension(body: Record<string, any>) {
    if (this.isPhpEmpty(body.departmentId) || this.isPhpEmpty(body.extension)) {
      return;
    }

    const extension = String(body.extension);
    const newExt = JSON.stringify(extension);
    await this.entityManager.query(
      `
        UPDATE departments
        SET extensions = REPLACE(REPLACE(REPLACE(REPLACE(extensions, ?, ''), ',,', ','), '[,', '['), ',]', ']')
        WHERE extensions LIKE ?
      `,
      [newExt, `%${newExt}%`],
    );

    const departments = await this.entityManager.query(
      "SELECT id, extensions FROM departments WHERE id = ? LIMIT 1",
      [body.departmentId],
    );
    const department = departments[0];
    if (!department) {
      return;
    }

    let extensions: string[] = [];
    if (!this.isPhpEmpty(department.extensions)) {
      try {
        const parsed = JSON.parse(String(department.extensions));
        extensions = Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        extensions = [];
      }
    }

    if (!extensions.includes(extension)) {
      extensions.push(extension);
    }

    await this.entityManager.query(
      "UPDATE departments SET extensions = ? WHERE id = ?",
      [JSON.stringify(extensions), department.id],
    );
  }

  private async insertUpdateUserHistory(
    params: Record<string, any>,
    oldUser: DbRow | undefined,
    newUser: DbRow | undefined,
    currentUser: DbRow | undefined,
  ) {
    if (!oldUser || !newUser || !currentUser) {
      return;
    }

    const dataChange = {
      old: [] as Record<string, any>[],
      new: [] as Record<string, any>[],
    };
    const text: string[] = [];

    for (const [key, value] of Object.entries(params)) {
      if (key === "avatar") {
        continue;
      }
      if (value !== oldUser[key]) {
        dataChange.old.push({ [key]: oldUser[key] });
        dataChange.new.push({ [key]: value });
        text.push(key);
      }
    }

    const fullname =
      `${currentUser.lastName ?? ""} ${currentUser.firstName ?? ""}`.trim();
    const historyText = `<b>${fullname}</b> đã cập nhật <i>${text.join(",")}</i> cho tài khoản: <b>${newUser.email}</b>`;

    await this.entityManager.query(
      `
        INSERT INTO data_history (action,action_type,data_change,created_by,groupId,text)
        VALUES (?,?,?,?,?,?)
      `,
      [
        "update",
        "user",
        JSON.stringify(dataChange),
        currentUser.id,
        newUser.groupId,
        historyText,
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

    await this.entityManager.query(
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
    const rows = await this.entityManager.query(
      `
        SELECT CONCAT('0', (CAST(userCode AS UNSIGNED) + 1)) AS userCode
        FROM users
        WHERE LENGTH(userCode) = 5
        ORDER BY id DESC
        LIMIT 1
      `
    );

    return rows[0]?.userCode ?? String(Date.now());
  }

  private signUserToken(user: any, remember: boolean, request?: Request) {
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

  private applyUserFilters(
    filters: unknown,
    qb: SelectQueryBuilder<any>
  ) {
    if (
      !filters ||
      typeof filters !== "object" ||
      Array.isArray(filters) ||
      Object.keys(filters).length === 0
    ) {
      return;
    }

    let filterCount = 0;
    for (const [column, rawFilter] of Object.entries(
      filters as Record<string, any>,
    )) {
      const type = String(rawFilter?.type ?? "");
      if (!USER_TABLE_COLUMNS.has(column) || !USER_FILTER_TYPES.has(type)) {
        this.throwError(
          { filter: "Cột không tồn tại hoặc kiểu lọc không cho phép." },
          HttpStatus.NOT_ACCEPTABLE,
          "Invalid parameters",
        );
      }

      const keyword = rawFilter?.keyword;
      if (this.isPhpEmpty(keyword)) {
        continue;
      }

      filterCount++;
      const paramName = `filter_${column}_${filterCount}`;
      const columnSql = `users.\`${column}\``;
      switch (type) {
        case "like":
          qb.andWhere(`${columnSql} LIKE :${paramName}`, { [paramName]: `%${keyword}%` });
          break;
        case "like_left":
          qb.andWhere(`${columnSql} LIKE :${paramName}`, { [paramName]: `%${keyword}` });
          break;
        case "like_right":
          qb.andWhere(`${columnSql} LIKE :${paramName}`, { [paramName]: `${keyword}%` });
          break;
        case "not_like":
          qb.andWhere(`${columnSql} NOT LIKE :${paramName}`, { [paramName]: `%${keyword}%` });
          break;
        case "not_like_left":
          qb.andWhere(`${columnSql} NOT LIKE :${paramName}`, { [paramName]: `%${keyword}` });
          break;
        case "not_like_right":
          qb.andWhere(`${columnSql} NOT LIKE :${paramName}`, { [paramName]: `${keyword}%` });
          break;
        case "more":
          qb.andWhere(`${columnSql} > :${paramName}`, { [paramName]: keyword });
          break;
        case "less":
          qb.andWhere(`${columnSql} < :${paramName}`, { [paramName]: keyword });
          break;
        case "other":
          qb.andWhere(`${columnSql} <> :${paramName}`, { [paramName]: keyword });
          break;
        case "more_equal":
          qb.andWhere(`${columnSql} >= :${paramName}`, { [paramName]: keyword });
          break;
        case "more_less":
          qb.andWhere(`${columnSql} <= :${paramName}`, { [paramName]: keyword });
          break;
      }
    }
  }

  private applyUserOrder(qb: SelectQueryBuilder<any>, sorts: unknown) {
    if (
      !sorts ||
      typeof sorts !== "object" ||
      (Array.isArray(sorts) && sorts.length === 0)
    ) {
      qb.orderBy("users.id", "DESC");
      return;
    }

    const entries = Array.isArray(sorts)
      ? sorts.map((sort) => [
          String(sort?.name ?? sort?.field ?? ""),
          sort?.direction ?? sort?.order,
        ])
      : Object.entries(sorts as Record<string, unknown>);

    let isFirst = true;
    for (const [name, rawDirection] of entries) {
      if (!USER_TABLE_COLUMNS.has(name)) {
        continue;
      }
      const direction =
        String(rawDirection ?? "").toLowerCase() === "desc"
          ? "DESC"
          : String(rawDirection ?? "").toLowerCase() === "asc"
            ? "ASC"
            : undefined;
      if (!direction) {
        continue;
      }

      if (isFirst) {
        qb.orderBy(`users.${name}`, direction);
        isFirst = false;
      } else {
        qb.addOrderBy(`users.${name}`, direction);
      }
    }

    if (isFirst) {
      qb.orderBy("users.id", "DESC");
    }
  }

  private paginateLaravel(
    data: DbRow[],
    total: number,
    perPage: number,
    currentPage: number,
    request?: Request,
  ) {
    const lastPage = Math.max(Math.ceil(total / perPage), 1);
    const path = request ? this.requestPathWithoutQuery(request) : null;
    const from = data.length === 0 ? null : (currentPage - 1) * perPage + 1;
    const to =
      data.length === 0 ? null : (currentPage - 1) * perPage + data.length;

    return {
      current_page: currentPage,
      data,
      first_page_url: this.paginationUrl(path, 1),
      from,
      last_page: lastPage,
      last_page_url: this.paginationUrl(path, lastPage),
      links: this.paginationLinks(path, currentPage, lastPage),
      next_page_url:
        currentPage < lastPage ? this.paginationUrl(path, currentPage + 1) : null,
      path,
      per_page: perPage,
      prev_page_url:
        currentPage > 1 ? this.paginationUrl(path, currentPage - 1) : null,
      to,
      total,
    };
  }

  private paginationLinks(
    path: string | null,
    currentPage: number,
    lastPage: number,
  ) {
    const links: Array<{
      url: string | null;
      label: string;
      page: number | null;
      active: boolean;
    }> = [
      {
        url: currentPage > 1 ? this.paginationUrl(path, currentPage - 1) : null,
        label: "&laquo; Previous",
        page: currentPage > 1 ? currentPage - 1 : null,
        active: false,
      },
    ];

    for (let page = 1; page <= lastPage; page += 1) {
      links.push({
        url: this.paginationUrl(path, page),
        label: String(page),
        page,
        active: page === currentPage,
      });
    }

    links.push({
      url: currentPage < lastPage ? this.paginationUrl(path, currentPage + 1) : null,
      label: "Next &raquo;",
      page: currentPage < lastPage ? currentPage + 1 : null,
      active: false,
    });

    return links;
  }

  private paginationUrl(path: string | null, page: number) {
    return path ? `${path}?page=${page}` : null;
  }

  private requestPathWithoutQuery(request: Request) {
    const host = this.headerToString(
      request.headers["x-forwarded-host"] ?? request.headers.host,
    );
    if (!host) {
      return request.originalUrl.split("?")[0];
    }

    const protocol = this.headerToString(request.headers["x-forwarded-proto"])
      ?? request.protocol
      ?? "http";
    return `${protocol}://${host}${request.originalUrl.split("?")[0]}`;
  }

  private normalizePage(value: unknown) {
    const page = Number(value);
    return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  }

  private normalizeLaravelRecordsOnPage(value: unknown) {
    if (this.isPhpEmpty(value)) {
      return 10;
    }

    const size = Number(value);
    if (Number.isFinite(size) && size > 0 && size <= 500) {
      return Math.floor(size);
    }

    this.throwError(
      {
        records_on_pages:
          "Số mẫu tin trên mỗi trang phải lớn hơn 0 và nhỏ hơn bằng 500.",
      },
      HttpStatus.NOT_ACCEPTABLE,
      "Invalid parameters",
    );
  }

  private isPhpEmpty(value: unknown) {
    if (value === undefined || value === null || value === false) {
      return true;
    }
    if (value === "" || value === "0" || value === 0) {
      return true;
    }
    return Array.isArray(value) && value.length === 0;
  }

  private isLaravelNullLoose(value: unknown) {
    return value === undefined || value === null || value === "";
  }

  private normalizeBcryptHash(hash: string) {
    return hash?.startsWith("$2y$") ? `$2b$${hash.slice(4)}` : hash;
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

  private toSqlDateTime(date: Date) {
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
}
