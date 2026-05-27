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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { MigrationStubService } from "../../common/services/migration-stub.service";
import {
  AddUserAsMemberOfCompanyBody,
  UpdateUserBody,
  UserIdParams,
  UsersQueryBody,
  addUserAsMemberOfCompanySchema,
  requestUserPayloadSchema,
  updateUserSchema,
  userIdParamSchema,
  usersQuerySchema,
} from "./schemas/users.schemas";
import { UsersService } from "./users.service";

/** Type mở rộng Request với thông tin user từ JWT payload */
type RequestWithUser = Request & { user?: Record<string, unknown> };

@Controller("v1")
@UseGuards(JwtAuthGuard)
export class UsersController {
  /**
   * Zod pipe này dùng riêng cho payload JWT đã được `JwtAuthGuard` gắn vào
   * `request.user`. Các decorator như `@Body()` hoặc `@Param()` không chạy trên
   * giá trị này, nên controller phải validate thủ công trước khi đưa vào service.
   */
  private readonly requestUserPipe = new ZodValidationPipe(
    requestUserPayloadSchema,
  );

  constructor(
    private readonly stub: MigrationStubService,
    private readonly users: UsersService,
  ) {}

  private parseRequestUser(request: RequestWithUser) {
    // Khi bật JWT_ALLOW_UNAUTHENTICATED=true ở local, guard có thể cho qua mà
    // không gắn `request.user`; service hiện vẫn xử lý được trường hợp undefined.
    return request.user
      ? (this.requestUserPipe.transform(request.user) as Record<
          string,
          unknown
        >)
      : undefined;
  }

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

  /**
   * GET /api/v1/me
   * Lấy thông tin chi tiết của người dùng hiện tại đang đăng nhập
   *
   * @param request - Request chứa thông tin payload của user từ JWT
   * @returns Thông tin user đã được sanitize, kèm theo thông tin group và các đặc quyền
   *
   * Tương đương: UsersController@me trong Laravel (phiên bản đã đăng nhập)
   */
  @Get("me")
  me(@Req() request: RequestWithUser) {
    return this.users.me(this.parseRequestUser(request));
  }

  /**
   * POST /api/v1/users
   * Lấy danh sách người dùng có phân trang, hỗ trợ tìm kiếm, lọc và sắp xếp
   *
   * @param body - Điều kiện tìm kiếm, lọc, phân trang (recordsOnPage, current_page, search, ...)
   * @param request - Request chứa payload người dùng hiện tại
   * @returns Danh sách user đã phân trang theo chuẩn Laravel (data, links, meta)
   *
   * Tương đương: UsersController@getUsers trong Laravel
   */
  @Post("users")
  @HttpCode(200)
  getUsers(
    // Validate các tham số phân trang/lọc/sắp xếp ngay ở boundary controller.
    // Service chỉ còn tập trung build query và xử lý nghiệp vụ.
    @Body(new ZodValidationPipe(usersQuerySchema)) body: UsersQueryBody,
    @Req() request: RequestWithUser,
  ) {
    return this.users.getUsers(body, this.parseRequestUser(request), request);
  }

  /**
   * POST /api/v1/usersByRole
   * Lấy danh sách người dùng lọc theo vai trò (role)
   *
   * @param body - { role: string }
   * @param request - Request chứa payload người dùng hiện tại
   * @returns Danh sách người dùng thỏa mãn điều kiện lọc theo role
   *
   * Tương đương: UsersController@getUsersByRole trong Laravel
   */
  @Post("usersByRole")
  @HttpCode(200)
  getUsersByRole(
    @Body() body: Record<string, unknown>,
    @Req() request: RequestWithUser,
  ) {
    return this.users.getUsersByRole(body, request.user);
  }

  /**
   * POST /api/v1/usersByExt
   * Lấy thông tin chi tiết người dùng dựa vào số máy lẻ (extension)
   *
   * @param body - { extension: string }
   * @param request - Request chứa payload người dùng hiện tại
   * @returns Chi tiết người dùng sở hữu extension đó
   *
   * Tương đương: UsersController@getUserInfoByExtension trong Laravel
   */
  @Post("usersByExt")
  @HttpCode(200)
  getUserInfoByExtension(
    @Body() body: Record<string, unknown>,
    @Req() request: RequestWithUser,
  ) {
    return this.users.getUserInfoByExtension(body, request.user);
  }

