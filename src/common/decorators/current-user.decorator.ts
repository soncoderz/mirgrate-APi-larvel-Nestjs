/**
 * =============================================================================
 * current-user.decorator.ts - Custom Decorator lấy thông tin user hiện tại
 * =============================================================================
 *
 * Decorator này giúp lấy thông tin user đã được xác thực từ request.
 * Sau khi JwtAuthGuard xác thực token, thông tin user được gắn vào request.user.
 * Decorator này trích xuất user đó để inject trực tiếp vào controller method.
 *
 * Tương đương với auth()->user() hoặc $request->user() trong Laravel.
 *
 * Cách sử dụng trong controller:
 * @Get('profile')
 * getProfile(@CurrentUser() user: any) {
 *   return user; // → trả về thông tin user từ JWT payload
 * }
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentUser - Parameter Decorator
 *
 * createParamDecorator() tạo một custom decorator có thể dùng
 * trong method signature của controller.
 *
 * @param _data - Dữ liệu bổ sung truyền vào decorator (không sử dụng ở đây)
 * @param ctx - ExecutionContext chứa thông tin về request HTTP hiện tại
 * @returns Object user đã được gắn vào request bởi JwtAuthGuard
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    // Chuyển context sang HTTP context để lấy request object
    const request = ctx.switchToHttp().getRequest();

    // Trả về user đã được JwtAuthGuard gắn vào request
    // Nếu chưa xác thực, request.user sẽ là undefined
    return request.user;
  },
);
