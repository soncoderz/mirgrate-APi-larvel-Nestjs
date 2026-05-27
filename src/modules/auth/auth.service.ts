/**
 * =============================================================================
 * auth.service.ts - Service xử lý xác thực (Authentication)
 * =============================================================================
 *
 * Service chứa logic xác thực chưa được migrate từ Laravel.
 * Các method đã migrate thực tế nằm trong UsersService (login, logout, ...).
 * Service này chỉ xử lý các endpoint chưa migrate bằng MigrationStubService.
 *
 * Tương đương với phần chưa migrate của UsersController.php trong Laravel.
 */

import { Injectable } from '@nestjs/common';
import { MigrationStubService } from '../../common/services/migration-stub.service';

@Injectable()
export class AuthService {
  constructor(private readonly stub: MigrationStubService) {}

  /**
   * notMigrated - Tạo response "NOT_MIGRATED" cho endpoint auth chưa chuyển
   *
   * Khi một endpoint auth được gọi nhưng logic chưa được viết trong NestJS,
   * method này delegate sang MigrationStubService để throw 501 Not Implemented.
   *
   * @param action - Tên method Laravel gốc (VD: 'loginv3', 'logoutv2')
   * @param method - HTTP method (VD: 'POST')
   * @param path - URL path (VD: '/api/v1/loginv2')
   * @param body - Request body (để log/debug)
   */
  notMigrated(action: string, method: string, path: string, body?: unknown) {
    return this.stub.notMigrated({
      controller: 'UsersController',  // Controller Laravel gốc
      action,
      method,
      path,
      body,
    });
  }
}
