/**
 * =============================================================================
 * cdr.service.ts - Service xử lý dữ liệu CDR (Call Detail Record)
 * =============================================================================
 *
 * Service chứa toàn bộ logic truy vấn và xử lý dữ liệu cuộc gọi.
 * Đã MIGRATE hoàn chỉnh từ CdrModel.php + CdrController.php trong Laravel.
 *
 * Chức năng chính:
 * - getCalls()         → Danh sách cuộc gọi có phân trang + thống kê tổng hợp
 * - getStaticCalls()   → Thống kê tổng hợp cuộc gọi (answered, missed, ...)
 * - getCallsLog()      → Lịch sử cuộc gọi theo callRefId/extensions
 * - reportByYear()     → Báo cáo cuộc gọi ra theo tháng trong 1 năm
 * - searchExtensions() → Tìm kiếm extension trong CDR
 * - getProviderPrefix()→ Lấy bảng giá cước + billing
 *
 * Kiến trúc query:
 * - prepareRequest()   → Chuẩn bị input (resolve groupId, load agents)
 * - buildCdrWhere()    → Xây dựng WHERE clause cho SQL
 * - cdrTable()         → Chọn bảng: 'cdr' (tháng hiện tại) hoặc 'cdr_monthly' (tháng cũ)
 * - getTotals()        → Tính thống kê tổng hợp (totalAnswered, outCalls, ...)
 * - totalSelect()      → Tạo SQL SELECT cho các cột thống kê
 *
 * Tất cả query sử dụng prepared statements (?) để chống SQL injection.
 *
 * Tương đương: CdrModel.php + CdrController.php trong Laravel
 */

import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { RowDataPacket } from "mysql2";
import { DatabaseService } from "../../config/database.service";

@Injectable()
export class CdrService {
  constructor(private readonly database: DatabaseService) {}

  async getCalls(body: Record<string, any>) {
    const input = await this.prepareRequest({ ...body }, true);
    const query = this.buildCdrWhere(input, { search: true });
    const totals = await this.getTotals(input, query);

    if (input.typeGet === "static") {
      return totals;
    }

    const recordsOnPage = this.recordsOnPage(input.recordsOnPage);
    const currentPage = this.currentPage(input.current_page ?? input.page);
    const offset = (currentPage - 1) * recordsOnPage;
    const table = this.cdrTable(input);

    const countRows = await this.database.query<CdrRow[]>(
      "voice",
      `SELECT COUNT(*) AS total FROM \`${table}\` WHERE ${query.where.join(" AND ")}`,
      query.params,
    );
    const total = Number(countRows[0]?.total ?? 0);

    const data = await this.database.query<CdrRow[]>(
      "voice",
      `
        SELECT
          recid,
          DATE_FORMAT(callDate, '%d/%m/%Y %H:%i:%s') AS callDate,
          IF(did IS NULL OR did = '', cnum, src) AS src,
          dst,
          duration,
          IF(disposition = 'ANSWERED', billsec, 0) AS billSec,
          disposition,
          did,
          recordingfile AS recFile,
          cnam,
          REGEXP_SUBSTR(dstchannel, '[0-9]+') AS dstForward,
          accountcode,
          IF(
            CHAR_LENGTH(IF(did IS NULL OR did = '', cnum, src)) <= CHAR_LENGTH(dst),
            cnum,
            dst
          ) AS extension,
          (CASE
            WHEN CHAR_LENGTH(IF(did IS NULL OR did = '', cnum, src)) < 6
              AND CHAR_LENGTH(dst) < 6 THEN 'local'
            WHEN CHAR_LENGTH(IF(did IS NULL OR did = '', cnum, src)) < CHAR_LENGTH(dst) THEN 'out'
            ELSE 'in'
          END) AS calltype,
          linkedid,
          outbound_cnum,
          outtele_system
        FROM \`${table}\`
        WHERE ${query.where.join(" AND ")}
        ORDER BY recid DESC
        LIMIT ? OFFSET ?
      `,
      [...query.params, recordsOnPage, offset],
    );

    const result = this.paginate(data, total, recordsOnPage, currentPage);
    for (const [key, value] of Object.entries(totals ?? {})) {
      result[key] =
        key.includes("Time") || key.includes("CallTime")
          ? this.secToTime(Number(value ?? 0))
          : value;
    }

    return result;
  }

