/**
 * =============================================================================
 * users.controller.ts - Controller quản lý người dùng (Users)
 * =============================================================================
 *
 * Controller lớn nhất trong hệ thống, xử lý tất cả route liên quan đến user.
 * Tất cả route đều yêu cầu JWT (ngoại trừ auth routes trong AuthController).
 *
 * Current note: source-of-truth status is in migration-guide/8_AUTH_USER_CHECKLIST.md.
 *
 * Route ĐÃ MIGRATE (logic hoàn chỉnh):
 * - GET  /api/v1/me                   → Lấy thông tin user đang đăng nhập
 * - POST /api/v1/users                → Danh sách user có phân trang
 * - POST /api/v1/usersByRole          → Danh sách user theo role
 * - POST /api/v1/usersByExt           → Thông tin user theo extension
 * - GET  /api/v1/user/:id             → Chi tiết 1 user
 * - POST /api/v1/updateUser           → Cập nhật user
 * - POST /api/v1/addUserAsMemberOfCompany → Thêm user vào company
 * - POST /api/v1/getUsersByGroupId    → User theo groupId
 * - POST /api/v1/getUserLogs          → Lịch sử đăng nhập
 * - POST /api/v1/deleteUserLog        → Xóa log đăng nhập
 * - GET  /api/v1/getuserLogsByGroupId → Log đăng nhập theo group
 *
 * Route CHƯA MIGRATE (trả 501):
 * - updateUserInfoByField, getUserNameByAgentsView, getUserModuleShow,
 *   getHistory, duplicatePrivilege, exportPrivilege, unsetUserAvatar,
 *   getConfigTrunkPDS, insertConfigTrunkPDS, updateConfigTrunkPDS,
 *   deleteConfigTrunkPDS, getBlackList, insertBlackList, updateBlackList,
 *   deleteBlackList, importBlackList, getUserTeam, UpsertUserTeam,
 *   deleteTeam, deleteUser, deleteUsers, duplicateUser, logoutUserManual,
 *   exportUsers
 *
 * Tương đương: UsersController trong Laravel
 * @UseGuards(JwtAuthGuard) → Yêu cầu JWT cho tất cả route
 */

import {
  Body,
  Controller,
  HttpCode,
  Req,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MigrationStubService } from "../../common/services/migration-stub.service";
import { UsersService } from "./users.service";

/** Type mở rộng Request với thông tin user từ JWT payload */
type RequestWithUser = Request & { user?: Record<string, unknown> };

