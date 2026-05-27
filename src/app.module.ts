/**
 * =============================================================================
 * app.module.ts - Module gốc (Root Module) của ứng dụng NestJS
 * =============================================================================
 *
 * Đây là module trung tâm, nơi tất cả các module con được import và kết nối.
 * Tương đương với file config/app.php (providers array) trong Laravel.
 *
 * Cấu trúc module trong NestJS:
 * - imports: Các module con được nhúng vào (giống như ServiceProvider trong Laravel)
 * - controllers: Các controller xử lý HTTP request (giống như Route::controller)
 * - providers: Các service được inject (giống như app()->bind() trong Laravel)
 */

import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CommonModule } from "./common/common.module";
import { DatabaseModule } from "./config/database.module";
import { createMysqlTypeOrmOptions } from "./config/typeorm.options";
import { UsersModule } from "./modules/users/users.module";
import { AppController } from "./app.controller";

/**
 * AppModule - Module gốc của ứng dụng
 *
 * Decorator @Module() khai báo metadata cho module:
 *
 * imports:
 * - ConfigModule.forRoot()  → Đọc file .env, cung cấp ConfigService toàn cục
 *                             (tương đương env() helper trong Laravel)
 * - CommonModule            → Module chung: guards, decorators, services tiện ích
 * - DatabaseModule          → Kết nối MySQL (main DB, voice DB, PBX DB)
 * - AuthModule              → Xác thực: login, logout, forgot password, ...
 * - UsersModule             → Quản lý người dùng: CRUD, phân quyền
 * - GroupsModule            → Quản lý nhóm/công ty
 * - CustomersModule         → Quản lý khách hàng
 * - CdrModule               → Báo cáo cuộc gọi (Call Detail Record)
 * - QueueLogsModule         → Báo cáo hàng đợi cuộc gọi
 * - IvrInboundModule        → Cấu hình IVR (Interactive Voice Response)
 * - UserTypesModule         → Quản lý loại người dùng & phân quyền
 * - ExportsModule           → Xuất file (download Excel, ...)
 * - ConnectorModule         → API connector cho hệ thống bên ngoài
 *
 * controllers:
 * - AppController           → Controller gốc, xử lý route test đơn giản
 */
@Module({
  imports: [
    // Cấu hình biến môi trường từ file .env
    // isGlobal: true → ConfigService có thể inject ở bất kỳ module nào mà không cần import lại
    // envFilePath → thứ tự ưu tiên: .env.local (dev local) > .env (default)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createMysqlTypeOrmOptions(config, {
          host: "DB_HOST",
          port: "DB_PORT",
          database: "DB_DATABASE",
          username: "DB_USERNAME",
          password: "DB_PASSWORD",
        }),
    }),

    TypeOrmModule.forRootAsync({
      name: "voice",
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createMysqlTypeOrmOptions(
          config,
          {
            host: "DB_HOST_VOICE",
            port: "DB_PORT_VOICE",
            database: "DB_DATABASE_VOICE",
            username: "DB_USERNAME_VOICE",
            password: "DB_PASSWORD_VOICE",
          },
          "voice",
        ),
    }),

    TypeOrmModule.forRootAsync({
      name: "pbx",
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createMysqlTypeOrmOptions(
          config,
          {
            host: "DB_HOST_PBX",
            port: "DB_PORT_PBX",
            database: "DB_DATABASE_PBX",
            username: "DB_USERNAME_PBX",
            password: "DB_PASSWORD_PBX",
          },
          "pbx",
        ),
    }),

    // Module chung: chứa JWT config, guards, helper services
    CommonModule,

    // Module kết nối database: tạo MySQL connection pool cho main, voice, pbx
    DatabaseModule,

    // --- Các feature module (tương đương các Controller group trong Laravel routes/api.php) ---

    UsersModule,      // Quản lý user (route: users, updateUser, deleteUser, ...)
  ],

  // Controller gốc - xử lý route test cơ bản
  controllers: [AppController],
})
export class AppModule {}
