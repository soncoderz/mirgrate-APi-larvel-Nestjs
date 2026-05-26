/**
 * =============================================================================
 * connector.controller.ts - Controller API Connector cho hệ thống bên ngoài
 * =============================================================================
 *
 * Controller xử lý các request từ hệ thống bên ngoài (PBX, CRM, Asterisk, ...)
 * thông qua ConnectorGuard (JWT hoặc X-Custom-Token hoặc bypass).
 *
 * Tương đương với nhóm route 'connector' trong Laravel routes/api.php:
 * Route::prefix('connector')->middleware('jwt.or.header')->group(...)
 *
 * @Controller('connector') → prefix: /api/connector/...
 * @UseGuards(ConnectorGuard) → Xác thực bằng JWT hoặc Custom Token
 */

import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { ConnectorGuard } from "../../common/guards/connector.guard";
import { MigrationStubService } from "../../common/services/migration-stub.service";
import { CdrService } from "../cdr/cdr.service";
import { GroupsService } from "../groups/groups.service";
import { UsersService } from "../users/users.service";

/** Type mở rộng Request với thông tin user từ JWT payload */
type RequestWithUser = Request & { user?: Record<string, unknown> };

/**
 * Map tên action → tên method Laravel gốc cho QueueLog endpoints
 * Dùng để route động: POST /api/connector/queuelog/:action
 *
 * Key: tên action trên URL
 * Value: tên method trong QueueLogController của Laravel
 */
const queueLogActionMap: Record<string, string> = {
  reportBySummary: "reportBySummary",
  reportByQueues: "reportByQueues",
  reportDistributionDetailed: "reportDistributionDetailed",
  getQueueLog: "getQueueLog",
  reportAnsweredServiceLevel: "reportAnsweredServiceLevel",
  reportAnsweredByQueues: "reportAnsweredByQueues",
  reportAnsweredByAgents: "reportAnsweredByAgents",
  reportAnsweredByQueuesAgents: "reportAnsweredByQueuesAgents",
  reportAnsweredDisconnectionCause: "reportAnsweredDisconnectionCause",
  reportAnsweredByCallLength: "reportAnsweredByCallLength",
  reportAnsweredCallsDetail: "reportAnsweredCallsDetail",
  reportTransfer: "reportTransfer",
  reportByYear: "reportByYear",
  reportServiceCallCenter: "reportServiceCallCenter",
  reportKPI: "reportKPI",
  exportCustomData: "exportCustomData",
  reportAbandonServiceLevel: "reportAbandonServiceLevel",
  reportUnAnsweredDisconnectionCause: "reportUnAnsweredDisconnectionCause",
  reportUnAnsweredByQueues: "reportUnAnsweredByQueues",
  reportRingNoAnsweredByAgents: "reportRingNoAnsweredByAgents",
  reportUnAnsweredCallsDetail: "reportUnAnsweredCallsDetail",
  reportAgentAvailability: "reportAgentAvailability",
  reportAgentSessionAndPause: "reportAgentSessionAndPause",
  reportRecallsOnAnsweredCalls: "reportRecallsOnAnsweredCalls",
  reportListOfRecallClusters: "reportListOfRecallClusters",
  reportCallsDetailByCallerIds: "reportCallsDetailByCallerIds",
  reportRecallDetailsOnAnsweredCalls: "reportRecallDetailsOnAnsweredCalls",
  reportDistributionQueuesByDate: "reportDistributionQueuesByDate",
  exportExcel: "exportReportQueue",
  exportReport: "exportReport",
  exportReportv2: "exportReport",
  reportQueueAgentAction: "reportQueueAgentAction",
  reportDetailAgentAction: "reportDetailAgentAction",
  reportQueueAgentKPI: "reportQueueAgentKPI",
  reportDetailAgent: "reportDetailAgent",
  exportQueueLogDetail: "exportQueueLogDetail",
  reportSummaryAgentAction: "reportSummaryAgentAction",
  reportQueueLogMissCall: "reportQueueLogMissCall",
  reportQueueLogMissCallDetail: "reportQueueLogMissCallDetail",
  reportQueueLogMissCallToday: "reportQueueLogMissCallToday",
  reportSummaryQueueLogMissCallToday: "reportSummaryQueueLogMissCallToday",
  updateQueueLogMissCallToday: "updateQueueLogMissCallToday",
  reportAgentKPI: "reportAgentKPI",
  reportAgentSummary: "reportAgentSummary",
  reportAgentKPIByDate: "reportAgentKPIByDate",
};

