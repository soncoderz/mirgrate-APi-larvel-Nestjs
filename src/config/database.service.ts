/**
 * =============================================================================
 * database.service.ts - Service truy cập database thống nhất
 * =============================================================================
 *
 * Service trung tâm để truy cập tất cả database trong ứng dụng.
 * Cung cấp interface đơn giản: chỉ cần truyền tên connection + SQL → lấy kết quả.
 *
 * Tương đương với DB::connection('voice_server_1')->table(...) trong Laravel.
 *
 * Ví dụ sử dụng:
 * // Query vào main database
 * const users = await this.database.query('main', 'SELECT * FROM users WHERE id = ?', [1]);
 *
 * // Query vào voice database
 * const cdrs = await this.database.query('voice', 'SELECT * FROM cdr LIMIT 10');
 */

import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { Pool, RowDataPacket } from "mysql2/promise";
import { MAIN_DB, PBX_DB, VOICE_DB } from "./database.tokens";
import { DatabaseConnectionName } from "./database.types";

/**
 * DatabaseService - Service quản lý và truy cập multi-database
 *
 * Implements OnModuleDestroy để tự động đóng tất cả connection pool
 * khi ứng dụng shutdown (graceful shutdown).
 */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  /** Map lưu trữ 3 connection pools: main, voice, pbx */
  private readonly pools: Record<DatabaseConnectionName, Pool>;

  /**
   * Constructor - Inject 3 MySQL connection pools từ DI container
   *
   * @Inject(MAIN_DB) → NestJS inject pool đã tạo trong DatabaseModule cho MAIN_DB token
   * @Inject(VOICE_DB) → pool cho voice database
   * @Inject(PBX_DB) → pool cho PBX database
   */
  constructor(
    @Inject(MAIN_DB) main: Pool,
    @Inject(VOICE_DB) voice: Pool,
    @Inject(PBX_DB) pbx: Pool,
  ) {
    // Lưu các pool vào map để truy cập bằng tên connection
    this.pools = { main, voice, pbx };
  }

  /**
   * query - Thực thi SQL query trên database được chỉ định
   *
   * Phương thức chính để thực thi query. Hỗ trợ generic type để type-safe kết quả.
   *
   * @template T - Kiểu dữ liệu trả về (mặc định: RowDataPacket[])
   * @param connection - Tên kết nối: 'main' | 'voice' | 'pbx'
   * @param sql - Câu SQL query (hỗ trợ placeholder ? hoặc :name)
   * @param params - Tham số cho prepared statement (chống SQL injection)
   * @returns Promise<T> - Mảng kết quả query
   *
   * @example
   * // Query đơn giản
   * const users = await this.database.query('main', 'SELECT * FROM users');
   *
   * // Query với prepared statement (chống SQL injection)
   * const user = await this.database.query('main',
   *   'SELECT * FROM users WHERE email = ? AND status = ?',
   *   ['admin@test.com', 'active']
   * );
   *
   * // Query trên voice database
   * const calls = await this.database.query('voice',
   *   'SELECT * FROM cdr WHERE calldate BETWEEN ? AND ?',
   *   ['2024-01-01', '2024-01-31']
   * );
   */
  async query<T extends RowDataPacket[] = RowDataPacket[]>(
    connection: DatabaseConnectionName,
    sql: string,
    params?: unknown,
  ): Promise<T> {
    // Lấy pool tương ứng và thực thi query
    // Destructure [rows] vì mysql2 trả về [rows, fields]
    const [rows] = await this.pools[connection].query<T>(sql, params as never);
    return rows;
  }

  /**
   * pool - Lấy connection pool trực tiếp
   *
   * Sử dụng khi cần thao tác nâng cao: transaction, getConnection, execute, ...
   *
   * @param connection - Tên kết nối: 'main' | 'voice' | 'pbx'
   * @returns Pool instance của mysql2/promise
   *
   * @example
   * // Sử dụng transaction
   * const conn = await this.database.pool('main').getConnection();
   * await conn.beginTransaction();
   * // ... thực hiện nhiều query ...
   * await conn.commit();
   * conn.release();
   */
  pool(connection: DatabaseConnectionName) {
    return this.pools[connection];
  }

  /**
   * onModuleDestroy - Lifecycle hook: đóng tất cả connection khi app shutdown
   *
   * NestJS gọi method này khi ứng dụng đang tắt (graceful shutdown).
   * Đảm bảo tất cả MySQL connection được giải phóng đúng cách,
   * tránh connection leak.
   */
  async onModuleDestroy() {
    // Đóng tất cả pools song song bằng Promise.all
    await Promise.all(Object.values(this.pools).map((pool) => pool.end()));
  }
}
