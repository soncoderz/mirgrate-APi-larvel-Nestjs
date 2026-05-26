/**
 * =============================================================================
 * mysql-pool.provider.ts - Factory function tạo MySQL Connection Pool
 * =============================================================================
 *
 * Tạo MySQL connection pool sử dụng mysql2/promise.
 * Connection pool giúp tái sử dụng kết nối, tránh chi phí tạo connection mới
 * mỗi lần query → tăng performance đáng kể.
 *
 * Tương đương với cấu hình database connection trong config/database.php Laravel.
 */

import { ConfigService } from "@nestjs/config";
import { createPool, Pool } from "mysql2/promise";

/**
 * MysqlEnvMap - Mapping tên biến môi trường cho 1 kết nối MySQL
 *
 * Mỗi database connection cần 5 biến .env:
 * - host: địa chỉ server (VD: DB_HOST, DB_HOST_VOICE)
 * - port: cổng MySQL (VD: DB_PORT, DB_PORT_VOICE)
 * - database: tên database (VD: DB_DATABASE, DB_DATABASE_VOICE)
 * - username: tên đăng nhập (VD: DB_USERNAME, DB_USERNAME_VOICE)
 * - password: mật khẩu (VD: DB_PASSWORD, DB_PASSWORD_VOICE)
 */
type MysqlEnvMap = {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
};

/**
 * createMysqlPool - Tạo MySQL Connection Pool từ biến môi trường
 *
 * Đọc thông tin kết nối từ file .env thông qua ConfigService,
 * sau đó tạo connection pool với các cấu hình tối ưu.
 *
 * @param config - NestJS ConfigService để đọc biến .env
 * @param env - Mapping tên biến .env cho connection này
 * @returns MySQL Connection Pool (mysql2/promise)
 *
 * @example
 * // Tạo pool cho main database:
 * createMysqlPool(config, {
 *   host: 'DB_HOST',        // → đọc giá trị DB_HOST từ .env
 *   port: 'DB_PORT',        // → đọc giá trị DB_PORT từ .env
 *   database: 'DB_DATABASE', // → đọc giá trị DB_DATABASE từ .env
 *   username: 'DB_USERNAME', // → đọc giá trị DB_USERNAME từ .env
 *   password: 'DB_PASSWORD', // → đọc giá trị DB_PASSWORD từ .env
 * })
 */
export function createMysqlPool(config: ConfigService, env: MysqlEnvMap): Pool {
  return createPool({
    host: config.get<string>(env.host, "127.0.0.1"),        // Mặc định: localhost
    port: Number(config.get<string>(env.port, "3306")),     // Mặc định: 3306
    database: config.get<string>(env.database, ""),          // Tên database
    user: config.get<string>(env.username, "root"),          // Mặc định: root
    password: config.get<string>(env.password, ""),           // Mặc định: rỗng

    // --- Cấu hình Pool ---
    waitForConnections: true,   // Chờ khi pool đầy (thay vì throw error)
    connectionLimit: 10,        // Tối đa 10 connection đồng thời
    timezone: "Z",              // Sử dụng UTC timezone
    dateStrings: true,          // Match Laravel JSON: YYYY-MM-DD HH:mm:ss thay vi ISO Date
    namedPlaceholders: true,    // Cho phép dùng :name thay vì ? trong query
  });
}
