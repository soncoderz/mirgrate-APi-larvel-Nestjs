/**
 * =============================================================================
 * auth.controller.ts - Controller xử lý các route xác thực (Authentication)
 * =============================================================================
 *
 * Controller này xử lý tất cả route liên quan đến xác thực:
 * - Đăng nhập (login, loginv2, loginExternal)
 * - Đăng xuất (logout, logoutv2)
 * - Quên mật khẩu (forgotPassword, changePasswordForgot)
 * - Kiểm tra token (checkToken, checkRecaptcha)
 * - Đăng ký (addUserAsCompany, addUserByExcel)
 * - Reset mật khẩu (resetPassword)
 *
 * QUAN TRỌNG: Các route trong AuthController KHÔNG yêu cầu JWT token.
 * Đây là các route public (không có @UseGuards(JwtAuthGuard)).
 *
 * Tương đương với nhóm route public trong Laravel routes/api.php:
 * Route::prefix('v1')->group(function () {
 *     Route::post('login', 'UsersController@login');
 *     Route::post('forgotPassword', 'UsersController@forgotPassword');
 *     // ...
 * });
 *
 * @Controller('v1') → prefix: /api/v1/...
 */

import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { UsersService } from "../users/users.service";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";

@Controller("v1")
export class AuthController {
  constructor(
    private readonly auth: AuthService,    // Service cho endpoint chưa migrate
    private readonly users: UsersService,  // Service chứa logic auth đã migrate
  ) {}

  // ==========================================================================
  // Route đã được MIGRATE (logic hoàn chỉnh trong UsersService)
  // ==========================================================================

  /**
   * POST /api/v1/forgotPassword
   * Xử lý yêu cầu quên mật khẩu - gửi email reset password
   *
   * @param body - { email: string } - Email cần reset mật khẩu
   * @param request - Express Request (để lấy domain referer)
   * @returns { code: 200, message: '...' } hoặc lỗi
   *
   * Tương đương: UsersController@forgotPassword trong Laravel
   */
  @Post("forgotPassword")
  @HttpCode(200)  // Luôn trả về HTTP 200 (Laravel convention)
  forgotPassword(
    @Body() body: Record<string, unknown>,
    @Req() request: Request,
  ) {
    return this.users.forgotPassword(body, request);
  }

  /**
   * POST /api/v1/checkToken
   * Kiểm tra JWT token có hợp lệ hay không
   *
   * @param body - { token?: string } - Token cần kiểm tra
   * @param request - Express Request (để lấy token từ header nếu không có trong body)
   * @returns { code: 200/401, message: '...' }
   *
   * Tương đương: UsersController@checkToken trong Laravel
   */
  @Post("checkToken")
  @HttpCode(200)
  checkToken(@Body() body: Record<string, unknown>, @Req() request: Request) {
    return this.users.checkToken(body, request);
  }

  /**
   * POST /api/v1/checkRecaptcha
   * Xác thực Google reCAPTCHA v2/v3
   *
   * @param body - { clientKey/recaptchaToken/g-recaptcha-response: string }
   * @param request - Express Request (để lấy IP client)
   * @returns { code: 200, message: 'success' } hoặc lỗi
   *
   * Tương đương: UsersController@checkRecaptcha trong Laravel
   */
  @Post("checkRecaptcha")
  @HttpCode(200)
  checkRecaptcha(
    @Body() body: Record<string, unknown>,
    @Req() request: Request,
  ) {
    return this.users.checkRecaptcha(body, request);
  }

  /**
   * POST /api/v1/changePasswordForgot
   * Đổi mật khẩu sau khi xác nhận qua email quên mật khẩu
   *
   * @param body - { token: string, email: string, password: string }
   * @param request - Express Request
   * @returns { code: 200, message: '...' } hoặc lỗi
   *
   * Tương đương: UsersController@changePasswordForgot trong Laravel
   */
  @Post("changePasswordForgot")
  @HttpCode(200)
  changePasswordForgot(
    @Body() body: Record<string, unknown>,
    @Req() request: Request,
  ) {
    return this.users.changePasswordForgot(body, request);
  }

  /**
   * POST /api/v1/getUserToken
   * Lấy JWT token bằng email + password (dùng cho API integration)
   *
   * @param body - { email: string, password: string }
   * @returns { success: { token: '...', expried_date: '...' } }
   *
   * Tương đương: UsersController@getUserToken trong Laravel
   */
  @Post("getUserToken")
  @HttpCode(200)
  getUserToken(@Body() body: Record<string, unknown>) {
    return this.users.getUserToken(body);
  }

