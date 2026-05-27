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
 * - POST /api/v1/checkToken           → Kiểm tra token theo logic UsersController@me
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
import {
  AddUserAsMemberOfCompanyBody,
  addUserAsMemberOfCompanySchema,
} from "./dto/create-user.dto";
import {
  UpdateUserBody,
  updateUserSchema,
} from "./dto/update-user.dto";
import {
  LoginBody,
  loginSchema,
  LogoutBody,
  logoutSchema,
  requestUserPayloadSchema,
} from "./dto/auth.dto";
import {
  UserIdParams,
  UsersQueryBody,
  userIdParamSchema,
  usersQuerySchema,
} from "./dto/query.dto";
import { UsersService } from "./users.service";

/** Type mở rộng Request với thông tin user từ JWT payload */
type RequestWithUser = Request & { user?: Record<string, unknown> };

@Controller("v1")
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

  /**
   * POST /api/v1/login
   * Đăng nhập - route chính của ứng dụng
   *
   * @param body - { email: string, password: string, remember_token?: any }
   * @param request - Express Request (để lấy IP client)
   * @returns { success: { token, user, group, privilege, ... } }
   *
   * Tương đương: UsersController@login trong Laravel
   */
  @Post("login")
  @HttpCode(200)
  login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginBody,
    @Req() request: Request,
  ) {
    return this.users.login(body, request);
  }

  /**
   * POST /api/v1/logout
   * Đăng xuất - cập nhật trạng thái offline và ghi log
   *
   * @param body - { id?: number } - ID của user_log record
   * @param request - Express Request (để lấy token từ header)
   * @returns { message: 'Logout success', code: 200 }
   *
   * Tương đương: UsersController@logout trong Laravel
   */
  @Post("logout")
  @HttpCode(200)
  logout(
    @Body(new ZodValidationPipe(logoutSchema)) body: LogoutBody,
    @Req() request: Request,
  ) {
    return this.users.logout(body, request);
  }

  /**
   * POST /api/v1/checkToken
   * Kiểm tra token theo logic Laravel UsersController@me
   *
   * @param request - Express Request chứa token trong Authorization, query token hoặc body token
   * @returns { message, code } theo đúng response của Laravel me()
   *
   * Tương đương: route Laravel `checkToken` map tới UsersController@me
   */
  @Post("checkToken")
  @HttpCode(200)
  checkToken(@Req() request: Request) {
    return this.users.checkToken(request);
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  getUsers(
    // Validate các tham số phân trang/lọc/sắp xếp ngay ở boundary controller.
    // Service chỉ còn tập trung build query và xử lý nghiệp vụ.
    @Body(new ZodValidationPipe(usersQuerySchema)) body: UsersQueryBody,
    @Req() request: RequestWithUser,
  ) {
    return this.users.getUsers(body, this.parseRequestUser(request), request);
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
}
