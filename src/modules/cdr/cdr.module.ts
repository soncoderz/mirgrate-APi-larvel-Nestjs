import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CdrController } from './cdr.controller';
import { CdrService } from './cdr.service';
import { CdrEntity } from './entities/cdr.entity';

@Module({
  imports: [
    // CDR sử dụng kết nối voice_server_1 (database riêng)
    TypeOrmModule.forFeature([CdrEntity], 'voice_server_1'),
  ],
  controllers: [CdrController],
  providers: [CdrService],
  exports: [CdrService],
})
export class CdrModule {}
