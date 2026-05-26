/**
 * =============================================================================
 * user-types.service.ts - Service quản lý loại người dùng & phân quyền
 * =============================================================================
 *
 * Service chứa toàn bộ logic CRUD cho User Types và User Privileges.
 * Đã MIGRATE hoàn chỉnh từ UserTypeController.php trong Laravel.
 *
 * Chức năng chính:
 * - getUserTypesWithPage()   → Danh sách user types có phân trang + search + sort
 * - getUserTypes()           → Tất cả user types kèm privileges
 * - getUserType(id)          → Chi tiết 1 user type kèm privileges
 * - insertUserType()        → Thêm mới (transaction: user_types + user_privileges)
 * - updateUserType()        → Cập nhật (transaction: update type + upsert privileges)
 * - deleteUserType()        → Soft delete 1 user type (status = 'trash')
 * - deleteUserTypes()       → Soft delete nhiều user types
 *
 * Cơ chế phân quyền (Privileges):
 * - Mỗi user type có nhiều privileges (bảng user_privileges)
 * - Privilege = { action: string, page: string }
 *   VD: { action: "view", page: "cdrv2" } → cho phép xem module báo cáo CDR
 * - Khi insert/update → xử lý trong transaction để đảm bảo tính toàn vẹn
 *
 * Tương đương: UserTypeController.php trong Laravel
 */

import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { PoolConnection } from "mysql2/promise";
import { DatabaseService } from "../../config/database.service";

@Injectable()
export class UserTypesService {
  constructor(private readonly database: DatabaseService) {}

  async getUserTypesWithPage(body: Record<string, any>) {
    const where = ["user_types.status <> ?"];
    const params: any[] = ["trash"];

    if (body.groupId) {
      where.push("user_types.groupId = ?");
      params.push(body.groupId);
    }

    if (body.search && !Array.isArray(body.search)) {
      where.push("groups.groupName LIKE ?");
      params.push(`%${body.search}%`);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;
    const perPage = this.recordsOnPage(body.recordsOnPage);
    const currentPage = this.currentPage(body.current_page ?? body.page);
    const offset = (currentPage - 1) * perPage;
    const orderSql = this.userTypeOrder(body.sorts);

    const countRows = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT COUNT(*) AS total
        FROM user_types
        JOIN \`groups\` ON user_types.groupId = \`groups\`.id
        ${whereSql}
      `,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);

    const data = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT
          user_types.id,
          user_types.name,
          user_types.description,
          user_types.groupId,
          \`groups\`.groupName,
          user_types.status
        FROM user_types
        JOIN \`groups\` ON user_types.groupId = \`groups\`.id
        ${whereSql}
        ${orderSql}
        LIMIT ? OFFSET ?
      `,
      [...params, perPage, offset],
    );

