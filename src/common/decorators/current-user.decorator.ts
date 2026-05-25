import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator lấy user hiện tại từ request
 * Tương đương auth()->user() hoặc Auth::user() trong Laravel
 * 
 * Sử dụng: @CurrentUser() user: User
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
