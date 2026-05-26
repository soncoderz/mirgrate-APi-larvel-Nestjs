/**
 * =============================================================================
 * ivr-inbound.controller.ts - Controller cấu hình IVR Inbound
 * =============================================================================
 *
 * Xử lý các route cấu hình IVR (Interactive Voice Response) cho cuộc gọi đến.
 * IVR là hệ thống trả lời tự động: "Nhấn 1 để gặp nhân viên, nhấn 2 để..."
 *
 * Tất cả endpoint CHƯA MIGRATE - trả về HTTP 501.
 * Sử dụng dynamic routing: POST /api/v1/ivr_inbound/:action
 *
 * Tương đương: IvrInboundController trong Laravel
 * @UseGuards(JwtAuthGuard) → Yêu cầu đăng nhập
 */

import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MigrationStubService } from '../../common/services/migration-stub.service';

/**
 * Set chứa tất cả action hợp lệ cho IVR inbound
 * Dùng để validate :action trên URL trước khi xử lý
 */
const actionMap = new Set([
  'getIVRInboundDID',               // Lấy danh sách DID (Direct Inward Dialing)
  'getIVRInboundDIDWithPage',       // Lấy danh sách DID có phân trang
  'addEditDIDForIVRInbound',        // Thêm/sửa DID
  'getIVRInboundRecord',            // Lấy bản ghi IVR
  'getIVRInboundRecordWithPage',    // Lấy bản ghi IVR có phân trang
  'addEditRecordForIVRInbound',     // Thêm/sửa bản ghi IVR
  'getAndPlayRecord',               // Lấy và phát bản ghi âm
  'getIVRInboundInboundRoute',      // Lấy route inbound
  'addEditRouteForIVRInbound',      // Thêm/sửa route inbound
  'getIVRInboundTimeCondition',     // Lấy điều kiện thời gian
  'getTimeCondition',               // Lấy time condition
  'addEditTimeConditionForIVRInbound', // Thêm/sửa time condition
  'getTimeConditionByDID',          // Lấy time condition theo DID
  'getIVRInboundTimeGroup',         // Lấy nhóm thời gian
  'getTimeGroup',                   // Lấy time group
  'addEditTimeGroupForIVRInbound',  // Thêm/sửa time group
  'getIVRInboundIVR',               // Lấy cấu hình IVR
  'getIVR',                         // Lấy IVR
  'addEditIVRForIVRInbound',        // Thêm/sửa IVR
]);

@Controller('v1/ivr_inbound')
@UseGuards(JwtAuthGuard)
export class IvrInboundController {
  constructor(private readonly stub: MigrationStubService) {}

  /**
   * POST /api/v1/ivr_inbound/:action
   * Dynamic route handler cho tất cả IVR inbound endpoints
   *
   * Tất cả đều CHƯA MIGRATE - trả về HTTP 501
   *
   * @param action - Tên action (VD: 'getIVRInboundDID', 'addEditDIDForIVRInbound')
   * @param body - Request body
   * @throws NotFoundException nếu action không tồn tại trong actionMap
   */
  @Post(':action')
  handle(@Param('action') action: string, @Body() body: Record<string, unknown>) {
    // Kiểm tra action có hợp lệ không
    if (!actionMap.has(action)) {
      throw new NotFoundException({
        success: false,
        message: `IVR inbound endpoint ${action} is not registered in Laravel routes/api.php`,
      });
    }

    // Trả về 501 Not Implemented
    return this.stub.notMigrated({
      controller: 'IvrInboundController',
      action,
      method: 'POST',
      path: `/api/v1/ivr_inbound/${action}`,
      body,
    });
  }
}