    return this.paginate(data, total, perPage, currentPage);
  }

  async getUserTypes() {
    const rows = await this.database.query<DbRow[]>(
      "main",
      "SELECT id, name, groupId FROM user_types WHERE status <> 'trash'",
    );

    for (const row of rows) {
      row.user_privileges = await this.getPrivileges(Number(row.id), true);
    }

    return rows;
  }

  async getUserType(id: string) {
    const rows = await this.database.query<DbRow[]>(
      "main",
      "SELECT id, name, description, groupId FROM user_types WHERE id = ? LIMIT 1",
      [id],
    );
    const userType = rows[0];
    if (!userType) {
      this.throwError(
        { id_not_exist: "Khong ton tai." },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }

    userType.user_privileges = await this.getPrivileges(Number(id), false);
    return userType;
  }

  async insertUserType(
    body: Record<string, any>,
    payload?: Record<string, unknown>,
  ) {
    this.validateName(body.name, 250);
    if (
      !body.privileges ||
      typeof body.privileges !== "object" ||
      Array.isArray(body.privileges)
    ) {
      this.throwError(
        "Chua co dat quyen.",
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }

    const duplicated = await this.database.query<DbRow[]>(
      "main",
      "SELECT id FROM user_types WHERE name = ? AND status <> 'trash' LIMIT 1",
      [body.name],
    );
    if (duplicated[0]) {
      this.throwError(
        { name_exist: "Ten phan quyen da ton tai." },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }

    const groupId = body.group_id ?? body.groupId ?? payload?.groupId ?? 0;
    const userId = payload?.id ?? payload?.sub ?? null;
    const connection = await this.database.pool("main").getConnection();

    try {
      await connection.beginTransaction();
      const [result] = await connection.execute<ResultSetHeader>(
        `
          INSERT INTO user_types
            (name, description, groupId, created_by, updated_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          body.name,
          body.description ?? "",
          groupId,
          userId,
          userId,
          this.nowSql(),
        ],
      );

      await this.insertPrivileges(
        connection,
        result.insertId,
        body.privileges,
        userId,
      );
      await connection.commit();

      return {
        success: result.insertId,
        code: 201,
        message: "Created success",
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateUserType(
    id: string,
    body: Record<string, any>,
    payload?: Record<string, unknown>,
  ) {
    this.validateName(body.name, 250);
    const userType = await this.database.query<DbRow[]>(
      "main",
      "SELECT id FROM user_types WHERE id = ? LIMIT 1",
      [id],
    );
    if (!userType[0]) {
      this.throwError(
        { id_not_exist: "Id cua phan quyen khong ton tai." },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }

    const duplicated = await this.database.query<DbRow[]>(
      "main",
      "SELECT id FROM user_types WHERE name = ? AND id <> ? AND status <> 'trash' LIMIT 1",
      [body.name, id],
    );
    if (duplicated[0]) {
      this.throwError(
        { name_exist: "Ten cua phan quyen da ton tai." },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }

    const userId = payload?.id ?? payload?.sub ?? null;
    const connection = await this.database.pool("main").getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute<ResultSetHeader>(
        `
          UPDATE user_types
          SET name = ?, description = ?, groupId = COALESCE(?, groupId), updated_by = ?
          WHERE id = ?
        `,
        [body.name, body.description ?? "", body.groupId ?? null, userId, id],
      );

      if (
        body.privileges &&
        typeof body.privileges === "object" &&
        !Array.isArray(body.privileges)
      ) {
        await connection.execute<ResultSetHeader>(
          "UPDATE user_privileges SET status = 'trash' WHERE user_type_id = ?",
          [id],
        );
        await this.upsertPrivileges(
          connection,
          Number(id),
          body.privileges,
          userId,
        );
      }

      await connection.commit();
      return { update_success: 1, code: 200 };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async deleteUserType(id: string, payload?: Record<string, unknown>) {
    const exists = await this.database.query<DbRow[]>(
      "main",
      "SELECT id FROM user_types WHERE id = ? LIMIT 1",
      [id],
    );
    if (!exists[0]) {
      this.throwError(
        { id: "Khong ton tai." },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }

    await this.database
      .pool("main")
      .execute<ResultSetHeader>(
        "UPDATE user_types SET status = 'trash', trashed_at = ?, trashed_by = ? WHERE id = ?",
        [this.nowSql(), this.payloadId(payload), id],
      );

    return { delete_success: "1", code: 200 };
  }

  async deleteUserTypes(
    body: Record<string, any>,
    payload?: Record<string, unknown>,
  ) {
    if (!Array.isArray(body.list)) {
      this.throwError(
        { list: "Danh sach id cua phan quyen la bat buoc." },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }

    const [result] = await this.database
      .pool("main")
      .execute<ResultSetHeader>(
        "UPDATE user_types SET status = 'trash', trashed_at = ?, trashed_by = ? WHERE id IN (?)",
        [this.nowSql(), this.payloadId(payload), body.list],
      );

    if (!result.affectedRows) {
      this.throwError(
        { delete: "He thong dang gap su co." },
        HttpStatus.INTERNAL_SERVER_ERROR,
        "Server problem",
      );
    }

    return { delete_success: "1", code: 200 };
  }

  private async getPrivileges(userTypeId: number, excludeTrashed: boolean) {
    const where = excludeTrashed ? "AND status <> 'trash'" : "";
    return this.database.query<DbRow[]>(
      "main",
      `
        SELECT id, action, page, status
        FROM user_privileges
        WHERE user_type_id = ? ${where}
      `,
      [userTypeId],
    );
  }

  private async insertPrivileges(
    connection: PoolConnection,
    userTypeId: number,
    privileges: Record<string, unknown>,
    userId: unknown,
  ) {
    for (const [action, pages] of Object.entries(privileges)) {
      if (!Array.isArray(pages)) {
        continue;
      }
      for (const page of pages) {
        await connection.execute<ResultSetHeader>(
          `
            INSERT INTO user_privileges
              (action, page, user_type_id, status, created_by, created_at)
            VALUES (?, ?, ?, 'publish', ?, ?)
          `,
          [action, page, userTypeId, userId, this.nowSql()],
        );
      }
    }
  }

  private async upsertPrivileges(
    connection: PoolConnection,
    userTypeId: number,
    privileges: Record<string, unknown>,
    userId: unknown,
  ) {
    for (const [action, pages] of Object.entries(privileges)) {
      if (!Array.isArray(pages)) {
        continue;
      }
      for (const page of pages) {
        const [rows] = await connection.query<DbRow[]>(
          "SELECT id FROM user_privileges WHERE user_type_id = ? AND action = ? AND page = ? LIMIT 1",
          [userTypeId, action, page],
        );
        if (rows[0]) {
          await connection.execute<ResultSetHeader>(
            "UPDATE user_privileges SET status = 'publish', updated_by = ? WHERE id = ?",
            [userId, rows[0].id],
          );
        } else {
          await connection.execute<ResultSetHeader>(
            `
              INSERT INTO user_privileges
                (action, page, user_type_id, status, created_by, created_at)
              VALUES (?, ?, ?, 'publish', ?, ?)
            `,
            [action, page, userTypeId, userId, this.nowSql()],
          );
        }
      }
    }
  }

  private userTypeOrder(sorts: unknown) {
    if (!Array.isArray(sorts) || sorts.length === 0) {
      return "ORDER BY user_types.id DESC";
    }

    const allowed = new Set(["id", "name", "description", "groupId", "status"]);
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
        return `user_types.\`${name}\` ${direction}`;
      })
      .filter(Boolean);

    return order.length
      ? `ORDER BY ${order.join(", ")}`
      : "ORDER BY user_types.id DESC";
  }

  private validateName(name: unknown, max: number) {
    const value = String(name ?? "");
    if (value.length < 1 || value.length > max) {
      this.throwError(
        {
          name: `Ten phan quyen la thong tin bat buoc | Xin nhap khong qua ${max} ky tu.`,
        },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }
  }

  private recordsOnPage(value: unknown) {
    const records = Number(value ?? 10);
    if (!Number.isFinite(records) || records <= 0 || records > 500) {
      this.throwError(
        {
          records_on_pages:
            "So mau tin tren moi trang phai lon hon 0 va nho hon bang 500.",
        },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }
    return Math.floor(records);
  }

  private currentPage(value: unknown) {
    const page = Number(value ?? 1);
    return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
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

  private throwError(errors: unknown, code: number, message: string): never {
    throw new HttpException(
      typeof errors === "object" && errors !== null
        ? { error: { errors }, code, message }
        : { error: errors, code, message },
      code,
    );
  }

  private payloadId(payload?: Record<string, unknown>) {
    const id = payload?.id ?? payload?.sub;
    if (typeof id === "number" || typeof id === "string") {
      return id;
    }
    return null;
  }

  private nowSql(date = new Date()) {
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
}

type DbRow = RowDataPacket & Record<string, any>;
