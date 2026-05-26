/**
 * =============================================================================
 * user-types.module.ts - Module quản lý loại người dùng & phân quyền
 * =============================================================================
 *
 * Module quản lý User Types (loại người dùng) và User Privileges (quyền hạn).
 * Mỗi user type có một bộ privileges xác định user đó được truy cập module nào.
 *
 * Tương đương: UserTypeController trong Laravel
 */

import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module";
import { DatabaseModule } from "../../config/database.module";
import { UserTypesController } from "./user-types.controller";
import { UserTypesService } from "./user-types.service";

@Module({
  imports: [
    CommonModule,    // Guards, JWT, helper services
    DatabaseModule,  // DatabaseService để query main DB
  ],
  controllers: [UserTypesController],
  providers: [UserTypesService],
})
export class UserTypesModule {}
