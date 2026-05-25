import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtOrHeaderGuard } from '../../common/guards/jwt-or-header.guard';

/**
 * ConnectorController - tương đương Route::prefix('connector') trong Laravel
 * NOTE: Prefix gốc trong Laravel là /connector/, nhưng trong NestJS
 * toàn bộ đã có global prefix /api/v1, vì vậy:
 * - Laravel: POST /connector/cdr/getCalls
 * - NestJS:  POST /api/v1/connector/cdr/getCalls
 *
 * Auth: JwtOrHeaderGuard (JWT hoặc X-Custom-Token)
 */
@ApiTags('Connector (External Integration)')
@UseGuards(JwtOrHeaderGuard)
@Controller('connector')
export class ConnectorController {
  // GET /api/v1/connector/groupBySecret/:secret
  @Get('groupBySecret/:secret?')
  @ApiOperation({ summary: '[Connector] Lấy group theo secret' })
  getGroupBySecret(@Param('secret') secret: string) {
    // TODO: delegate to GroupsService
    return { data: null, secret };
  }

  // POST /api/v1/connector/usersByExt
  @Post('usersByExt')
  @ApiOperation({ summary: '[Connector] Lấy user theo extension' })
  getUsersByExt(@Body() body: { extension: string }) {
    // TODO: delegate to UsersService
    return { data: null };
  }

  // POST /api/v1/connector/cdr/getStaticCalls
  @Post('cdr/getStaticCalls')
  @ApiOperation({ summary: '[Connector] Thống kê cuộc gọi' })
  getStaticCalls(@Body() filters: any) {
    // TODO: delegate to CdrService
    return { data: [] };
  }

  // POST /api/v1/connector/cdr/getCalls
  @Post('cdr/getCalls')
  @ApiOperation({ summary: '[Connector] Danh sách cuộc gọi' })
  getCalls(@Body() filters: any) {
    // TODO: delegate to CdrService
    return { data: [] };
  }

  // ---- Queue Log routes ----

  @Post('queuelog/reportBySummary')
  @ApiOperation({ summary: '[Connector] Báo cáo tổng hợp queue' })
  reportBySummary(@Body() filters: any) {
    return { data: [] };
  }

  @Post('queuelog/reportByQueues')
  @ApiOperation({ summary: '[Connector] Báo cáo theo queue' })
  reportByQueues(@Body() filters: any) {
    return { data: [] };
  }

  @Post('queuelog/getQueueLog')
  @ApiOperation({ summary: '[Connector] Lấy queue log' })
  getQueueLog(@Body() filters: any) {
    return { data: [] };
  }

  @Post('queuelog/reportAnsweredServiceLevel')
  @ApiOperation({ summary: '[Connector] Service level' })
  reportAnsweredServiceLevel(@Body() filters: any) {
    return { data: [] };
  }

  @Post('queuelog/reportAnsweredByQueues')
  @ApiOperation({ summary: '[Connector] Cuộc gọi trả lời theo queue' })
  reportAnsweredByQueues(@Body() filters: any) {
    return { data: [] };
  }

  @Post('queuelog/reportAnsweredByAgents')
  @ApiOperation({ summary: '[Connector] Cuộc gọi trả lời theo agent' })
  reportAnsweredByAgents(@Body() filters: any) {
    return { data: [] };
  }

  @Post('queuelog/reportKPI')
  @ApiOperation({ summary: '[Connector] KPI' })
  reportKPI(@Body() filters: any) {
    return { data: [] };
  }

  @Post('queuelog/reportAgentKPI')
  @ApiOperation({ summary: '[Connector] KPI agent' })
  reportAgentKPI(@Body() filters: any) {
    return { data: [] };
  }

  @Post('queuelog/reportAgentSummary')
  @ApiOperation({ summary: '[Connector] Tổng hợp agent' })
  reportAgentSummary(@Body() filters: any) {
    return { data: [] };
  }

  @Post('queuelog/exportExcel')
  @ApiOperation({ summary: '[Connector] Xuất Excel' })
  exportExcel(@Body() filters: any) {
    return { message: 'Export đang được xử lý' };
  }

  @Post('queuelog/exportReport')
  @ApiOperation({ summary: '[Connector] Xuất báo cáo' })
  exportReport(@Body() filters: any) {
    return { message: 'Export đang được xử lý' };
  }

  @Post('queuelog/reportQueueLogMissCall')
  @ApiOperation({ summary: '[Connector] Báo cáo cuộc gọi nhỡ' })
  reportQueueLogMissCall(@Body() filters: any) {
    return { data: [] };
  }

  @Post('queuelog/reportQueueLogMissCallDetail')
  @ApiOperation({ summary: '[Connector] Chi tiết cuộc gọi nhỡ' })
  reportQueueLogMissCallDetail(@Body() filters: any) {
    return { data: [] };
  }
}