  async getStaticCalls(body: Record<string, any>) {
    const input = await this.prepareRequest({ ...body }, true);
    const query = this.buildCdrWhere(input);
    const table = this.cdrTable(input);

    if (input.groupByExt) {
      return this.database.query<CdrRow[]>(
        "voice",
        `
          SELECT
            ${this.totalSelect()},
            IF(CHAR_LENGTH(cnum) < 6, cnum, dst) AS extension
          FROM \`${table}\`
          WHERE ${query.where.join(" AND ")}
          GROUP BY extension
        `,
        query.params,
      );
    }

    const rows = await this.database.query<CdrRow[]>(
      "voice",
      `SELECT ${this.totalSelect()} FROM \`${table}\` WHERE ${query.where.join(" AND ")}`,
      query.params,
    );
    return rows[0] ?? {};
  }

  async getStaticCallsv2(body: Record<string, any>) {
    return this.getStaticCalls(body);
  }

  async getCallsLog(body: Record<string, any>) {
    const input = { ...body };
    this.require(input.startDate, "startDate", "startDate khong duoc rong.");
    this.require(input.endDate, "endDate", "endDate khong duoc rong.");
    if (!Array.isArray(input.callRefId) && !Array.isArray(input.extensions)) {
      this.throwValidation({
        callRefId:
          "CallRefId hoac Extensions khong duoc rong va phai la dang mang.",
      });
    }

    const table = this.cdrTable(input);
    const where = [
      'calldate >= STR_TO_DATE(?, "%Y-%m-%d %H:%i:%s")',
      'calldate <= STR_TO_DATE(?, "%Y-%m-%d %H:%i:%s")',
      "recordingfile IS NOT NULL",
      "src != dst",
      "cnum != dst",
      "lastapp != 'BUSY'",
    ];
    const params: any[] = [input.startDate, input.endDate];

    if (Array.isArray(input.callRefId) && input.callRefId.length) {
      where.push("linkedid IN (?)");
      params.push(input.callRefId);
    }

    if (Array.isArray(input.extensions) && input.extensions.length) {
      where.push("(cnum IN (?) OR dst IN (?))");
      params.push(input.extensions, input.extensions);
    }

    if (Array.isArray(input.srcs) && input.srcs.length) {
      where.push("cnum IN (?)");
      params.push(input.srcs);
    }

    if (Array.isArray(input.dsts) && input.dsts.length) {
      where.push("dst IN (?)");
      params.push(input.dsts);
    }

    return this.database.query<CdrRow[]>(
      "voice",
      `
        SELECT
          linkedid AS callRefId,
          disposition AS callStatus,
          DATE_FORMAT(callDate, '%d/%m/%Y %H:%i:%s') AS callStartTime,
          IF(did IS NULL, cnum, src) AS src,
          dst,
          duration,
          billSec,
          IF(disposition = 'ANSWERED', convertRecordingFile(calldate, recordingfile), NULL) AS recFile,
          IF(
            CHAR_LENGTH(src) < 5 AND CHAR_LENGTH(dst) < 5,
            'local',
            IF(CHAR_LENGTH(src) > 5 AND CHAR_LENGTH(dst) < 5, 'inbound', 'outbound')
          ) AS callType
        FROM \`${table}\`
        WHERE ${where.join(" AND ")}
        ORDER BY callStartTime DESC
      `,
      params,
    );
  }

  async reportByYear(body: Record<string, any>) {
    const year = Number(body.year ?? new Date().getFullYear());
    const input = {
      ...body,
      startDate: body.startDate ?? `${year}-01-01 00:00:00`,
      endDate: body.endDate ?? `${year}-12-31 23:59:59`,
    };
    const prepared = await this.prepareRequest(input, false);
    const query = this.buildCdrWhere(prepared);
    const table = this.cdrTable(prepared);

    query.where.push(`
      CHAR_LENGTH(IF(did IS NULL, cnum, src)) < CHAR_LENGTH(dst)
      AND SUBSTRING(dst, 1, 1) <> '7'
      AND CHAR_LENGTH(dst) > 6
    `);

    const rows = await this.database.query<CdrRow[]>(
      "voice",
      `
        SELECT
          CONCAT(MONTH(calldate), '-', YEAR(calldate)) AS time,
          MONTH(calldate) AS m,
          COUNT(CASE disposition WHEN 'ANSWERED' THEN 1 ELSE NULL END) AS totalAnswered,
          COUNT(CASE disposition WHEN 'ANSWERED' THEN NULL ELSE 1 END) AS totalNoAnswered
        FROM \`${table}\`
        WHERE ${query.where.join(" AND ")}
        GROUP BY m
        ORDER BY calldate ASC
      `,
      query.params,
    );

    const byMonth = new Map<number, Record<string, any>>();
    for (const row of rows) {
      const month = Number(row.m);
      byMonth.set(month, {
        ...row,
        perDayAnswered: Math.round(Number(row.totalAnswered ?? 0) / 30),
        perDayNoAnswered: Math.round(Number(row.totalNoAnswered ?? 0) / 30),
      });
    }

    const result: Record<string, any>[] = [];
    for (let month = 1; month <= 12; month += 1) {
      result.push(
        byMonth.get(month) ?? {
          time: `${month}-${year}`,
          totalAnswered: 0,
          totalNoAnswered: 0,
          perDayAnswered: 0,
          perDayNoAnswered: 0,
          m: month,
        },
      );
    }

    return result;
  }

