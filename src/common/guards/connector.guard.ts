/**
 * =============================================================================
 * connector.guard.ts - Guard xác thực cho API Connector (hệ thống bên ngoài)
 * =============================================================================
 *
 * Guard này bảo vệ các route trong ConnectorController - dành cho hệ thống
 * bên ngoài (ví dụ: phần mềm tổng đài, CRM, ...) gọi vào.
 *
 * Tương đương với middleware 'jwt.or.header' trong Laravel:
 * Route::middleware(['api', 'jwt.or.header'])->group(...)
 *
 * Cơ chế xác thực linh hoạt (fallback chain):
 * 1. Thử xác thực bằng JWT Bearer Token → nếu hợp lệ → cho qua
 * 2. Kiểm tra header 'X-Custom-Token' → nếu khớp CONNECTOR_TOKEN → cho qua
 * 3. Nếu CONNECTOR_ALLOW_UNAUTHENTICATED=true → cho qua (development mode)
 * 4. Nếu tất cả đều thất bại → throw 401 Unauthorized
 *
 * Khác với JwtAuthGuard:
 * - JwtAuthGuard: BẮT BUỘC có JWT token hợp lệ
 * - ConnectorGuard: LINH HOẠT - JWT hoặc Custom Token hoặc bypass
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

/**
 * ConnectorGuard - Guard xác thực đa cơ chế cho API connector
 *
 * Được sử dụng cho route prefix 'connector/' trong ConnectorController
 * để cho phép nhiều cách xác thực khác nhau.
 */
@Injectable()
export class ConnectorGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,  // Đọc biến môi trường
    private readonly jwt: JwtService,         // Verify JWT token
  ) {}

  /**
   * canActivate - Kiểm tra quyền truy cập theo thứ tự ưu tiên
   *
   * @param context - ExecutionContext chứa request hiện tại
   * @returns Promise<boolean> - true nếu được phép
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // --- Bước 1: Thử xác thực bằng JWT ---
    // Nếu request có header Authorization: Bearer <token> và token hợp lệ
    // → gắn payload vào request.user và cho qua
    const payload = await this.validJwtPayload(request.headers.authorization);
    if (payload) {
      request.user = payload;
      return true;
    }

    // --- Bước 2: Kiểm tra X-Custom-Token header ---
    // Dùng cho hệ thống bên ngoài không sử dụng JWT
    // Header: X-Custom-Token: <secret-token>
    const configuredToken = this.config.get<string>("CONNECTOR_TOKEN");
    const requestToken = request.headers["x-custom-token"];
    if (
      requestToken &&
      (!configuredToken || requestToken === configuredToken)
    ) {
      // Nếu CONNECTOR_TOKEN chưa được cấu hình → chấp nhận mọi token
      // Nếu đã cấu hình → phải khớp chính xác
      return true;
    }

    // --- Bước 3: Bypass cho development ---
    // Nếu CONNECTOR_ALLOW_UNAUTHENTICATED=true → cho qua mọi request
    // Mặc định là "true" → development mode luôn cho qua
    if (
      this.config.get<string>("CONNECTOR_ALLOW_UNAUTHENTICATED", "true") ===
      "true"
    ) {
      return true;
    }

    // --- Bước 4: Tất cả đều thất bại → từ chối truy cập ---
    throw new UnauthorizedException({
      success: false,
      message: "Unauthorized connector request",
    });
  }

  /**
   * validJwtPayload - Thử xác thực JWT token và trả về payload
   *
   * Khác với JwtAuthGuard.canActivate():
   * - JwtAuthGuard: throw exception nếu token sai
   * - Method này: trả về undefined nếu token sai (để fallback sang cơ chế khác)
   *
   * @param authorization - Header Authorization value
   * @returns Payload object nếu JWT hợp lệ, undefined nếu không
   */
  private async validJwtPayload(
    authorization?: string,
  ): Promise<Record<string, unknown> | undefined> {
    // Tách Bearer Token từ header
    const [type, token] = authorization?.split(" ") ?? [];
    if (type?.toLowerCase() !== "bearer" || !token) {
      return undefined;
    }

    const secret = this.config.get<string>("JWT_SECRET");
    if (!secret) {
      return undefined;
    }

    try {
      // Thử verify token - nếu thành công trả về payload
      return await this.jwt.verifyAsync<Record<string, unknown>>(token, {
        secret,
        algorithms: [this.config.get<string>("JWT_ALGO", "HS256") as never],
      });
    } catch {
      // Token không hợp lệ → trả undefined để thử cơ chế xác thực khác
      return undefined;
    }
  }
}
