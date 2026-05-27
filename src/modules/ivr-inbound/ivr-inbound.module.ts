/**
 * =============================================================================
 * ivr-inbound.module.ts - Module IVR Inbound
 * =============================================================================
 *
 * Module quản lý cấu hình IVR (Interactive Voice Response).
 * Tương đương: IvrInboundController trong Laravel
 */

import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { IvrInboundController } from './ivr-inbound.controller';
import { IvrInboundService } from './ivr-inbound.service';

@Module({
  imports: [CommonModule],
  controllers: [IvrInboundController],
  providers: [IvrInboundService],
})
export class IvrInboundModule {}