  async searchExtensions(body: Record<string, any>) {
    const input = await this.prepareRequest({ ...body }, false);
    const searchExtensions = Array.isArray(input.searchExtensions)
      ? input.searchExtensions.filter(
          (value) => value !== undefined && value !== null,
        )
      : [];

    if (!searchExtensions.length) {
      return [];
    }

    const base = this.buildCdrWhere(input, { onlyExtensions: true });
    const table = this.cdrTable(input);
    const likeSql = searchExtensions.map(() => "src LIKE ?").join(" OR ");
    const likeSqlDst = searchExtensions.map(() => "dst LIKE ?").join(" OR ");
    const likeParams = searchExtensions.map((value) => `%${value}%`);
    const recordsOnPage = this.recordsOnPage(input.recordsOnPage);
    const currentPage = this.currentPage(input.current_page ?? input.page);
    const offset = (currentPage - 1) * recordsOnPage;
    const extensions = Array.isArray(input.extensions) ? input.extensions : [];

    const rows = await this.database.query<CdrRow[]>(
      "voice",
      `
        SELECT extension
        FROM (
          SELECT src AS extension
          FROM \`${table}\`
          WHERE ${base.where.join(" AND ")} AND (${likeSql}) AND dst IN (?)
          UNION
          SELECT dst AS extension
          FROM \`${table}\`
          WHERE ${base.where.join(" AND ")} AND (${likeSqlDst}) AND src IN (?)
        ) AS ext_search
        LIMIT ? OFFSET ?
      `,
      [
        ...base.params,
        ...likeParams,
        extensions,
        ...base.params,
        ...likeParams,
        extensions,
        recordsOnPage,
        offset,
      ],
    );

    return this.paginate(rows, rows.length, recordsOnPage, currentPage);
  }

  async getProviderPrefix(body: Record<string, any>) {
    const devgroupId = Number(body.devgroupId);
    const price = await this.database.query<CdrRow[]>(
      "voice",
      "SELECT * FROM provider_prefix_rate WHERE groupid = ?",
      [devgroupId],
    );
    const bill = await this.database.query<CdrRow[]>(
      "voice",
      "SELECT * FROM cdr_billing WHERE groupid = ?",
      [devgroupId],
    );

    return {
      price,
      bill: bill.map((item) => {
        const remaining =
          Number(item.max_price ?? 0) - Number(item.cur_price ?? 0);
        return {
          ...item,
          remaining,
          max_price_format: this.formatMoney(item.max_price),
          cur_price_format: this.formatMoney(item.cur_price),
          remaining_format: this.formatMoney(remaining),
        };
      }),
    };
  }

  private async prepareRequest(
    input: Record<string, any>,
    appendGroupAgents: boolean,
  ) {
    input.startDate = input.startDate || `${this.today()} 00:00:00`;
    input.endDate = input.endDate || `${this.today()} 23:59:59`;

    if (!input.devgroupId && input.secret) {
      const groupRows = await this.database.query<CdrRow[]>(
        "main",
        "SELECT id FROM `groups` WHERE secret = ? LIMIT 1",
        [input.secret],
      );
      if (groupRows[0]) {
        input.devgroupId = groupRows[0].id;
      }
    }

    if (appendGroupAgents && input.devgroupId) {
      const extensions = Array.isArray(input.extensions)
        ? [...input.extensions]
        : [];
      if (Array.isArray(input.list_agents) && input.list_agents.length) {
        input.extensions = [...extensions, ...input.list_agents];
      } else {
        const agentRows = await this.database.query<CdrRow[]>(
          "main",
          `
            SELECT GROUP_CONCAT(userCode SEPARATOR ',') AS agentId
            FROM users
            WHERE groupId = ? AND LENGTH(userCode) > 4 AND LENGTH(userCode) < 7
          `,
          [input.devgroupId],
        );
        const agentIds = String(agentRows[0]?.agentId ?? "")
          .split(",")
          .filter(Boolean);
        input.extensions = [...extensions, ...agentIds];
      }
    }

    return input;
  }

