/**
 * =============================================================================
 * groups.service.ts - Service quản lý Nhóm/Công ty (Groups)
 * =============================================================================
 *
 * Service chứa toàn bộ logic cho module Groups.
 * Đã MIGRATE phần lớn từ GroupsController.php trong Laravel.
 *
 * Chức năng chính:
 * - getGroupBySecret()         → Lấy group theo secret key (dùng cho PBX/Connector)
 * - getExtensionQueueBySecret()→ Extensions + Queues theo secret
 * - getQueuesBySecret()        → Queues theo secret
 * - getExtensionsBySecret()    → Extensions theo secret
 * - getExtensionNameBySecret() → Tên extension theo secret
 * - getGroupsWithPage()        → Danh sách groups phân trang + search + sort
 * - getGroups()                → Tất cả groups
 * - getGroup(id)               → Chi tiết 1 group
 * - getHotline()               → Cấu hình hotline
 * - getUserModules()           → Danh sách modules
 * - getDepartmentsWithPage()   → Danh sách phòng ban phân trang
 * - getExtensionsDepartment()  → Extensions theo phòng ban
 * - getListReason()            → Danh sách lý do pause/break
 * - getUserModulesSort()       → Thứ tự sắp xếp modules
 *
 * Bảng database liên quan (main DB):
 * - groups: Thông tin nhóm/công ty
 * - group_hotline: Cấu hình hotline (extensions, queues)
 * - user_module: Module được gán cho group
 * - departments: Phòng ban
 * - reason_list: Danh sách lý do
 * - users: Người dùng (lấy agents)
 *
 * Tương đương: GroupsController.php + GroupModel.php trong Laravel
 */

import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { RowDataPacket } from "mysql2";
import { DatabaseService } from "../../config/database.service";

@Injectable()
export class GroupsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async getGroupBySecret(secret?: string) {
    if (!secret) {
      throw new HttpException(
        { code: 406, message: "Xac thuc khong thanh cong" },
        HttpStatus.NOT_ACCEPTABLE,
      );
    }

    const group = await this.findGroupBySecret(secret);
    if (!group) {
      throw new HttpException(
        { code: 406, message: "Xac thuc khong thanh cong" },
        HttpStatus.NOT_ACCEPTABLE,
      );
    }

    const firstUser = await this.database.query<DbRow[]>(
      "main",
      "SELECT * FROM users WHERE groupId = ? ORDER BY id ASC LIMIT 1",
      [group.id],
    );
    const user = firstUser[0] ?? null;
    const token = user
      ? await this.jwt.signAsync({
          sub: user.id,
          id: user.id,
          email: user.email,
          role: user.role,
          groupId: user.groupId,
          typeId: user.typeId,
        }, {
          expiresIn: this.config.get<string>("JWT_EXPIRES_IN", "1d") as never,
          algorithm: this.config.get<string>("JWT_ALGO", "HS256") as never,
        })
      : null;

