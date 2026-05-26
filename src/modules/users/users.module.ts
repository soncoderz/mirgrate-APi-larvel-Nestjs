/**
 * =============================================================================
 * users.module.ts - Module quản lý người dùng (Users)
 * =============================================================================
 *
 * Module lớn nhất trong hệ thống, quản lý:
 * - CRUD người dùng (thêm, sửa, xóa, tìm kiếm)
 * - Xác thực (login, logout, JWT, forgot password)
 * - Phân quyền (user types, privileges)
 * - User logs (lịch sử đăng nhập/đăng xuất)
 *
 * Export UsersService để AuthModule và ConnectorModule tái sử dụng.
 *
 * Tương đương: UsersController trong Laravel
 */

import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module";
import { DatabaseModule } from "../../config/database.module";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