  /**
   * POST /api/v1/login
   * Đăng nhập - route chính của ứng dụng
   *
   * Validate body bằng LoginDto (email + password bắt buộc).
   * Trả về: token, thông tin user, group, quyền hạn, ...
   *
   * @param body - LoginDto { email: string, password: string, remember_token?: any }
   * @param request - Express Request (để lấy IP client)
   * @returns { success: { token, user, group, privilege, ... } }
   *
   * Tương đương: UsersController@login trong Laravel
   */
  @Post("login")
  @HttpCode(200)
  login(@Body() body: LoginDto, @Req() request: Request) {
    return this.users.login(body, request);
  }

  /**
   * POST /api/v1/loginExternal
   * Đăng nhập từ hệ thống bên ngoài (CRM, Salesforce, ...)
   *
   * Hỗ trợ 2 cách:
   * 1. Gửi email + password → tạo token mới
   * 2. Gửi token có sẵn → xác thực và lấy thông tin user
   *
   * @param body - { email?, password?, token? }
   * @param request - Express Request
   * @returns { success: { token, user: { email, firstName, ... } } }
   *
   * Tương đương: UsersController@loginExternal trong Laravel
   */
  @Post("loginExternal")
  @HttpCode(200)
  loginExternal(
    @Body() body: Record<string, unknown>,
    @Req() request: Request,
  ) {
    return this.users.loginExternal(body, request);
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
  logout(@Body() body: Record<string, unknown>, @Req() request: Request) {
    return this.users.logout(body, request);
  }

  /**
   * POST /api/v1/addUserAsCompany
   * Đăng ký tài khoản công ty mới (tự động tạo group + user + template data)
   *
   * @param body - { email, password, groupName, firstName, lastName, ... }
   * @returns { success: { id: number } } - ID của user vừa tạo
   *
   * Tương đương: UsersController@addUserAsCompany trong Laravel
  */
  @Post("addUserAsCompany")
  @UseInterceptors(FileInterceptor("avatar"))
  addUserAsCompany(
    @Body() body: Record<string, unknown>,
    @UploadedFile() avatar: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = this.users.addUserAsCompany(body, avatar);
    return Promise.resolve(result).then((data) => {
      response.status(data && "success" in data ? 201 : 200);
      return data;
    });
  }

  /**
   * POST /api/v1/addUserByExcel
   * Import danh sách user từ file Excel
   *
   * @param body - Dữ liệu Excel đã parse
   * @returns 1 (stub - chưa hoàn thiện)
   *
   * Tương đương: UsersController@addUserByExcel trong Laravel
   */
  @Post("addUserByExcel")
  @HttpCode(200)
  addUserByExcel(@Body() body: Record<string, unknown>) {
    return this.users.addUserByExcel(body);
  }

  /**
   * POST /api/v1/resetPassword
   * Reset mật khẩu (yêu cầu mật khẩu cũ)
   *
   * @param body - { email: string, old_password: string, new_password: string }
   * @returns { code: 200, message: 'Success', alias: 'Success_Change_Password' }
   *
   * Tương đương: UsersController@resetPassword trong Laravel
   */
  @Post("resetPassword")
  @HttpCode(200)
  resetPassword(@Body() body: Record<string, unknown>) {
    return this.users.resetPassword(body);
  }

  // ==========================================================================
  // Route CHƯA MIGRATE (trả về HTTP 501 Not Implemented)
  // ==========================================================================

  /**
   * POST /api/v1/loginv2
   * Phiên bản đăng nhập v2 - CHƯA MIGRATE
   *
   * Logic Laravel gốc: UsersController@loginv3
   */
  @Post("loginv2")
  loginv2(@Body() body: LoginDto) {
    return this.auth.notMigrated("loginv3", "POST", "/api/v1/loginv2", body);
  }

  /**
   * POST /api/v1/logoutv2
   * Phiên bản đăng xuất v2 - CHƯA MIGRATE
   *
   * Logic Laravel gốc: UsersController@logoutv2
   */
  @Post("logoutv2")
  logoutv2(@Body() body: Record<string, unknown>) {
    return this.auth.notMigrated("logoutv2", "POST", "/api/v1/logoutv2", body);
  }
}
