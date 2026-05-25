import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CdrService } from './cdr.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/**
 * CdrController - tương đương App\Http\Controllers\Managers\CdrController trong Laravel
 * Route prefix: /api/v1/cdr/
 */
@ApiTags('CDR - Call Detail Records')
@Controller('cdr')
export class CdrController {
  constructor(private readonly cdrService: CdrService) {}

  // Public routes (không cần JWT)

  // POST /api/v1/cdr/getCalls
  @Post('getCalls')
  @ApiOperation({ summary: 'Lấy danh sách cuộc gọi (public)' })
  getCalls(@Body() filters: any) {
    const { page = 1, per_page = 20, ...rest } = filters;
    return this.cdrService.getCalls(rest, page, per_page);
  }

  // POST /api/v1/cdr/getStaticCalls
  @Post('getStaticCalls')
  @ApiOperation({ summary: 'Lấy thống kê cuộc gọi (public)' })
  getStaticCalls(@Body() filters: any) {
    return this.cdrService.getStaticCalls(filters);
  }

  // POST /api/v1/cdr/getStaticCallsv2
  @Post('getStaticCallsv2')
  @ApiOperation({ summary: 'Lấy thống kê cuộc gọi v2 (public)' })
  getStaticCallsV2(@Body() filters: any) {
    return this.cdrService.getStaticCalls(filters);
  }

  // Protected routes (yêu cầu JWT)

  // POST /api/v1/cdr/getCallsLog
  @Post('getCallsLog')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Lấy log cuộc gọi' })
  getCallsLog(@Body() filters: any) {
    const { page = 1, per_page = 20, ...rest } = filters;
    return this.cdrService.getCalls(rest, page, per_page);
  }

  // POST /api/v1/cdr/getCallDetail
  @Post('getCallDetail')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Lấy chi tiết cuộc gọi' })
  getCallDetail(@Body() body: { uniqueid: string }) {
    return this.cdrService.getCallDetail(body.uniqueid);
  }

  // POST /api/v1/cdr/reportByYear
  @Post('reportByYear')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Báo cáo cuộc gọi theo năm' })
  reportByYear(@Body() filters: any) {
    // TODO: implement report by year
    return { data: [] };
  }

  // POST /api/v1/cdr/reportAnsweredOutbound
  @Post('reportAnsweredOutbound')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Báo cáo cuộc gọi outbound đã trả lời' })
  reportAnsweredOutbound(@Body() filters: any) {
    // TODO: implement report answered outbound
    return { data: [] };
  }

  // POST /api/v1/cdr/reportAnsweredInbound
  @Post('reportAnsweredInbound')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Báo cáo cuộc gọi inbound đã trả lời' })
  reportAnsweredInbound(@Body() filters: any) {
    // TODO: implement report answered inbound
    return { data: [] };
  }

  // POST /api/v1/cdr/reportSummaryCalls
  @Post('reportSummaryCalls')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Báo cáo tổng hợp cuộc gọi' })
  reportSummaryCalls(@Body() filters: any) {
    // TODO: implement summary calls report
    return { data: [] };
  }

  // POST /api/v1/cdr/getCSATSummary
  @Post('getCSATSummary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Lấy tổng hợp CSAT' })
  getCSATSummary(@Body() filters: any) {
    // TODO: implement CSAT summary
    return { data: [] };
  }

  // POST /api/v1/cdr/getCSATDetail
  @Post('getCSATDetail')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Lấy chi tiết CSAT' })
  getCSATDetail(@Body() filters: any) {
    // TODO: implement CSAT detail
    return { data: [] };
  }

  // POST /api/v1/cdr/reportBilling
  @Post('reportBilling')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Báo cáo billing cuộc gọi' })
  reportBilling(@Body() filters: any) {
    // TODO: implement billing report
    return { data: [] };
  }

  // POST /api/v1/cdr/getFavouriteCalls
  @Post('getFavouriteCalls')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Lấy danh sách cuộc gọi yêu thích' })
  getFavouriteCalls(@Body() filters: any) {
    // TODO: implement favourite calls
    return { data: [] };
  }

  // POST /api/v1/cdr/exportExcelv2
  @Post('exportExcelv2')
  @ApiOperation({ summary: 'Xuất CDR ra Excel (v2, public)' })
  exportExcelV2(@Body() filters: any) {
    // TODO: implement Excel export
    return { message: 'Export đang được xử lý' };
  }

  // POST /api/v1/cdr/exportExcelv3
  @Post('exportExcelv3')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Xuất CDR ra Excel (v3)' })
  exportExcelV3(@Body() filters: any) {
    // TODO: implement Excel export v3
    return { message: 'Export đang được xử lý' };
  }

  // POST /api/v1/cdr/getQueuePerformance
  @Post('getQueuePerformance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Lấy hiệu suất queue' })
  getQueuePerformance(@Body() filters: any) {
    // TODO: implement queue performance
    return { data: [] };
  }

  // POST /api/v1/cdr/getAgentPerformance
  @Post('getAgentPerformance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Lấy hiệu suất agent' })
  getAgentPerformance(@Body() filters: any) {
    // TODO: implement agent performance
    return { data: [] };
  }

  // POST /api/v1/cdr/reportDepartment
  @Post('reportDepartment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Báo cáo theo phòng ban' })
  reportDepartment(@Body() filters: any) {
    // TODO: implement department report
    return { data: [] };
  }
}
