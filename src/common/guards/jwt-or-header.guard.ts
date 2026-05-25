import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * Guard JWT hoặc Custom Header - tương đương middleware 'jwt.or.header' trong Laravel
 * Dùng cho /connector/* routes:
 * - Nếu có JWT hợp lệ → pass
 * - Nếu có X-Custom-Token header → pass
 * - Không có gì → cho qua (giống behavior hiện tại của Laravel JwtOrHeader.php)
 */
@Injectable()
export class JwtOrHeaderGuard extends AuthGuard('jwt') implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    // Nếu có X-Custom-Token header thì cho qua
    if (request.headers['x-custom-token']) {
      return true;
    }

    // Thử xác thực JWT
    try {
      return super.canActivate(context) as boolean | Promise<boolean>;
    } catch {
      // JWT không hợp lệ, cho qua (giống behavior Laravel)
      return true;
    }
  }

  handleRequest(err: any, user: any) {
    // Không throw lỗi nếu JWT invalid - giống behavior Laravel JwtOrHeader.php
    if (err || !user) {
      return null;
    }
    return user;
  }
}
