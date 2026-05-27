/**
 * =============================================================================
 * login.dto.ts - Data Transfer Object cho API đăng nhập
 * =============================================================================
 *
 * DTO (Data Transfer Object) định nghĩa cấu trúc dữ liệu mà client gửi lên.
 * Kết hợp với ValidationPipe (đăng ký trong main.ts), class-validator
 * tự động validate dữ liệu trước khi đến controller.
 *
 * Tương đương với Form Request trong Laravel:
 * class LoginRequest extends FormRequest {
 *     public function rules() {
 *         return [
 *             'email' => 'required|email',
 *             'password' => 'required|string',
 *         ];
 *     }
 * }
 */

import { IsEmail, IsOptional, IsString } from 'class-validator';

/**
 * LoginDto - DTO cho request đăng nhập
 *
 * Được sử dụng trong AuthController.login() để validate body:
 * - email: bắt buộc, phải đúng format email
 * - password: bắt buộc, phải là string
 * - remember_token: tùy chọn (nếu có → tạo token dài hạn)
 */
export class LoginDto {
  /** Email đăng nhập - bắt buộc, phải đúng format email (VD: user@example.com) */
  @IsEmail()
  email: string;

  /** Mật khẩu - bắt buộc, phải là string */
  @IsString()
  password: string;

  /** Token ghi nhớ đăng nhập - tùy chọn, nếu có → token sẽ không hết hạn */
  @IsOptional()
  remember_token?: unknown;
}