    group.user = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT userCode AS agentId, CONCAT_WS('', firstName, lastName) AS name, extension
        FROM users
        WHERE groupId = ?
      `,
      [group.id],
    );
    group.user = this.keyBy(group.user, "agentId");
    group.token = token;
    group.queue_config = await this.getFirstGroupHotlineQueueConfig(group.id);
    group.modules = await this.getUserModulesRows(group.id);
    group.list_reason = await this.database.query<DbRow[]>(
      "main",
      "SELECT UPPER(reason_name) AS reason_name FROM reason_list WHERE groupId = ?",
      [group.id],
    );
    const departments = await this.database.query<DbRow[]>(
      "main",
      "SELECT * FROM departments WHERE groupId = ? AND name <> 'default'",
      [group.id],
    );
    group.departments = departments.map((department) => ({
      id: department.id,
      name: department.name,
      agents: department.agents,
      data: JSON.stringify(department),
    }));

    return {
      code: 200,
      data: group,
    };
  }

  async getExtensionQueueBySecret(secret?: string) {
    const group = await this.findGroupBySecret(secret);
    if (!group) {
      return {
        code: 404,
        extensions: [],
        queues: [],
        message: "secret not found",
      };
    }

    const extensions = await this.getExtensionsBySecret(secret);
    const queues = await this.getQueuesBySecret(secret);
    const agentRows = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT GROUP_CONCAT(userCode) AS txt
        FROM users
        WHERE groupId = ? AND LENGTH(userCode) <= 7
      `,
      [group.id],
    );
    const callcenterRows = await this.database.query<DbRow[]>(
      "main",
      "SELECT ip_local FROM pbx_config WHERE connector_server = ? LIMIT 1",
      [group.connector_server],
    );
    const departments = await this.database.query<DbRow[]>(
      "main",
      "SELECT id, name, extensions, queues FROM departments WHERE groupId = ?",
      [group.id],
    );

    return {
      code: 200,
      extensions,
      queues,
      agents: String(agentRows[0]?.txt ?? "")
        .split(",")
        .filter(Boolean),
      connector_server: group.connector_server,
      context: group.contextout,
      recording_url: group.recording_url,
      pbx_config: this.parseJsonObject(group.webrtc_config),
      pds_config: this.parsePdsConfig(group.pds_config),
      callcenter_ip: callcenterRows[0]?.ip_local ?? null,
      voice_mail_context: group.voice_mail_context,
      config_csat: group.config_csat
        ? this.parseJsonObject(group.config_csat)
        : [],
      group_data: [],
      departments,
    };
  }

  async getQueuesBySecret(secret?: string) {
    if (!secret) {
      return [];
    }

    const rows = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT GROUP_CONCAT(gh.queues SEPARATOR ',') AS queue
        FROM \`groups\`
        LEFT JOIN group_hotline gh ON gh.groupId = \`groups\`.id AND gh.status = 'publish'
        WHERE MD5(\`groups\`.secret) = ? OR \`groups\`.secret = ?
      `,
      [secret, secret],
    );

    return String(rows[0]?.queue ?? "")
      .split(",")
      .filter((queue) => queue && queue !== "0");
  }

  async getExtensionsBySecret(secret?: string) {
    if (!secret) {
      return [];
    }

    const rows = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT GROUP_CONCAT(gh.extensions SEPARATOR ',') AS extensions
        FROM \`groups\`
        LEFT JOIN group_hotline gh ON gh.groupId = \`groups\`.id AND gh.status = 'publish'
        WHERE MD5(\`groups\`.secret) = ? OR \`groups\`.secret = ?
      `,
      [secret, secret],
    );

    return String(rows[0]?.extensions ?? "")
      .split(",")
      .filter(Boolean);
  }

  async getExtensionNameBySecret(secret?: string) {
    if (!secret) {
      return { code: 500, message: "params not valid" };
    }

    const groupRows = await this.database.query<DbRow[]>(
      "main",
      "SELECT id FROM `groups` WHERE secret = ? LIMIT 1",
      [secret],
    );
    if (!groupRows[0]) {
      return { code: 500, message: "secret not valid" };
    }

    const extensions = await this.database.query<DbRow[]>(
      "main",
      "SELECT * FROM extension_config WHERE groupId = ?",
      [groupRows[0].id],
    );

    return {
      code: 200,
      data: this.keyBy(extensions, "extension"),
    };
  }

  async getGroupsWithPage(
    body: Record<string, any>,
    payload?: Record<string, unknown>,
  ) {
    const where = ["groups.status <> ?"];
    const params: any[] = ["trash"];
    const role = payload?.role;

    if (role !== "superadmin" && payload?.groupId) {
      where.push("groups.id = ?");
      params.push(payload.groupId);
    }

    if (body.status && body.status !== "total") {
      where.push("groups.status = ?");
      params.push(body.status);
    }

    if (body.search && !Array.isArray(body.search)) {
      const search = String(body.search);
      if (/^\d+$/.test(search)) {
        where.push(`
          groups.id IN (
            SELECT groupId FROM group_hotline
            WHERE FIND_IN_SET(?, extensions) OR FIND_IN_SET(?, queues)
          )
        `);
        params.push(search, search);
      } else {
        where.push("(groups.groupName LIKE ? OR groups.connector_server = ?)");
        params.push(`%${search}%`, search);
      }
    }

    const perPage = this.recordsOnPage(body.recordsOnPage, 10, 1000);
    const currentPage = this.currentPage(body.current_page ?? body.page);
    const offset = (currentPage - 1) * perPage;
    const orderSql = this.groupOrder(body.sorts);
    const whereSql = `WHERE ${where.join(" AND ")}`;

    const countRows = await this.database.query<DbRow[]>(
      "main",
      `SELECT COUNT(*) AS total FROM \`groups\` ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);
    const data = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT
          id, groupName, limitUser, connector_server, contextout, api_status,
          webhook_active, status, created_at, updated_at, created_by,
          recording_url, socket_url, is_midesk, groupName AS text,
          TO_BASE64(CONCAT(secret, 'mitek')) AS secret,
          (SELECT CONCAT_WS(' ', lastName, firstName) FROM users WHERE users.id = groups.created_by) AS created_name,
          (SELECT CONCAT_WS(' ', lastName, firstName) FROM users WHERE users.id = groups.updated_by) AS updated_name,
          domain, domain_login, recording_url_interval, config_csat
        FROM \`groups\`
        ${whereSql}
        ${orderSql}
        LIMIT ? OFFSET ?
      `,
      [...params, perPage, offset],
    );

    if (!body.only_group) {
      for (const group of data) {
        if (!body.is_module) {
          group.list_hotline = await this.getHotlinesByGroup(group.id);
          const agentRows = await this.database.query<DbRow[]>(
            "main",
            "SELECT GROUP_CONCAT(userCode) AS txt FROM users WHERE groupId = ? AND status = 'active'",
            [group.id],
          );
          group.list_agents = agentRows[0]?.txt ?? null;
        }
        if (!body.active) {
          group.list_module = await this.getUserModulesRows(group.id);
        }
      }
    }

    const result = this.paginate(data, total, perPage, currentPage);
    const summary = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT
          SUM(IF(status = 'active', 1, 0)) AS totalActive,
          SUM(IF(status = 'lock', 1, 0)) AS totalLock,
          SUM(IF(status IN ('active', 'lock'), 1, 0)) AS totalCount
        FROM \`groups\`
      `,
    );
    result.totalCount = Number(summary[0]?.totalCount ?? 0);
    result.totalActive = Number(summary[0]?.totalActive ?? 0);
    result.totalLock = Number(summary[0]?.totalLock ?? 0);

    if (body.userAction) {
      result.extension_check = await this.database.query<DbRow[]>(
        "main",
        "SELECT DISTINCT extension, groupId FROM users WHERE extension IS NOT NULL",
      );
    }

    return result;
  }

  async getGroups() {
    const data = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT id, groupName, limitUser, created_at, created_by
        FROM \`groups\`
        WHERE status <> 'trash'
      `,
    );

    for (const group of data) {
      group.list_hotline = await this.getHotlinesByGroup(group.id);
      group.list_module = await this.getUserModulesRows(group.id);
    }

    return { data };
  }

  async getGroup(groupId: string) {
    const rows = await this.database.query<DbRow[]>(
      "main",
      "SELECT * FROM `groups` WHERE id = ? LIMIT 1",
      [groupId],
    );
    const group = rows[0];
    if (!group) {
      this.throwError(
        { group_not_exist: "Nhom khong ton tai." },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }

    group.did = String(group.did ?? "")
      .split(",")
      .filter(Boolean);
    group.list_hotline = await this.getHotlinesByGroup(group.id);
    group.list_module = await this.getUserModulesRows(group.id);
    group.list_lastrecording = [
      { id: "0", name: "Khong gioi han" },
      { id: "7", name: "7 ngay" },
      { id: "30", name: "30 ngay" },
      { id: "60", name: "60 ngay" },
      { id: "90", name: "90 ngay" },
      { id: "180", name: "180 ngay" },
      { id: "360", name: "360 ngay" },
      { id: "720", name: "720 ngay" },
    ];

    return group;
  }

  async getHotline(groupId?: string) {
    if (groupId) {
      return this.getHotlinesByGroup(groupId);
    }

    return this.database.query<DbRow[]>(
      "main",
      "SELECT * FROM group_hotline WHERE status = 'publish'",
    );
  }

  async getUserModules(groupId?: string) {
    const modules = await this.database.query<DbRow[]>(
      "main",
      "SELECT * FROM user_module WHERE groupId <=> ? ORDER BY `order` ASC",
      [groupId ?? null],
    );

    if (modules.length <= 0) {
      this.throwError(
        { id_not_exist: "Khong ton tai." },
        HttpStatus.NOT_ACCEPTABLE,
        "Invalid parameters",
      );
    }

    return modules;
  }

  async getDepartmentsWithPage(
    body: Record<string, any>,
    payload?: Record<string, unknown>,
  ) {
    const groupId =
      body.groupId && payload?.role === "superadmin"
        ? body.groupId
        : payload?.groupId;
    const perPage = this.recordsOnPage(body.recordsOnPage);
    const currentPage = this.currentPage(body.current_page ?? body.page);
    const offset = (currentPage - 1) * perPage;
    const params = [groupId, "trash"];

    const countRows = await this.database.query<DbRow[]>(
      "main",
      "SELECT COUNT(*) AS total FROM departments WHERE groupId = ? AND status <> ?",
      params,
    );
    const data = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT * FROM departments
        WHERE groupId = ? AND status <> ?
        ORDER BY id DESC
        LIMIT ? OFFSET ?
      `,
      [...params, perPage, offset],
    );

    return this.paginate(
      data,
      Number(countRows[0]?.total ?? 0),
      perPage,
      currentPage,
    );
  }

  async getExtensionsDepartment(body: Record<string, any>) {
    let ext: unknown[] = [];
    let rows: DbRow[];

    if (body.departmentId) {
      const departmentRows = await this.database.query<DbRow[]>(
        "main",
        "SELECT extensions FROM departments WHERE id = ? LIMIT 1",
        [body.departmentId],
      );
      if (!departmentRows[0]) {
        this.throwError(
          { id_not_exist: "Phong ban khong ton tai." },
          HttpStatus.NOT_ACCEPTABLE,
          "Invalid parameters",
        );
      }
      ext = this.parseJsonArray(departmentRows[0].extensions);
      rows = departmentRows;
    } else {
      rows = await this.database.query<DbRow[]>(
        "main",
        "SELECT GROUP_CONCAT(extensions) AS extensions FROM departments",
      );
    }

    const nested = rows[0]?.extensions
      ? this.parseJsonArray(`[${rows[0].extensions}]`)
      : [];
    const list = nested.flatMap((value) => (Array.isArray(value) ? value : []));

    return { data: list, code: 200, ext };
  }

  async getListReason(groupId: string) {
    return this.database.query<DbRow[]>(
      "main",
      `
        SELECT id, UPPER(reason_name) AS reason_name, reason_enabled, created_at, updated_at
        FROM reason_list
        WHERE groupId = ?
      `,
      [groupId],
    );
  }

  async getUserModulesSort() {
    return this.database.query<DbRow[]>(
      "main",
      "SELECT * FROM user_module_sort ORDER BY sort ASC",
    );
  }

  private async findGroupBySecret(secret?: string) {
    if (!secret) {
      return undefined;
    }

    const rows = await this.database.query<DbRow[]>(
      "main",
      `
        SELECT
          groups.id, groups.groupName, groups.secret, groups.recording_url,
          groups.connector_server, groups.did, groups.voice_mail_context,
          groups.contextout, groups.webrtc_config, groups.pds_config,
          groups.config_csat,
          (
            SELECT GROUP_CONCAT(CONCAT_WS('##', gh.extensions, gh.queues) SEPARATOR '$$')
            FROM group_hotline gh
            WHERE gh.groupId = groups.id AND gh.status = 'publish'
          ) AS hl_exts_queues
        FROM \`groups\`
        WHERE MD5(groups.secret) = ? OR groups.secret = ?
        LIMIT 1
      `,
      [secret, secret],
    );

    return rows[0];
  }

  private async getHotlinesByGroup(groupId: unknown) {
    return this.database.query<DbRow[]>(
      "main",
      "SELECT * FROM group_hotline WHERE groupId = ? AND status <> 'trash'",
      [groupId],
    );
  }

  private async getUserModulesRows(groupId: unknown) {
    return this.database.query<DbRow[]>(
      "main",
      "SELECT * FROM user_module WHERE groupId = ? AND status <> 'trash'",
      [groupId],
    );
  }

  private async getFirstGroupHotlineQueueConfig(groupId: unknown) {
    const rows = await this.database.query<DbRow[]>(
      "main",
      "SELECT queue_config FROM group_hotline WHERE groupId = ? LIMIT 1",
      [groupId],
    );
    return rows[0]?.queue_config ?? null;
  }

  private groupOrder(sorts: unknown) {
    if (!Array.isArray(sorts) || sorts.length === 0) {
      return "ORDER BY id DESC";
    }

    const allowed = new Set([
      "id",
      "groupName",
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
        return `groups.\`${name}\` ${direction}`;
      })
      .filter(Boolean);

    return order.length ? `ORDER BY ${order.join(", ")}` : "ORDER BY id DESC";
  }

  private recordsOnPage(value: unknown, fallback = 10, max = 500) {
    const records = Number(value ?? fallback);
    if (!Number.isFinite(records) || records <= 0 || records > max) {
      this.throwError(
        {
          records_on_pages: `So mau tin tren moi trang phai lon hon 0 va nho hon bang ${max}.`,
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
    } as Record<string, any>;
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

  private parsePdsConfig(value: unknown) {
    const parsed = this.parseJsonObject(value);
    if (typeof parsed.queues === "string") {
      parsed.queues = parsed.queues.split(",").filter(Boolean);
    }
    return parsed;
  }

  private parseJsonArray(value: unknown) {
    if (!value || typeof value !== "string") {
      return [];
    }
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private keyBy(rows: DbRow[], key: string) {
    return rows.reduce<Record<string, DbRow>>((acc, row) => {
      if (row[key] !== undefined && row[key] !== null) {
        acc[String(row[key])] = row;
      }
      return acc;
    }, {});
  }

  private throwError(
    errors: Record<string, string>,
    code: number,
    message: string,
  ): never {
    throw new HttpException({ error: { errors }, code, message }, code);
  }
}

type DbRow = RowDataPacket & Record<string, any>;
