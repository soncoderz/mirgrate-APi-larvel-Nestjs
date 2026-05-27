/**
 * =============================================================================
 * exports.module.ts - Module xuất file (Export)
 * =============================================================================
 *
 * Module xử lý download/export file.
 * Tương đương: ExportController trong Laravel
 */

import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';

@Module({
  imports: [CommonModule],          // Cần MigrationStubService cho endpoint chưa migrate
  controllers: [ExportsController], // Controller xử lý route export
  providers: [ExportsService],      // Service placeholder
})
export class ExportsModule {}