@Controller("connector")
@UseGuards(ConnectorGuard)
export class ConnectorController {
  constructor(
    private readonly stub: MigrationStubService,   // Tạo response cho endpoint chưa migrate
    private readonly groups: GroupsService,         // Logic quản lý group (đã migrate)
    private readonly users: UsersService,           // Logic quản lý user (đã migrate)
    private readonly cdr: CdrService,               // Logic báo cáo CDR (đã migrate)
  ) {}

  // ==========================================================================
  // Route đã MIGRATE (logic hoàn chỉnh)
  // ==========================================================================

  /**
   * GET /api/connector/groupBySecret/:secret
   * Lấy thông tin group bằng secret key
   *
   * Tương đương: GroupsController@getGroupBySecret trong Laravel
   * Hỗ trợ cả có và không có param :secret trên URL
   */
  @Get(["groupBySecret", "groupBySecret/:secret"])
  getGroupBySecret(@Param("secret") secret?: string) {
    return this.groups.getGroupBySecret(secret);
  }

  /**
   * POST /api/connector/usersByExt
   * Lấy thông tin user theo extension number
   *
   * Tương đương: UsersController@getUserInfoByExtension trong Laravel
   */
  @Post("usersByExt")
  usersByExt(
    @Body() body: Record<string, unknown>,
    @Req() request: RequestWithUser,
  ) {
    return this.users.getUserInfoByExtension(body, request.user);
  }

  /**
   * POST /api/connector/cdr/getStaticCalls
   * Lấy thống kê cuộc gọi (tổng hợp)
   *
   * Tương đương: CdrController@getStaticCalls trong Laravel (qua connector)
   */
  @Post("cdr/getStaticCalls")
  getStaticCalls(@Body() body: Record<string, unknown>) {
    return this.cdr.getStaticCalls(body);
  }

  /**
   * POST /api/connector/cdr/getCalls
   * Lấy danh sách cuộc gọi chi tiết
   *
   * Tương đương: CdrController@getCalls trong Laravel (qua connector)
   */
  @Post("cdr/getCalls")
  getCalls(@Body() body: Record<string, unknown>) {
    return this.cdr.getCalls(body);
  }

  // ==========================================================================
  // Route CHƯA MIGRATE (trả về HTTP 501)
  // ==========================================================================

  /**
   * GET /api/connector/queuelog/reportDistributionDetailedByCallid/:callid
   * Báo cáo chi tiết phân phối cuộc gọi theo callid - CHƯA MIGRATE
   *
   * Tương đương: QueueLogController@reportDistributionDetailedByCallid trong Laravel
   */
  @Get("queuelog/reportDistributionDetailedByCallid/:callid")
  reportDistributionDetailedByCallid(@Param("callid") callid: string) {
    return this.stub.notMigrated({
      controller: "QueueLogController",
      action: "reportDistributionDetailedByCallid",
      method: "GET",
      path: "/api/connector/queuelog/reportDistributionDetailedByCallid/{callid}",
      params: { callid },
    });
  }

  /**
   * POST /api/connector/queuelog/:action
   * Route động cho tất cả QueueLog endpoints - CHƯA MIGRATE
   *
   * Dùng dynamic routing: URL chứa tên action, tra cứu trong queueLogActionMap.
   * Nếu action không tồn tại → trả 404.
   * Nếu tồn tại → trả 501 (chưa migrate).
   *
   * Tương đương: QueueLogController@{action} trong Laravel
   */
  @Post("queuelog/:action")
  queueLogPost(
    @Param("action") action: string,
    @Body() body: Record<string, unknown>,
  ) {
    // Tra cứu action trong map để kiểm tra route có tồn tại trong Laravel không
    const laravelAction = queueLogActionMap[action];
    if (!laravelAction) {
      throw new NotFoundException({
        success: false,
        message: `Connector QueueLog endpoint ${action} is not registered in Laravel routes/api.php`,
      });
    }

    return this.stub.notMigrated({
      controller: "QueueLogController",
      action: laravelAction,
      method: "POST",
      path: `/api/connector/queuelog/${action}`,
      body,
    });
  }
}
