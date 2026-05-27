/**
 * =============================================================================
 * customers.controller.ts - Controller quản lý khách hàng (Customer)
 * =============================================================================
 *
 * Xử lý tất cả route liên quan đến khách hàng:
 * - CRUD khách hàng (thêm, sửa, xóa, tìm kiếm)
 * - Import/Export (Excel, CSV)
 * - Custom fields (trường tùy chỉnh)
 * - Tags (nhãn)
 * - Tích hợp bên ngoài (Zalo, ACBS)
 *
 * Tất cả endpoint CHƯA MIGRATE - trả về HTTP 501.
 *
 * Tương đương: CustomersController trong Laravel
 * @UseGuards(JwtAuthGuard) → Yêu cầu đăng nhập
 * @Controller('v1') → prefix: /api/v1/...
 */

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MigrationStubService } from '../../common/services/migration-stub.service';

@Controller('v1')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly stub: MigrationStubService) {}

  /**
   * Tạo response "NOT_MIGRATED" cho endpoint chưa chuyển
   * Helper method nội bộ để giảm lặp code
   */
  private notMigrated(
    action: string,
    method: string,
    path: string,
    body?: unknown,
    params?: unknown,
  ) {
    return this.stub.notMigrated({
      controller: 'CustomersController',
      action,
      method,
      path,
      body,
      params,
    });
  }

  // ==========================================================================
  // CRUD Khách hàng - Tất cả CHƯA MIGRATE
  // ==========================================================================

  /** GET /api/v1/customer/:userId - Lấy khách hàng theo ID */
  @Get('customer/:userId')
  getCustomerByID(@Param('userId') userId: string) {
    return this.notMigrated(
      'getCustomerByID', 'GET', '/api/v1/customer/{userId}', undefined, { userId },
    );
  }

  /** GET /api/v1/customers/latest - Lấy khách hàng mới nhất */
  @Get('customers/latest')
  getLatestCustomer() {
    return this.notMigrated('getLatestCustomer', 'GET', '/api/v1/customers/latest');
  }

  /** POST /api/v1/customers - Danh sách khách hàng (có filter + pagination) */
  @Post('customers')
  getCustomers(@Body() body: Record<string, unknown>) {
    return this.notMigrated('getCustomers', 'POST', '/api/v1/customers', body);
  }

  /** POST /api/v1/addCustomerAndNote - Thêm khách hàng kèm ghi chú */
  @Post('addCustomerAndNote')
  addCustomerAndNote(@Body() body: Record<string, unknown>) {
    return this.notMigrated('addCustomerAndNote', 'POST', '/api/v1/addCustomerAndNote', body);
  }

  /** POST /api/v1/addCustomerByExcel - Import khách hàng từ Excel */
  @Post('addCustomerByExcel')
  addCustomerByExcel(@Body() body: Record<string, unknown>) {
    return this.notMigrated('addCustomerByExcel', 'POST', '/api/v1/addCustomerByExcel', body);
  }

  /** POST /api/v1/addCustomer - Thêm khách hàng mới */
  @Post('addCustomer')
  addCustomer(@Body() body: Record<string, unknown>) {
    return this.notMigrated('addCustomer', 'POST', '/api/v1/addCustomer', body);
  }

  /** GET /api/v1/duplicateCustomer/:id - Nhân bản khách hàng */
  @Get('duplicateCustomer/:id')
  duplicateCustomer(@Param('id') id: string) {
    return this.notMigrated(
      'duplicateCustomer', 'GET', '/api/v1/duplicateCustomer/{id}', undefined, { id },
    );
  }

  /** POST /api/v1/importFile - Import file dữ liệu khách hàng */
  @Post('importFile')
  downloadFile(@Body() body: Record<string, unknown>) {
    return this.notMigrated('downloadFile', 'POST', '/api/v1/importFile', body);
  }

  /** POST /api/v1/exportCustomer - Xuất danh sách khách hàng */
  @Post('exportCustomer')
  exportCustomer(@Body() body: Record<string, unknown>) {
    return this.notMigrated('exportCustomer', 'POST', '/api/v1/exportCustomer', body);
  }

  // ==========================================================================
  // Tích hợp bên ngoài
  // ==========================================================================

  /** POST /api/v1/addCustomerAcbs - Thêm khách hàng từ ACBS (ngân hàng) */
  @Post('addCustomerAcbs')
  addCustomerAcbs(@Body() body: Record<string, unknown>) {
    return this.notMigrated('addCustomerAcbs', 'POST', '/api/v1/addCustomerAcbs', body);
  }

  /** POST /api/v1/addCustomerNew - Thêm khách hàng mới (phiên bản mới) */
  @Post('addCustomerNew')
  addCustomerNew(@Body() body: Record<string, unknown>) {
    return this.notMigrated('addCustomerNew', 'POST', '/api/v1/addCustomerNew', body);
  }

  /** POST /api/v1/addCusByZalo - Thêm khách hàng từ Zalo */
  @Post('addCusByZalo')
  addCusByZalo(@Body() body: Record<string, unknown>) {
    return this.notMigrated('addCusByZalo', 'POST', '/api/v1/addCusByZalo', body);
  }

  // ==========================================================================
  // Custom Fields (Trường tùy chỉnh)
  // ==========================================================================

  /** POST /api/v1/customersField - Lấy danh sách trường tùy chỉnh */
  @Post('customersField')
  getCustomerField(@Body() body: Record<string, unknown>) {
    return this.notMigrated('getCustomerField', 'POST', '/api/v1/customersField', body);
  }

  /** POST /api/v1/addCustomerField - Thêm trường tùy chỉnh mới */
  @Post('addCustomerField')
  addCustomerField(@Body() body: Record<string, unknown>) {
    return this.notMigrated('addCustomerField', 'POST', '/api/v1/addCustomerField', body);
  }

  /** PUT /api/v1/updateCustomerField - Cập nhật trường tùy chỉnh */
  @Put('updateCustomerField')
  updateCustomerField(@Body() body: Record<string, unknown>) {
    return this.notMigrated('updateCustomerField', 'PUT', '/api/v1/updateCustomerField', body);
  }

  /** PUT /api/v1/deleteCustomerField - Xóa trường tùy chỉnh */
  @Put('deleteCustomerField')
  deleteCustomerField(@Body() body: Record<string, unknown>) {
    return this.notMigrated('deleteCustomerField', 'PUT', '/api/v1/deleteCustomerField', body);
  }

  /** PUT /api/v1/updateDefaultView - Cập nhật view mặc định */
  @Put('updateDefaultView')
  updateDefaultView(@Body() body: Record<string, unknown>) {
    return this.notMigrated('updateDefaultView', 'PUT', '/api/v1/updateDefaultView', body);
  }

  /** POST /api/v1/updateCustomerFieldData - Cập nhật dữ liệu trường tùy chỉnh */
  @Post('updateCustomerFieldData')
  updateCustomerFieldData(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      'updateCustomerFieldData', 'POST', '/api/v1/updateCustomerFieldData', body,
    );
  }

  // ==========================================================================
  // Cập nhật & Xóa khách hàng
  // ==========================================================================

  /** POST /api/v1/updateCustomerV2 - Cập nhật khách hàng phiên bản 2 */
  @Post('updateCustomerV2')
  updateCustomerV2(@Body() body: Record<string, unknown>) {
    return this.notMigrated('updateCustomerV2', 'POST', '/api/v1/updateCustomerV2', body);
  }

  /** POST /api/v1/updateCustomer - Cập nhật thông tin khách hàng */
  @Post('updateCustomer')
  updateCustomer(@Body() body: Record<string, unknown>) {
    return this.notMigrated('updateCustomer', 'POST', '/api/v1/updateCustomer', body);
  }

  /** GET /api/v1/removeCustomer/:id - Xóa 1 khách hàng */
  @Get('removeCustomer/:id')
  removeCustomer(@Param('id') id: string) {
    return this.notMigrated(
      'removeCustomer', 'GET', '/api/v1/removeCustomer/{id}', undefined, { id },
    );
  }

  /** PUT /api/v1/removeCustomers - Xóa nhiều khách hàng */
  @Put('removeCustomers')
  removeCustomers(@Body() body: Record<string, unknown>) {
    return this.notMigrated('removeCustomers', 'PUT', '/api/v1/removeCustomers', body);
  }

  /** PUT /api/v1/updateCustomerTags/:id - Cập nhật tags cho khách hàng */
  @Put('updateCustomerTags/:id')
  updateCustomerTags(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.notMigrated('updateCustomerTags', 'PUT', '/api/v1/updateCustomerTags/{id}', body, { id });
  }

  // ==========================================================================
  // Tìm kiếm
  // ==========================================================================

  /** GET /api/v1/getCustomerByPhone/:phone - Tìm khách hàng theo số điện thoại */
  @Get('getCustomerByPhone/:phone')
  getCustomerByPhone(@Param('phone') phone: string) {
    return this.notMigrated(
      'getCustomerByPhone', 'GET', '/api/v1/getCustomerByPhone/{phone}', undefined, { phone },
    );
  }

  /** GET /api/v1/getInfoCustomerAcbs/:phone - Lấy thông tin khách hàng ACBS theo SĐT */
  @Get('getInfoCustomerAcbs/:phone')
  getInfoCustomerAcbs(@Param('phone') phone: string) {
    return this.notMigrated(
      'getInfoCustomerAcbs', 'GET', '/api/v1/getInfoCustomerAcbs/{phone}', undefined, { phone },
    );
  }
}
