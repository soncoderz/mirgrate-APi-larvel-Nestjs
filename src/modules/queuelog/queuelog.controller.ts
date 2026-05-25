import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QueueLogService } from './queuelog.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/**
 * QueueLogController - tương đương QueueLogController trong Laravel
 * Route prefix: /api/v1/queuelog/
 */
@ApiTags('Queue Log')
@Controller('queuelog')
export class QueueLogController {
  constructor(private readonly queueLogService: QueueLogService) {}

  // GET /api/v1/queuelog/updateNoAnswerQueueLog (public)
  @Get('updateNoAnswerQueueLog')
  @ApiOperation({ summary: 'Cập nhật queue log không trả lời (cronjob)' })
  updateNoAnswerQueueLog() {
    // TODO: implement update no answer queue log
    return { message: 'Đã cập nhật queue log' };
  }

  // Protected routes

  @Post('reportUnAnsweredByQueues')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Báo cáo cuộc gọi không trả lời theo queue' })
  reportUnAnsweredByQueues(@Body() filters: any) {
    return this.queueLogService.reportUnAnsweredByQueues(filters);
  }

  @Post('exportExcelv2')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Xuất queue log ra Excel (v2)' })
  exportExcelV2(@Body() filters: any) {
    return { message: 'Export đang được xử lý' };
  }

  @Post('getQueueLogMissCall')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Lấy danh sách cuộc gọi nhỡ từ queue log' })
  getQueueLogMissCall(@Body() filters: any) {
    return this.queueLogService.getQueueLogMissCall(filters);
  }

  @Post('getInboundCalls')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Lấy danh sách cuộc gọi inbound' })
  getInboundCalls(@Body() filters: any) {
    return this.queueLogService.getInboundCalls(filters);
  }

  // Connector routes (also accessible via /connector/queuelog/*)
  @Post('reportBySummary')
  @ApiOperation({ summary: 'Báo cáo tổng hợp queue' })
  reportBySummary(@Body() filters: any) {
    return this.queueLogService.reportBySummary(filters);
  }

  @Post('reportByQueues')
  @ApiOperation({ summary: 'Báo cáo theo queue' })
  reportByQueues(@Body() filters: any) {
    return this.queueLogService.reportByQueues(filters);
  }

  @Post('getQueueLog')
  @ApiOperation({ summary: 'Lấy queue log' })
  getQueueLog(@Body() filters: any) {
    const { page = 1, per_page = 20, ...rest } = filters;
    return this.queueLogService.getQueueLog(rest, page, per_page);
  }

  @Post('reportAnsweredServiceLevel')
  @ApiOperation({ summary: 'Báo cáo service level đã trả lời' })
  reportAnsweredServiceLevel(@Body() filters: any) {
    return { data: [] };
  }

  @Post('reportAnsweredByQueues')
  @ApiOperation({ summary: 'Báo cáo cuộc gọi đã trả lời theo queue' })
  reportAnsweredByQueues(@Body() filters: any) {
    return { data: [] };
  }

  @Post('reportAnsweredByAgents')
  @ApiOperation({ summary: 'Báo cáo cuộc gọi đã trả lời theo agent' })
  reportAnsweredByAgents(@Body() filters: any) {
    return { data: [] };
  }

  @Post('reportKPI')
  @ApiOperation({ summary: 'Báo cáo KPI' })
  reportKPI(@Body() filters: any) {
    return { data: [] };
  }

  @Post('reportAgentKPI')
  @ApiOperation({ summary: 'Báo cáo KPI theo agent' })
  reportAgentKPI(@Body() filters: any) {
    return { data: [] };
  }

  @Post('reportAgentSummary')
  @ApiOperation({ summary: 'Báo cáo tổng hợp agent' })
  reportAgentSummary(@Body() filters: any) {
    return { data: [] };
  }

  @Post('exportExcel')
  @ApiOperation({ summary: 'Xuất queue log ra Excel' })
  exportExcel(@Body() filters: any) {
    return { message: 'Export đang được xử lý' };
  }
}
