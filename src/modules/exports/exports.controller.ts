/**
 * =============================================================================
 * exports.controller.ts - Controller xuất file (Download/Export)
 * =============================================================================
 *
 * Xử lý các route download file (Excel, CSV, ...).
 * Tất cả endpoint CHƯA MIGRATE - trả về HTTP 501.
 *
 * Tương đương: ExportController trong Laravel
 * @Controller('v1') → prefix: /api/v1/...
 */

import { Controller, Get, Param } from '@nestjs/common';
import { MigrationStubService } from '../../common/services/migration-stub.service';

@Controller('v1')
export class ExportsController {
  constructor(private readonly stub: MigrationStubService) {}

  /**
   * GET /api/v1/export/:fileName
   * Download file đã export (Excel, CSV, ...) - CHƯA MIGRATE
   *
   * @param fileName - Tên file cần download
   * Tương đương: ExportController@download trong Laravel
   */
  @Get('export/:fileName')
  download(@Param('fileName') fileName: string) {
    return this.stub.notMigrated({
      controller: 'ExportController',
      action: 'download',
      method: 'GET',
      path: '/api/v1/export/{fileName}',
      params: { fileName },
    });
  }

  /**
   * GET /api/v1/exportExample/:type
   * Download file mẫu (template) theo loại - CHƯA MIGRATE
   *
   * @param type - Loại file mẫu (VD: 'users', 'customers')
   * Tương đương: ExportController@exportExample trong Laravel
   */
  @Get('exportExample/:type')
  exportExample(@Param('type') type: string) {
    return this.stub.notMigrated({
      controller: 'ExportController',
      action: 'exportExample',
      method: 'GET',
      path: '/api/v1/exportExample/{type}',
      params: { type },
    });
  }
}