  private buildCdrWhere(
    input: Record<string, any>,
    options: { search?: boolean; onlyExtensions?: boolean } = {},
  ) {
    const where = ["calldate BETWEEN ? AND ?"];
    const params: any[] = [input.startDate, input.endDate];
    const typeFilter = String(input.typeFilter ?? "");

    if (typeFilter !== "voicebox") {
      if (!Array.isArray(input.extensions) || !input.extensions.length) {
        this.throwValidation({
          extensions: "Extensions khong duoc rong va phai la dang mang.",
        });
      }
      where.push("(cnum IN (?) OR dst IN (?))");
      params.push(input.extensions, input.extensions);
    }

    if (options.onlyExtensions) {
      return { where, params };
    }

    if (
      Array.isArray(input.srcs) &&
      input.srcs.length &&
      Array.isArray(input.dsts) &&
      input.dsts.length
    ) {
      where.push("((dst IN (?) AND LEFT(src, 1) <> ?) OR cnum IN (?))");
      params.push(input.dsts, "1", input.srcs);
    } else if (Array.isArray(input.srcs) && input.srcs.length) {
      where.push("cnum IN (?)");
      params.push(input.srcs);
    } else if (Array.isArray(input.dsts) && input.dsts.length) {
      where.push("(dst IN (?) AND LEFT(src, 1) <> ?)");
      params.push(input.dsts, "1");
    }

    if (input.billsec !== undefined && input.billsec !== "") {
      if (input.billsec !== "custom") {
        where.push("billsec >= ?");
        params.push(Number(input.billsec));
      } else if (input.billsecFrom && input.billsecTo) {
        where.push("billsec BETWEEN ? AND ?");
        params.push(Number(input.billsecFrom), Number(input.billsecTo));
      } else if (input.billsecFrom) {
        where.push("billsec >= ?");
        params.push(Number(input.billsecFrom));
      } else if (input.billsecTo) {
        where.push("billsec <= ?");
        params.push(Number(input.billsecTo));
      }
    }

    if (input.onlyRecfile !== undefined) {
      where.push(
        input.onlyRecfile
          ? "recordingfile IS NOT NULL"
          : "recordingfile IS NULL",
      );
      where.push("billsec > 0");
    }

    if (Array.isArray(input.dispositions) && input.dispositions.length) {
      where.push("disposition IN (?)");
      params.push(input.dispositions);
    }

    if (options.search && input.search && !Array.isArray(input.search)) {
      const keyword = `%${String(input.search)}%`;
      where.push(`
        (
          cnum LIKE ? OR src LIKE ? OR dst LIKE ? OR disposition LIKE ?
          OR accountcode LIKE ? OR outbound_cnum IN (?) OR did IN (?)
        )
      `);
      params.push(
        keyword,
        keyword,
        keyword,
        keyword,
        keyword,
        String(input.search),
        String(input.search),
      );
    }

    if (typeFilter && typeFilter !== "total") {
      if (
        typeFilter === "voicebox" &&
        Array.isArray(input.extensions) &&
        input.extensions.length
      ) {
        where.push("did IN (?) AND dcontext = 'voicebox'");
        params.push(input.extensions);
      }
      return { where, params };
    }

    where.push(`
      cnum != dst
      AND dcontext != 'play-system-recording'
      AND lastapp NOT IN ('Congestion', 'Busy', 'Playback')
      AND disposition <> 'FAILED'
    `);

    return { where, params };
  }

  private async getTotals(
    input: Record<string, any>,
    query: { where: string[]; params: any[] },
  ) {
    const table = this.cdrTable(input);
    const rows = await this.database.query<CdrRow[]>(
      "voice",
      `SELECT ${this.totalSelect()} FROM \`${table}\` WHERE ${query.where.join(" AND ")}`,
      query.params,
    );
    return rows[0] ?? {};
  }

