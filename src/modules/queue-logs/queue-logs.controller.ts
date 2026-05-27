/**
 * =============================================================================
 * queue-logs.controller.ts - Controller báo cáo hàng đợi cuộc gọi (Queue Log)
 * =============================================================================
 *
 * Xử lý các route báo cáo liên quan đến hàng đợi cuộc gọi (Call Queue).
 * Phần lớn endpoint CHƯA MIGRATE.
 *
 * Tương đương: QueueLogController trong Laravel
 * Prefix: /api/v1/queuelog/...
 */

import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MigrationStubService } from '../../common/services/migration-stub.service';

/**
 * Map action → method Laravel cho route protected (cần JWT)
 * Key: tên action trên URL
 * Value: tên method trong QueueLogController của Laravel
 */
const protectedActionMap: Record<string, string> = {
  reportUnAnsweredByQueues: 'reportUnAnsweredByQueues',   // Báo cáo cuộc gọi nhỡ theo queue
  exportExcelv2: 'exportExcelv2',                          // Xuất Excel v2
  getQueueLogMissCall: 'reportQueueLogMissCallDetail',    // Cuộc gọi nhỡ chi tiết
  getInboundCalls: 'getInboundCalls',                      // Lấy danh sách cuộc gọi đến
};

@Controller('v1/queuelog')
export class QueueLogsController {
  constructor(private readonly stub: MigrationStubService) {}

  /**
   * GET /api/v1/queuelog/updateNoAnswerQueueLog
   * Cập nhật trạng thái cuộc gọi không trả lời trong queue - CHƯA MIGRATE
   *
   * Route PUBLIC (không cần JWT)
   * Tương đương: QueueLogController@updateNoAnswerQueueLog trong Laravel
   */
  @Get('updateNoAnswerQueueLog')
  updateNoAnswerQueueLog() {
    return this.stub.notMigrated({
      controller: 'QueueLogController',
      action: 'updateNoAnswerQueueLog',
      method: 'GET',
      path: '/api/v1/queuelog/updateNoAnswerQueueLog',
    });
  }

  /**
   * POST /api/v1/queuelog/:action
   * Dynamic route handler cho tất cả QueueLog endpoints - CHƯA MIGRATE
   *
   * @UseGuards(JwtAuthGuard) → Yêu cầu đăng nhập
   *
   * @param action - Tên action (VD: 'reportUnAnsweredByQueues', 'getInboundCalls')
   * @param body - Request body
   * @throws NotFoundException nếu action không có trong protectedActionMap
   */
  @Post(':action')
  @UseGuards(JwtAuthGuard)
  protectedPost(@Param('action') action: string, @Body() body: Record<string, unknown>) {
    const laravelAction = protectedActionMap[action];
    if (!laravelAction) {
      throw new NotFoundException({
        success: false,
        message: `QueueLog endpoint ${action} is not registered in /api/v1/queuelog routes.`,
      });
    }

    return this.stub.notMigrated({
      controller: 'QueueLogController',
      action: laravelAction,
      method: 'POST',
      path: `/api/v1/queuelog/${action}`,
      body,
    });
  }
}
