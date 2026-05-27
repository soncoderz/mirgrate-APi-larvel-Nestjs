/**
 * =============================================================================
 * app.controller.ts - Controller gốc của ứng dụng
 * =============================================================================
 *
 * Controller đơn giản chứa route test cơ bản.
 * Prefix 'v1' → route: GET /api/v1/hello2
 *
 * Tương đương với route trong Laravel:
 * Route::get('/hello2', function () {
 *     return response()->json(['message' => 'Hello from API v1 hello2']);
 * });
 */

import { Controller, Get } from '@nestjs/common';

/**
 * AppController - Controller gốc
 *
 * @Controller('v1') → Tất cả route trong controller này có prefix '/v1'
 * Kết hợp với global prefix 'api' → URL đầy đủ: /api/v1/...
 */
@Controller('v1')
export class AppController {
  /**
   * Route test: GET /api/v1/hello2
   *
   * Trả về JSON đơn giản để kiểm tra API server hoạt động.
   * Đây là route public, không yêu cầu xác thực.
   *
   * @returns {{ message: string }} Object JSON với thông điệp hello
   */
  @Get('hello2')
  hello2() {
    return { message: 'Hello from API v1 hello2' };
  }
}
