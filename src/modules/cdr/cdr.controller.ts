/**
 * =============================================================================
 * cdr.controller.ts - Controller báo cáo CDR (Call Detail Record)
 * =============================================================================
 *
 * Xử lý các route liên quan đến dữ liệu cuộc gọi (CDR):
 * - Danh sách cuộc gọi (getCalls) - ĐÃ MIGRATE
 * - Thống kê cuộc gọi (getStaticCalls, getStaticCallsv2) - ĐÃ MIGRATE
 * - Lịch sử cuộc gọi chi tiết (getCallsLog) - ĐÃ MIGRATE
 * - Báo cáo theo năm (reportByYear) - ĐÃ MIGRATE
 * - Tìm kiếm extension (searchExtensions) - ĐÃ MIGRATE
 * - Giá cước (getProviderPrefix) - ĐÃ MIGRATE
 * - Nhiều báo cáo khác - CHƯA MIGRATE (trả về 501)
 *
 * Sử dụng 2 pattern:
 * 1. Route cố định: getCalls, getStaticCalls, getStaticCallsv2, exportExcelv2
 * 2. Dynamic route: POST /api/v1/cdr/:action (protected bởi JwtAuthGuard)
 *    → tra cứu action trong protectedActionMap
 *
 * Tương đương: CdrController trong Laravel
 * Prefix: /api/v1/cdr/...
 */

import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MigrationStubService } from "../../common/services/migration-stub.service";
import { CdrService } from "./cdr.service";

const protectedActionMap: Record<string, string> = {
  getCallsLog: "getCallsLog",
  getStaticCallsLog: "getStaticCalls",
  reportByYear: "reportByYear",
  getCallDetail: "getCallDetail",
  getStaticCallDetail: "getStaticCallDetail",
  getVoiceBoxCalls: "getVoiceBoxCalls",
  getPostmanCalls: "getPostmanCalls",
  getStaticPostmanCalls: "getStaticPostmanCalls",
  reportAnsweredOutbound: "reportAnsweredOutbound",
  reportAnsweredInbound: "reportAnsweredInbound",
  reportAnsweredInboundDetail: "reportAnsweredInboundDetail",
  searchExtensions: "searchExtensions",
  reportSummaryCalls: "reportSummaryCalls",
  getCSATSummary: "getCSATSummary",
  getCSATDetail: "getCSATDetail",
  reportOutboundByAgents: "reportOutboundByAgents",
  reportOutboundByDates: "reportOutboundByDates",
  reportBilling: "reportBilling",
  reportSummaryAgentCallInOut: "reportSummaryAgentCallInOut",
  getFavouriteCalls: "getFavouriteCallsv2",
  reportInOut: "reportInOut",
  getCSATSummaryv2: "getCSATSummaryv2",
  getCSATDetailv2: "getCSATDetailv2",
  exportExcelv3: "exportExcelv3",
  exportExcelByFastExcel: "exportExcelByFastExcel",
  getCallsOvertime: "getCallsOvertime",
  getProviderPrefix: "getProviderPrefix",
  reportDepartment: "reportDepartment",
  getQueuePerformance: "getQueuePerformance",
  getIntervalTrend: "getIntervalTrend",
  getAgentPerformance: "getAgentPerformance",
  getAgentStatus: "getAgentStatus",
  reportBillingRate: "reportBillingRate",
  reportCallZCC: "reportCallZCC",
  transferDataToHistory: "transferDataToHistory",
  exportBilling: "exportBilling",
  exportExcelData: "exportExcelData",
  exportExcelFile: "exportExcelFile",
  reportDidSummary: "reportDidSummary",
  reportDidByCallLength: "reportDidByCallLength",
  reportAgentSummary: "reportAgentSummary",
  exportExcelReportKPI: "exportExcelReportKPI",
};

@Controller("v1/cdr")
export class CdrController {
  constructor(
    private readonly stub: MigrationStubService,
    private readonly cdr: CdrService,
  ) {}

  private notMigrated(action: string, path: string, body?: unknown) {
    return this.stub.notMigrated({
      controller: "CdrController",
      action,
      method: "POST",
      path,
      body,
    });
  }

  @Post("getCalls")
  getCalls(@Body() body: Record<string, unknown>) {
    return this.cdr.getCalls(body);
  }

  @Post("getStaticCalls")
  getStaticCalls(@Body() body: Record<string, unknown>) {
    return this.cdr.getStaticCalls(body);
  }

  @Post("getStaticCallsv2")
  getStaticCallsv2(@Body() body: Record<string, unknown>) {
    return this.cdr.getStaticCallsv2(body);
  }

  @Post("exportExcelv2")
  exportExcelv2(@Body() body: Record<string, unknown>) {
    return this.notMigrated("exportExcelv2", "/api/v1/cdr/exportExcelv2", body);
  }

  @Post(":action")
  @UseGuards(JwtAuthGuard)
  protectedPost(
    @Param("action") action: string,
    @Body() body: Record<string, unknown>,
  ) {
    const laravelAction = protectedActionMap[action];
    if (!laravelAction) {
      throw new NotFoundException({
        success: false,
        message: `CDR endpoint ${action} is not registered in Laravel routes/api.php`,
      });
    }

    switch (action) {
      case "getCallsLog":
        return this.cdr.getCallsLog(body);
      case "getStaticCallsLog":
        return this.cdr.getStaticCalls(body);
      case "reportByYear":
        return this.cdr.reportByYear(body);
      case "searchExtensions":
        return this.cdr.searchExtensions(body);
      case "getProviderPrefix":
        return this.cdr.getProviderPrefix(body);
      default:
        return this.notMigrated(laravelAction, `/api/v1/cdr/${action}`, body);
    }
  }
}
