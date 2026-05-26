/**
 * =============================================================================
 * database.module.ts - Module cấu hình kết nối Multi-Database
 * =============================================================================
 *
 * Module này tạo 3 MySQL Connection Pool cho 3 database khác nhau:
 * 1. MAIN_DB  → Database chính (users, groups, customers, ...)
 * 2. VOICE_DB → Database Voice Server (CDR, QueueLog - dữ liệu cuộc gọi)
 * 3. PBX_DB   → Database PBX (cấu hình tổng đài)
 *
 * Tương đương với config/database.php connections array trong Laravel:
 * 'connections' => [
 *     'mysql' => [...],           // ← MAIN_DB
 *     'voice_server_1' => [...],  // ← VOICE_DB
 *     'pbx' => [...],             // ← PBX_DB
 * ]
 *
 * Sử dụng: Import DatabaseModule → inject DatabaseService → gọi query()
 */

import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "./database.service";
import { MAIN_DB, PBX_DB, VOICE_DB } from "./database.tokens";
import { createMysqlPool } from "./mysql-pool.provider";

@Module({
  providers: [
    /**
     * Provider cho MAIN_DB - Database chính
     *
     * Đọc biến .env: DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD
     * Chứa các bảng: users, groups, customers, departments, user_types, ...
     */
    {
      provide: MAIN_DB,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createMysqlPool(config, {
          host: "DB_HOST",
          port: "DB_PORT",
          database: "DB_DATABASE",
          username: "DB_USERNAME",
          password: "DB_PASSWORD",
        }),
    },

    /**
     * Provider cho VOICE_DB - Database Voice Server
     *
     * Đọc biến .env: DB_HOST_VOICE, DB_PORT_VOICE, ...
     * Chứa các bảng: cdr, cdr_monthly, queue_log, ... (dữ liệu cuộc gọi)
     * Tương đương connection 'voice_server_1' trong Laravel
     */
    {
      provide: VOICE_DB,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createMysqlPool(config, {
          host: "DB_HOST_VOICE",
          port: "DB_PORT_VOICE",
          database: "DB_DATABASE_VOICE",
          username: "DB_USERNAME_VOICE",
          password: "DB_PASSWORD_VOICE",
        }),
    },

    /**
     * Provider cho PBX_DB - Database PBX (tổng đài)
     *
     * Đọc biến .env: DB_HOST_PBX, DB_PORT_PBX, ...
     * Chứa cấu hình tổng đài: SIP accounts, extension, ...
     */
    {
      provide: PBX_DB,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createMysqlPool(config, {
          host: "DB_HOST_PBX",
          port: "DB_PORT_PBX",
          database: "DB_DATABASE_PBX",
          username: "DB_USERNAME_PBX",
          password: "DB_PASSWORD_PBX",
        }),
    },

    // DatabaseService wrap 3 pools trên thành interface thống nhất
    DatabaseService,
  ],

  // Export DatabaseService để các module khác có thể inject và sử dụng
  exports: [DatabaseService],
})
export class DatabaseModule {}
