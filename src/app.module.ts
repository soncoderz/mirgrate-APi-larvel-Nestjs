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
import { AuthModule } from "./modules/auth/auth.module";
import { CdrModule } from "./modules/cdr/cdr.module";
import { ConnectorModule } from "./modules/connector/connector.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { ExportsModule } from "./modules/exports/exports.module";
import { GroupsModule } from "./modules/groups/groups.module";
import { IvrInboundModule } from "./modules/ivr-inbound/ivr-inbound.module";
import { QueueLogsModule } from "./modules/queue-logs/queue-logs.module";
import { UsersModule } from "./modules/users/users.module";
import { UserTypesModule } from "./modules/user-types/user-types.module";
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

    AuthModule,       // Xử lý đăng nhập/đăng xuất (route: login, logout, forgotPassword, ...)
    UsersModule,      // Quản lý user (route: users, updateUser, deleteUser, ...)
    GroupsModule,     // Quản lý group/company (route: groups, addGroup, ...)
    CustomersModule,  // Quản lý khách hàng (route: customers, addCustomer, ...)
    CdrModule,        // Báo cáo cuộc gọi CDR (route: cdr/getCalls, cdr/getStaticCalls, ...)
    QueueLogsModule,  // Báo cáo hàng đợi (route: queuelog/reportByQueues, ...)
    IvrInboundModule, // Cấu hình IVR inbound (route: ivr_inbound/getIVRInboundDID, ...)
    UserTypesModule,  // Quản lý loại user (route: userTypes, insertUserType, ...)
    ExportsModule,    // Download/export file (route: export/:fileName, ...)
    ConnectorModule,  // API connector cho hệ thống ngoài (route: connector/...)
  ],

  // Controller gốc - xử lý route test cơ bản
  controllers: [AppController],
})
export class AppModule {}