  /**
   * GET /api/v1/user/:id
   * Lấy chi tiết thông tin của một người dùng theo ID cụ thể
   *
   * @param id - ID của người dùng cần xem chi tiết
   * @returns Chi tiết user đã được ẩn trường password
   *
   * Tương đương: UsersController@getUserByID trong Laravel
   */
  @Get("user/:id")
  getUserByID(
    // Validate toàn bộ param object để `id` luôn là số hợp lệ trước khi gọi service.
    @Param(new ZodValidationPipe(userIdParamSchema)) params: UserIdParams,
  ) {
    return this.users.getUserByID(String(params.id));
  }

  /**
   * POST /api/v1/updateUser
   * Cập nhật thông tin người dùng (bao gồm tải ảnh đại diện lên)
   *
   * @param body - Các thông tin cập nhật của user
   * @param avatar - File ảnh đại diện mới tải lên (nếu có)
   * @param request - Request chứa payload người dùng thực hiện cập nhật
   * @returns Thông tin user sau khi cập nhật thành công
   *
   * Tương đương: UsersController@updateUser trong Laravel
   */
  @Post("updateUser")
  @HttpCode(200)
  @UseInterceptors(FileInterceptor("avatar"))
  updateUser(
    // Với multipart/form-data, Nest parse file qua interceptor; phần text fields
    // vẫn nằm trong body và được Zod kiểm tra trước khi update database.
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserBody,
    @UploadedFile() avatar: any,
    @Req() request: RequestWithUser,
  ) {
    return this.users.updateUser(body, this.parseRequestUser(request), avatar);
  }

  /**
   * POST /api/v1/updateUserInfoByField
   * Cập nhật nhanh một trường cụ thể của người dùng (is_webRTC hoặc is_receive_chat)
   *
   * @param body - { user_id: number, is_webRTC?: boolean, is_receive_chat?: boolean }
   * @returns Trạng thái thành công hoặc thất bại của quá trình update
   *
   * Tương đương: UsersController@updateUserInfoByField trong Laravel
   */
  @Post("updateUserInfoByField")
  @HttpCode(200)
  updateUserInfoByField(@Body() body: Record<string, unknown>) {
    return this.users.updateUserInfoByField(body);
  }

  /**
   * POST /api/v1/addUserAsMemberOfCompany
   * Thêm một thành viên mới vào group/công ty (hỗ trợ upload avatar)
   *
   * @param body - Thông tin thành viên mới tạo
   * @param avatar - File avatar được upload kèm theo (nếu có)
   * @param request - Request chứa payload người dùng thực hiện tạo
   * @returns ID của người dùng mới được tạo dưới dạng { success: { id } }
   *
   * Tương đương: UsersController@addUserAsMemberOfCompany trong Laravel
   */
  @Post("addUserAsMemberOfCompany")
  @HttpCode(200)
  @UseInterceptors(FileInterceptor("avatar"))
  addUserAsMemberOfCompany(
    // Schema này kiểm tra các field bắt buộc khi tạo user trong công ty; file
    // avatar được validate riêng trong service vì cần kiểm tra extension/buffer.
    @Body(new ZodValidationPipe(addUserAsMemberOfCompanySchema))
    body: AddUserAsMemberOfCompanyBody,
    @UploadedFile() avatar: any,
    @Req() request: RequestWithUser,
  ) {
    return this.users.addUserAsMemberOfCompany(
      body,
      this.parseRequestUser(request),
      avatar,
    );
  }

  /**
   * POST /api/v1/getUserNameByAgentsView
   * Tra cứu tên và mã agent từ danh sách mã agent (agents view)
   *
   * @param body - { list_agents: string | string[] } - Danh sách agent cần lấy tên
   * @returns Bản đồ chứa thông tin agent được ánh xạ dạng key-value
   *
   * Tương đương: UsersController@getUserNameByAgentsView trong Laravel
   */
  @Post("getUserNameByAgentsView")
  @HttpCode(200)
  getUserNameByAgentsView(@Body() body: Record<string, unknown>) {
    return this.users.getUserNameByAgentsView(body);
  }

