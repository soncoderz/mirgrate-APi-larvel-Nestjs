/**
 * =============================================================================
 * jwt-auth.guard.ts - Guard xác thực JWT (JSON Web Token)
 * =============================================================================
 *
 * Guard này bảo vệ các route yêu cầu đăng nhập.
 * Nó kiểm tra Bearer Token trong header Authorization và xác thực tính hợp lệ.
 *
 * Tương đương với middleware 'jwt.auth' trong Laravel:
 * Route::middleware(['api', 'jwt.auth'])->group(...)
 *
 * Luồng xác thực:
 * 1. Kiểm tra biến JWT_ALLOW_UNAUTHENTICATED (bypass cho development)
 * 2. Trích xuất Bearer Token từ header Authorization
 * 3. Xác thực token bằng JWT_SECRET
 * 4. Nếu hợp lệ → gắn payload (thông tin user) vào request.user
 * 5. Nếu không hợp lệ → throw UnauthorizedException (401)
 *
 * Cách sử dụng trong controller:
 * @UseGuards(JwtAuthGuard)
 * @Get('protected-route')
 * protectedRoute() { ... }
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtBlacklistService } from '../services/jwt-blacklist.service';

/**
 * JwtAuthGuard - Guard xác thực JWT bắt buộc
 *
 * Implements CanActivate interface → phải có method canActivate()
 * Trả về true → cho phép truy cập, false/throw → chặn truy cập
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,  // Đọc biến môi trường
    private readonly jwt: JwtService,         // Verify/decode JWT token
    private readonly blacklist: JwtBlacklistService,
  ) {}

  /**
   * canActivate - Kiểm tra xem request có được phép truy cập route không
   *
   * @param context - ExecutionContext chứa thông tin request hiện tại
   * @returns Promise<boolean> - true nếu được phép, throw exception nếu không
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Kiểm tra biến JWT_ALLOW_UNAUTHENTICATED - bypass xác thực cho development/testing
    // Khi set JWT_ALLOW_UNAUTHENTICATED=true trong .env → tất cả request đều được cho qua
    if (this.config.get<string>('JWT_ALLOW_UNAUTHENTICATED') === 'true') {
      return true;
    }

    // Lấy request object từ HTTP context
    const request = context.switchToHttp().getRequest();

    // Trích xuất Bearer Token từ header: "Authorization: Bearer <token>"
    const token = this.extractBearerToken(request.headers.authorization);

    // Nếu không có token → trả về lỗi 401 Unauthorized
    if (!token) {
      throw new UnauthorizedException({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (this.blacklist.isInvalidated(token)) {
      throw new UnauthorizedException({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new UnauthorizedException({
        success: false,
        message: 'JWT secret is not configured',
      });
    }

    try {
      // Xác thực token bằng JWT_SECRET
      // Nếu hợp lệ → verifyAsync trả về payload (thông tin user đã encode trong token)
      // Payload thường chứa: { sub: userId, email, role, groupId, ... }
      request.user = await this.jwt.verifyAsync(token, {
        secret,
        algorithms: [this.config.get<string>('JWT_ALGO', 'HS256') as never],
      });
      return true;
    } catch {
      // Token hết hạn, bị thay đổi, hoặc sai format → trả về lỗi 401
      throw new UnauthorizedException({
        success: false,
        message: 'Invalid or expired token',
      });
    }
  }

  /**
   * extractBearerToken - Trích xuất token từ header Authorization
   *
   * Header format: "Bearer eyJhbGciOiJIUzI1NiIs..."
   * → Tách lấy phần token sau "Bearer "
   *
   * @param authorization - Giá trị header Authorization (có thể undefined)
   * @returns Token string hoặc undefined nếu không tìm thấy
   */
  private extractBearerToken(authorization?: string): string | undefined {
    if (!authorization) {
      return undefined;
    }

    // Tách header thành 2 phần: [type, token]
    // Ví dụ: "Bearer abc123" → ["Bearer", "abc123"]
    const [type, token] = authorization.split(' ');

    // Chỉ chấp nhận type "bearer" (case-insensitive)
    return type?.toLowerCase() === 'bearer' ? token : undefined;
  }
}
