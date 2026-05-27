/**
 * =============================================================================
 * cdr.module.ts - Module báo cáo CDR (Call Detail Record)
 * =============================================================================
 *
 * Module quản lý dữ liệu và báo cáo cuộc gọi.
 * Import DatabaseModule để query trực tiếp vào voice database (bảng cdr, cdr_monthly).
 * Export CdrService để ConnectorModule có thể tái sử dụng.
 *
 * Tương đương: CdrController trong Laravel
 */

import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module";
import { DatabaseModule } from "../../config/database.module";
import { CdrController } from "./cdr.controller";
import { CdrService } from "./cdr.service";

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [CdrController],
  providers: [CdrService],
  exports: [CdrService],
})
export class CdrModule {}