  /**
   * POST /api/v1/getUserModuleShow
   * Lấy cấu hình các module được phép hiển thị cho user - CHƯA MIGRATE
   *
   * Tương đương: UsersController@getUserModuleShow trong Laravel
   */
  @Post("getUserModuleShow")
  getUserModuleShow(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "getUserModuleShow",
      "POST",
      "/api/v1/getUserModuleShow",
      body,
    );
  }

  /**
   * POST /api/v1/getUsersByGroupId
   * Lấy danh sách người dùng trong một group cụ thể, nhóm theo số máy lẻ (extension)
   *
   * @param body - { groupId: number, all?: boolean }
   * @returns Map các user với key là extension (hoặc danh sách phẳng nếu all = true)
   *
   * Tương đương: UsersController@getUsersByGroupId trong Laravel
   */
  @Post("getUsersByGroupId")
  @HttpCode(200)
  getUsersByGroupId(@Body() body: Record<string, unknown>) {
    return this.users.getUsersByGroupId(body);
  }

  /**
   * POST /api/v1/getHistory
   * Xem lịch sử thao tác của người dùng - CHƯA MIGRATE
   *
   * Tương đương: UsersController@getHistory trong Laravel
   */
  @Post("getHistory")
  getHistory(@Body() body: Record<string, unknown>) {
    return this.notMigrated("getHistory", "POST", "/api/v1/getHistory", body);
  }

  /**
   * POST /api/v1/duplicatePrivilege
   * Sao chép phân quyền từ user này sang user khác - CHƯA MIGRATE
   *
   * Tương đương: UsersController@duplicatePrivilege trong Laravel
   */
  @Post("duplicatePrivilege")
  duplicatePrivilege(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "duplicatePrivilege",
      "POST",
      "/api/v1/duplicatePrivilege",
      body,
    );
  }

  /**
   * POST /api/v1/exportPrivilege
   * Xuất danh sách phân quyền của các user ra file Excel - CHƯA MIGRATE
   *
   * Tương đương: UsersController@exportPrivilege trong Laravel
   */
  @Post("exportPrivilege")
  exportPrivilege(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "exportPrivilege",
      "POST",
      "/api/v1/exportPrivilege",
      body,
    );
  }

  /**
   * POST /api/v1/unsetUserAvatar
   * Xóa ảnh đại diện hiện tại của người dùng - CHƯA MIGRATE
   *
   * Tương đương: UsersController@unsetUserAvatar trong Laravel
   */
  @Post("unsetUserAvatar")
  unsetUserAvatar(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "unsetUserAvatar",
      "POST",
      "/api/v1/unsetUserAvatar",
      body,
    );
  }

  /**
   * POST /api/v1/getConfigTrunkPDS
   * Lấy danh sách cấu hình trung kế PDS - CHƯA MIGRATE
   *
   * Tương đương: UsersController@getConfigTrunkPDS trong Laravel
   */
  @Post("getConfigTrunkPDS")
  getConfigTrunkPDS(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "getConfigTrunkPDS",
      "POST",
      "/api/v1/getConfigTrunkPDS",
      body,
    );
  }

  /**
   * POST /api/v1/insertConfigTrunkPDS
   * Thêm cấu hình trung kế PDS mới - CHƯA MIGRATE
   *
   * Tương đương: UsersController@insertConfigTrunkPDS trong Laravel
   */
  @Post("insertConfigTrunkPDS")
  insertConfigTrunkPDS(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "insertConfigTrunkPDS",
      "POST",
      "/api/v1/insertConfigTrunkPDS",
      body,
    );
  }

  /**
   * POST /api/v1/updateConfigTrunkPDS
   * Cập nhật cấu hình trung kế PDS - CHƯA MIGRATE
   *
   * Tương đương: UsersController@updateConfigTrunkPDS trong Laravel
   */
  @Post("updateConfigTrunkPDS")
  updateConfigTrunkPDS(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "updateConfigTrunkPDS",
      "POST",
      "/api/v1/updateConfigTrunkPDS",
      body,
    );
  }

  /**
   * POST /api/v1/deleteConfigTrunkPDS
   * Xóa cấu hình trung kế PDS - CHƯA MIGRATE
   *
   * Tương đương: UsersController@deleteConfigTrunkPDS trong Laravel
   */
  @Post("deleteConfigTrunkPDS")
  deleteConfigTrunkPDS(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "deleteConfigTrunkPDS",
      "POST",
      "/api/v1/deleteConfigTrunkPDS",
      body,
    );
  }

  /**
   * POST /api/v1/getBlackList
   * Lấy danh sách số điện thoại trong danh sách đen (Blacklist) - CHƯA MIGRATE
   *
   * Tương đương: UsersController@getBlackList trong Laravel
   */
  @Post("getBlackList")
  getBlackList(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "getBlackList",
      "POST",
      "/api/v1/getBlackList",
      body,
    );
  }

  /**
   * POST /api/v1/insertBlackList
   * Thêm số điện thoại vào danh sách đen - CHƯA MIGRATE
   *
   * Tương đương: UsersController@insertBlackList trong Laravel
   */
  @Post("insertBlackList")
  insertBlackList(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "insertBlackList",
      "POST",
      "/api/v1/insertBlackList",
      body,
    );
  }

  /**
   * POST /api/v1/updateBlackList
   * Cập nhật số điện thoại trong danh sách đen - CHƯA MIGRATE
   *
   * Tương đương: UsersController@updateBlackList trong Laravel
   */
  @Post("updateBlackList")
  updateBlackList(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "updateBlackList",
      "POST",
      "/api/v1/updateBlackList",
      body,
    );
  }

  /**
   * POST /api/v1/deleteBlackList
   * Xóa số điện thoại khỏi danh sách đen - CHƯA MIGRATE
   *
   * Tương đương: UsersController@deleteBlackList trong Laravel
   */
  @Post("deleteBlackList")
  deleteBlackList(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "deleteBlackList",
      "POST",
      "/api/v1/deleteBlackList",
      body,
    );
  }

  /**
   * POST /api/v1/importBlackList
   * Import danh sách đen từ file Excel - CHƯA MIGRATE
   *
   * Tương đương: UsersController@importBlackList trong Laravel
   */
  @Post("importBlackList")
  importBlackList(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "importBlackList",
      "POST",
      "/api/v1/importBlackList",
      body,
    );
  }

  /**
   * POST /api/v1/getUserTeam
   * Lấy danh sách team/nhóm trực thuộc của người dùng
   *
   * @returns Mảng danh sách team (Hiện tại Laravel trả về rỗng mặc định)
   *
   * Tương đương: UsersController@getUserTeam trong Laravel
   */
  @Post("getUserTeam")
  @HttpCode(200)
  getUserTeam(@Body() body: Record<string, unknown>) {
    return this.users.getUserTeam();
  }

  /**
   * POST /api/v1/UpsertUserTeam
   * Thêm mới hoặc cập nhật thông tin team cho người dùng - CHƯA MIGRATE
   *
   * Tương đương: UsersController@UpsertUserTeam trong Laravel
   */
  @Post("UpsertUserTeam")
  upsertUserTeam(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "UpsertUserTeam",
      "POST",
      "/api/v1/UpsertUserTeam",
      body,
    );
  }

  /**
   * POST /api/v1/deleteTeam
   * Xóa team của người dùng - CHƯA MIGRATE
   *
   * Tương đương: UsersController@deleteTeam trong Laravel
   */
  @Post("deleteTeam")
  deleteTeam(@Body() body: Record<string, unknown>) {
    return this.notMigrated("deleteTeam", "POST", "/api/v1/deleteTeam", body);
  }

  /**
   * POST /api/v1/deleteUser
   * Thực hiện xóa mềm một người dùng (chuyển status thành 'trash' và ghi log)
   *
   * @param body - { id: number } - ID của user cần xóa
   * @param request - Request chứa payload người dùng thực hiện xóa
   * @returns Trạng thái thành công của tác vụ
   *
   * Tương đương: UsersController@removeUser trong Laravel
   */
  @Post("deleteUser")
  @HttpCode(200)
  removeUser(
    @Body() body: Record<string, unknown>,
    @Req() request: RequestWithUser,
  ) {
    return this.users.removeUser(body, request.user);
  }

  /**
   * POST /api/v1/deleteUsers
   * Thực hiện xóa mềm hàng loạt nhiều người dùng
   *
   * @param body - { list_id: number[] | string } - Mảng ID hoặc chuỗi ID ngăn cách bởi dấu phẩy
   * @param request - Request chứa payload người dùng thực hiện xóa
   * @returns Trạng thái thành công của tác vụ
   *
   * Tương đương: UsersController@removeUsers trong Laravel
   */
  @Post("deleteUsers")
  @HttpCode(200)
  removeUsers(
    @Body() body: Record<string, unknown>,
    @Req() request: RequestWithUser,
  ) {
    return this.users.removeUsers(body, request.user);
  }

  /**
   * GET /api/v1/duplicateUser/:id
   * Nhân bản thông tin và phân quyền từ một người dùng sẵn có
   *
   * @param id - ID của người dùng nguồn cần nhân bản
   * @param request - Request chứa payload người dùng thực hiện nhân bản
   * @returns Trạng thái thành công kèm theo ID của user mới
   *
   * Tương đương: UsersController@duplicateUser trong Laravel
   */
  @Get("duplicateUser/:id")
  duplicateUser(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.users.duplicateUser(id, request.user);
  }

  /**
   * POST /api/v1/getUserLogs
   * Lấy lịch sử đăng nhập/đăng xuất của hệ thống (phân trang và lọc)
   *
   * @param body - Lọc logs theo username, thời gian hoặc phân trang
   * @param request - Request chứa thông tin user thực hiện xem log
   * @returns Danh sách logs phân trang theo chuẩn Laravel
   *
   * Tương đương: UsersController@getUserLogs trong Laravel
   */
  @Post("getUserLogs")
  @HttpCode(200)
  getUserLogs(
    @Body() body: Record<string, unknown>,
    @Req() request: RequestWithUser,
  ) {
    return this.users.getUserLogs(body, request.user);
  }

  /**
   * POST /api/v1/deleteUserLog
   * Xóa một bản ghi lịch sử đăng nhập cụ thể theo ID
   *
   * @param body - { id: number } - ID của dòng log cần xóa
   * @returns Trạng thái thành công của tác vụ
   *
   * Tương đương: UsersController@deleteUserLog trong Laravel
   */
  @Post("deleteUserLog")
  @HttpCode(200)
  deleteUserLog(@Body() body: Record<string, unknown>) {
    return this.users.deleteUserLog(body);
  }

  /**
   * POST /api/v1/logoutUserManual
   * Quản trị viên bắt buộc đăng xuất một người dùng đang online (hủy online và blacklist token)
   *
   * @param body - { id: number } - ID người dùng cần kick out
   * @param request - Request chứa payload người dùng thực hiện thao tác
   * @returns Trạng thái thành công của tác vụ
   *
   * Tương đương: UsersController@logoutUserManual trong Laravel
   */
  @Post("logoutUserManual")
  @HttpCode(200)
  logoutUserManual(
    @Body() body: Record<string, unknown>,
    @Req() request: RequestWithUser,
  ) {
    return this.users.logoutUserManual(body, request.user);
  }

  /**
   * GET /api/v1/getuserLogsByGroupId/:groupId
   * Lấy lịch sử đăng nhập/đăng xuất lọc theo groupId (để xác định user đang online)
   *
   * @param groupId - ID của nhóm/công ty cần lấy log
   * @returns Danh sách log của group đó
   *
   * Tương đương: UsersController@getuserLogsByGroupId trong Laravel
   */
  @Get("getuserLogsByGroupId/:groupId")
  getuserLogsByGroupId(@Param("groupId") groupId: string) {
    return this.users.getuserLogsByGroupId(groupId);
  }

  /**
   * POST /api/v1/exportUsers
   * Xuất danh sách người dùng ra file Excel - CHƯA MIGRATE
   *
   * Tương đương: UsersController@exportUsers trong Laravel
   */
  @Post("exportUsers")
  exportUsers(@Body() body: Record<string, unknown>) {
    return this.notMigrated("exportUsers", "POST", "/api/v1/exportUsers", body);
  }
}