@Controller("v1")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly stub: MigrationStubService,
    private readonly users: UsersService,
  ) {}

  private notMigrated(
    action: string,
    method: string,
    path: string,
    body?: unknown,
    params?: unknown,
  ) {
    return this.stub.notMigrated({
      controller: "UsersController",
      action,
      method,
      path,
      body,
      params,
    });
  }

  @Get("me")
  me(@Req() request: RequestWithUser) {
    return this.users.me(request.user);
  }

  @Post("users")
  @HttpCode(200)
  getUsers(
    @Body() body: Record<string, unknown>,
    @Req() request: RequestWithUser,
  ) {
    return this.users.getUsers(body, request.user, request);
  }

  @Post("usersByRole")
  @HttpCode(200)
  getUsersByRole(
    @Body() body: Record<string, unknown>,
    @Req() request: RequestWithUser,
  ) {
    return this.users.getUsersByRole(body, request.user);
  }

  @Post("usersByExt")
  @HttpCode(200)
  getUserInfoByExtension(
    @Body() body: Record<string, unknown>,
    @Req() request: RequestWithUser,
  ) {
    return this.users.getUserInfoByExtension(body, request.user);
  }

  @Get("user/:id")
  getUserByID(@Param("id") id: string) {
    return this.users.getUserByID(id);
  }

  @Post("updateUser")
  @HttpCode(200)
  updateUser(
    @Body() body: Record<string, unknown>,
    @Req() request: RequestWithUser,
  ) {
    return this.users.updateUser(body, request.user);
  }

  @Post("updateUserInfoByField")
  @HttpCode(200)
  updateUserInfoByField(@Body() body: Record<string, unknown>) {
    return this.users.updateUserInfoByField(body);
  }

  @Post("addUserAsMemberOfCompany")
  @HttpCode(200)
  addUserAsMemberOfCompany(
    @Body() body: Record<string, unknown>,
    @Req() request: RequestWithUser,
  ) {
    return this.users.addUserAsMemberOfCompany(body, request.user);
  }

  @Post("getUserNameByAgentsView")
  @HttpCode(200)
  getUserNameByAgentsView(@Body() body: Record<string, unknown>) {
    return this.users.getUserNameByAgentsView(body);
  }

  @Post("getUserModuleShow")
  getUserModuleShow(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "getUserModuleShow",
      "POST",
      "/api/v1/getUserModuleShow",
      body,
    );
  }

  @Post("getUsersByGroupId")
  @HttpCode(200)
  getUsersByGroupId(@Body() body: Record<string, unknown>) {
    return this.users.getUsersByGroupId(body);
  }

  @Post("getHistory")
  getHistory(@Body() body: Record<string, unknown>) {
    return this.notMigrated("getHistory", "POST", "/api/v1/getHistory", body);
  }

  @Post("duplicatePrivilege")
  duplicatePrivilege(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "duplicatePrivilege",
      "POST",
      "/api/v1/duplicatePrivilege",
      body,
    );
  }

  @Post("exportPrivilege")
  exportPrivilege(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "exportPrivilege",
      "POST",
      "/api/v1/exportPrivilege",
      body,
    );
  }

  @Post("unsetUserAvatar")
  unsetUserAvatar(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "unsetUserAvatar",
      "POST",
      "/api/v1/unsetUserAvatar",
      body,
    );
  }

  @Post("getConfigTrunkPDS")
  getConfigTrunkPDS(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "getConfigTrunkPDS",
      "POST",
      "/api/v1/getConfigTrunkPDS",
      body,
    );
  }

  @Post("insertConfigTrunkPDS")
  insertConfigTrunkPDS(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "insertConfigTrunkPDS",
      "POST",
      "/api/v1/insertConfigTrunkPDS",
      body,
    );
  }

  @Post("updateConfigTrunkPDS")
  updateConfigTrunkPDS(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "updateConfigTrunkPDS",
      "POST",
      "/api/v1/updateConfigTrunkPDS",
      body,
    );
  }

  @Post("deleteConfigTrunkPDS")
  deleteConfigTrunkPDS(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "deleteConfigTrunkPDS",
      "POST",
      "/api/v1/deleteConfigTrunkPDS",
      body,
    );
  }

  @Post("getBlackList")
  getBlackList(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "getBlackList",
      "POST",
      "/api/v1/getBlackList",
      body,
    );
  }

  @Post("insertBlackList")
  insertBlackList(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "insertBlackList",
      "POST",
      "/api/v1/insertBlackList",
      body,
    );
  }

  @Post("updateBlackList")
  updateBlackList(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "updateBlackList",
      "POST",
      "/api/v1/updateBlackList",
      body,
    );
  }

  @Post("deleteBlackList")
  deleteBlackList(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "deleteBlackList",
      "POST",
      "/api/v1/deleteBlackList",
      body,
    );
  }

  @Post("importBlackList")
  importBlackList(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "importBlackList",
      "POST",
      "/api/v1/importBlackList",
      body,
    );
  }

  @Post("getUserTeam")
  @HttpCode(200)
  getUserTeam(@Body() body: Record<string, unknown>) {
    return this.users.getUserTeam();
  }

  @Post("UpsertUserTeam")
  upsertUserTeam(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "UpsertUserTeam",
      "POST",
      "/api/v1/UpsertUserTeam",
      body,
    );
  }

  @Post("deleteTeam")
  deleteTeam(@Body() body: Record<string, unknown>) {
    return this.notMigrated("deleteTeam", "POST", "/api/v1/deleteTeam", body);
  }

  @Post("deleteUser")
  @HttpCode(200)
  removeUser(
    @Body() body: Record<string, unknown>,
    @Req() request: RequestWithUser,
  ) {
    return this.users.removeUser(body, request.user);
  }

  @Post("deleteUsers")
  @HttpCode(200)
  removeUsers(
    @Body() body: Record<string, unknown>,
    @Req() request: RequestWithUser,
  ) {
    return this.users.removeUsers(body, request.user);
  }

  @Get("duplicateUser/:id")
  duplicateUser(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.users.duplicateUser(id, request.user);
  }

  @Post("getUserLogs")
  @HttpCode(200)
  getUserLogs(
    @Body() body: Record<string, unknown>,
    @Req() request: RequestWithUser,
  ) {
    return this.users.getUserLogs(body, request.user);
  }

  @Post("deleteUserLog")
  @HttpCode(200)
  deleteUserLog(@Body() body: Record<string, unknown>) {
    return this.users.deleteUserLog(body);
  }

  @Post("logoutUserManual")
  @HttpCode(200)
  logoutUserManual(
    @Body() body: Record<string, unknown>,
    @Req() request: RequestWithUser,
  ) {
    return this.users.logoutUserManual(body, request.user);
  }

  @Get("getuserLogsByGroupId/:groupId")
  getuserLogsByGroupId(@Param("groupId") groupId: string) {
    return this.users.getuserLogsByGroupId(groupId);
  }

  @Post("exportUsers")
  exportUsers(@Body() body: Record<string, unknown>) {
    return this.notMigrated("exportUsers", "POST", "/api/v1/exportUsers", body);
  }
}
