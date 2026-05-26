/**
 * =============================================================================
 * customers.module.ts - Module quản lý khách hàng
 * =============================================================================
 *
 * Module quản lý khách hàng: CRUD, import/export, custom fields.
 * Tương đương: CustomersController trong Laravel
 */

import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [CommonModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
