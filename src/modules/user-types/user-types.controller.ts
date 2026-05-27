/**
 * =============================================================================
 * user-types.controller.ts - Controller quản lý loại người dùng & phân quyền
 * =============================================================================
 *
 * Xử lý CRUD cho User Types (loại người dùng) và User Privileges (quyền hạn).
 * Tất cả endpoint đều đã MIGRATE (logic hoàn chỉnh trong UserTypesService).
 *
 * Tương đương: UserTypeController trong Laravel
 * @UseGuards(JwtAuthGuard) → Yêu cầu đăng nhập cho tất cả endpoint
 * @Controller('v1') → prefix: /api/v1/...
 *
 * Endpoints:
 * - GET  /api/v1/userType/:id       → Lấy chi tiết 1 user type + privileges
 * - POST /api/v1/userTypesWithPage  → Danh sách user types có phân trang
 * - GET  /api/v1/userTypes          → Tất cả user types
 * - POST /api/v1/insertUserType     → Thêm user type mới + privileges
 * - PUT  /api/v1/updateUserType/:id → Cập nhật user type + privileges
 * - DELETE /api/v1/deleteUserType/:id → Xóa 1 user type (soft delete)
 * - POST /api/v1/deleteUserTypes    → Xóa nhiều user types (soft delete)
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { MigrationStubService } from "../../common/services/migration-stub.service";
import {
  UpsertUserTypeBody,
  upsertUserTypeSchema,
} from "./schemas/user-type.schemas";
import { UserTypesService } from "./user-types.service";

/** Type mở rộng Request với thông tin user từ JWT payload */
type RequestWithUser = Request & { user?: Record<string, unknown> };

@Controller("v1")
@UseGuards(JwtAuthGuard)
export class UserTypesController {
  constructor(
    private readonly stub: MigrationStubService,
    private readonly userTypes: UserTypesService,
  ) {}

  private notMigrated(
    action: string,
    method: string,
    path: string,
    body?: unknown,
    params?: unknown,
  ) {
    return this.stub.notMigrated({
      controller: "UserTypeController",
      action,
      method,
      path,
      body,
      params,
    });
  }

  @Get("userType/:id")
  getUserType(@Param("id") id: string) {
    return this.userTypes.getUserType(id);
  }

  @Post("userTypesWithPage")
  getUserTypesWithPage(@Body() body: Record<string, unknown>) {
    return this.userTypes.getUserTypesWithPage(body);
  }

  @Get("userTypes")
  getUserTypes() {
    return this.userTypes.getUserTypes();
  }

  @Post("insertUserType")
  insertUserType(
    @Body(new ZodValidationPipe(upsertUserTypeSchema))
    body: UpsertUserTypeBody,
    @Req() request: RequestWithUser,
  ) {
    return this.userTypes.insertUserType(body, request.user);
  }

  @Put("updateUserType/:id")
  updateUserType(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(upsertUserTypeSchema))
    body: UpsertUserTypeBody,
    @Req() request: RequestWithUser,
  ) {
    return this.userTypes.updateUserType(id, body, request.user);
  }

  @Delete("deleteUserType/:id")
  deleteUserType(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.userTypes.deleteUserType(id, request.user);
  }

  @Post("deleteUserTypes")
  deleteUserTypes(
    @Body() body: Record<string, unknown>,
    @Req() request: RequestWithUser,
  ) {
    return this.userTypes.deleteUserTypes(body, request.user);
  }
}
