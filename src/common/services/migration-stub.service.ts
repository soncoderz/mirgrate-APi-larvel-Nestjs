/**
 * =============================================================================
 * migration-stub.service.ts - Service tạo response cho endpoint chưa migrate
 * =============================================================================
 *
 * Khi chuyển đổi (migrate) từ Laravel sang NestJS, không phải tất cả endpoint
 * đều được chuyển cùng lúc. Service này tạo response "NOT_MIGRATED" cho các
 * endpoint đã được đăng ký route nhưng logic chưa được viết.
 *
 * Khi gọi endpoint chưa migrate → trả về HTTP 501 (Not Implemented) kèm
 * thông tin chi tiết về endpoint Laravel tương ứng để developer biết cần
 * chuyển logic từ đâu.
 */

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

/**
 * StubContext - Thông tin về endpoint chưa migrate
 *
 * @property controller - Tên controller Laravel gốc (VD: 'UsersController')
 * @property action - Tên method Laravel gốc (VD: 'getUsers')
 * @property method - HTTP method (GET, POST, PUT, DELETE)
 * @property path - URL path (VD: '/api/v1/users')
 * @property params - Route parameters (nếu có)
 * @property query - Query string parameters (nếu có)
 * @property body - Request body (nếu có)
 */
type StubContext = {
  controller: string;
  action: string;
  method: string;
  path: string;
  params?: unknown;
  query?: unknown;
  body?: unknown;
};

@Injectable()
export class MigrationStubService {
  /**
   * notMigrated - Throw exception cho endpoint chưa migrate
   *
   * Khi một endpoint được gọi nhưng logic chưa được chuyển từ Laravel,
   * method này throw HttpException với status 501 (Not Implemented)
   * kèm thông tin chi tiết để developer biết cần migrate gì.
   *
   * Ví dụ response:
   * {
   *   success: false,
   *   code: "NOT_MIGRATED",
   *   message: "Endpoint is scaffolded and waiting for Laravel logic migration.",
   *   laravel: "UsersController@getHistory",
   *   method: "POST",
   *   path: "/api/v1/getHistory",
   *   body: { ... }
   * }
   *
   * @param context - Thông tin về endpoint chưa migrate
   * @throws HttpException với status 501 Not Implemented
   */
  notMigrated(context: StubContext): never {
    throw new HttpException(
      {
        success: false,
        code: 'NOT_MIGRATED',
        message: 'Endpoint is scaffolded and waiting for Laravel logic migration.',
        laravel: `${context.controller}@${context.action}`,  // VD: "UsersController@getHistory"
        method: context.method,
        path: context.path,
        params: context.params ?? {},
        query: context.query ?? {},
        body: context.body ?? {},
      },
      HttpStatus.NOT_IMPLEMENTED,  // HTTP 501
    );
  }
}