  private totalSelect() {
    const caller = "IF(did IS NULL OR did = '', cnum, src)";
    const outbound = `CHAR_LENGTH(${caller}) < CHAR_LENGTH(dst) AND SUBSTRING(dst, 1, 1) <> '7' AND CHAR_LENGTH(dst) > 6`;
    const inbound = `CHAR_LENGTH(${caller}) > CHAR_LENGTH(dst) OR (CHAR_LENGTH(${caller}) <= CHAR_LENGTH(dst) AND SUBSTRING(dst, 1, 1) = '7' AND CHAR_LENGTH(dst) > 6) OR dst = 's'`;
    const internal = `CHAR_LENGTH(${caller}) BETWEEN 2 AND 5 AND CHAR_LENGTH(${caller}) = CHAR_LENGTH(dst) AND CHAR_LENGTH(dst) BETWEEN 2 AND 5`;

    return `
      COUNT(CASE disposition WHEN 'ANSWERED' THEN 1 ELSE NULL END) AS totalAnswered,
      COUNT(CASE disposition WHEN 'NO ANSWER' THEN 1 ELSE NULL END) AS totalNoAnswered,
      COUNT(CASE disposition WHEN 'FAILED' THEN 1 ELSE NULL END) AS totalFailed,
      COUNT(CASE disposition WHEN 'BUSY' THEN 1 ELSE NULL END) AS totalBusy,
      SUM(billsec) AS totalCallTime,
      COUNT(CASE WHEN (${outbound}) THEN 1 ELSE NULL END) AS outCalls,
      COUNT(CASE WHEN (${inbound}) THEN 1 ELSE NULL END) AS inCalls,
      SUM(CASE WHEN (${inbound}) AND disposition = 'ANSWERED' THEN billsec ELSE 0 END) AS inCallTime,
      SUM(CASE WHEN (${outbound}) AND disposition = 'ANSWERED' THEN billsec ELSE 0 END) AS outCallTime,
      COUNT(CASE WHEN (${outbound}) AND disposition = 'ANSWERED' THEN 1 ELSE NULL END) AS totalAnsweredOut,
      COUNT(CASE WHEN (${outbound}) AND disposition = 'FAILED' THEN 1 ELSE NULL END) AS totalFailedOut,
      COUNT(CASE WHEN (${outbound}) AND disposition = 'BUSY' THEN 1 ELSE NULL END) AS totalBusyOut,
      COUNT(CASE WHEN (${outbound}) AND disposition = 'NO ANSWER' THEN 1 ELSE NULL END) AS totalNoAnsweredOut,
      COUNT(CASE WHEN (${inbound}) AND disposition = 'ANSWERED' THEN 1 ELSE NULL END) AS totalAnsweredIn,
      COUNT(CASE WHEN (${inbound}) AND disposition = 'FAILED' THEN 1 ELSE NULL END) AS totalFailedIn,
      COUNT(CASE WHEN (${inbound}) AND disposition = 'BUSY' THEN 1 ELSE NULL END) AS totalBusyIn,
      COUNT(CASE WHEN (${inbound}) AND disposition = 'NO ANSWER' THEN 1 ELSE NULL END) AS totalNoAnsweredIn,
      COUNT(CASE WHEN (${internal}) THEN 1 ELSE NULL END) AS InternalCalls
    `;
  }

  private cdrTable(input: Record<string, any>) {
    const start = new Date(String(input.startDate).replace(" ", "T"));
    const now = new Date();
    if (
      Number.isFinite(start.getTime()) &&
      (start.getFullYear() !== now.getFullYear() ||
        start.getMonth() !== now.getMonth())
    ) {
      return "cdr_monthly";
    }

    return "cdr";
  }

  private paginate(
    data: Record<string, any>[],
    total: number,
    perPage: number,
    currentPage: number,
  ) {
    const lastPage = Math.max(Math.ceil(total / perPage), 1);
    const from = total === 0 ? null : (currentPage - 1) * perPage + 1;

    return {
      current_page: currentPage,
      data,
      first_page_url: null,
      from,
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

  private recordsOnPage(value: unknown) {
    const records = Number(value ?? 10);
    if (!Number.isFinite(records) || records <= 0 || records > 500) {
      this.throwValidation({
        records_on_pages:
          "So mau tin tren moi trang phai lon hon 0 va nho hon bang 500.",
      });
    }
    return Math.floor(records);
  }

  private currentPage(value: unknown) {
    const page = Number(value ?? 1);
    return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  }

  private require(value: unknown, key: string, message: string) {
    if (value === undefined || value === null || value === "") {
      this.throwValidation({ [key]: message });
    }
  }

  private throwValidation(errors: Record<string, string>): never {
    throw new HttpException(
      {
        error: {
          errors,
        },
        code: 406,
        message: "Invalid parameters",
      },
      HttpStatus.NOT_ACCEPTABLE,
    );
  }

  private today() {
    const date = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private secToTime(value: number) {
    const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    const pad = (part: number) => String(part).padStart(2, "0");
    return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`;
  }

  private formatMoney(value: unknown) {
    return new Intl.NumberFormat("vi-VN")
      .format(Number(value ?? 0))
      .replace(/,/g, ".");
  }
}

type CdrRow = RowDataPacket & Record<string, any>;
