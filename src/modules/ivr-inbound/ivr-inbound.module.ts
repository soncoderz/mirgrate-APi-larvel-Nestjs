import { Module } from '@nestjs/common';
import { IvrInboundController } from './ivr-inbound.controller';
import { IvrInboundService } from './ivr-inbound.service';

@Module({
  controllers: [IvrInboundController],
  providers: [IvrInboundService],
  exports: [IvrInboundService],
})
export class IvrInboundModule {}
