/**
 * =============================================================================
 * queue-logs.module.ts - Module báo cáo hàng đợi cuộc gọi
 * =============================================================================
 *
 * Module quản lý báo cáo Queue Log (hàng đợi cuộc gọi).
 * Tương đương: QueueLogController trong Laravel
 */

import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { QueueLogsController } from './queue-logs.controller';
import { QueueLogsService } from './queue-logs.service';

@Module({
  imports: [CommonModule],
  controllers: [QueueLogsController],
  providers: [QueueLogsService],
})
export class QueueLogsModule {}
