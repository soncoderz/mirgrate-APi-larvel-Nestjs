import { Module } from '@nestjs/common';
import { QueueLogController } from './queuelog.controller';
import { QueueLogService } from './queuelog.service';

@Module({
  controllers: [QueueLogController],
  providers: [QueueLogService],
  exports: [QueueLogService],
})
export class QueueLogModule {}
