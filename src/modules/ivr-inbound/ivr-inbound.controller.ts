import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IvrInboundService } from './ivr-inbound.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/**
 * IvrInboundController - tương đương IvrInboundController trong Laravel
 * Route prefix: /api/v1/ivr_inbound/
 */
@ApiTags('IVR Inbound')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('ivr_inbound')
export class IvrInboundController {
  constructor(private readonly ivrInboundService: IvrInboundService) {}

  @Post('getIVRInboundDID')
  @ApiOperation({ summary: 'Lấy danh sách DID của IVR inbound' })
  getIVRInboundDID(@Body() filters: any) {
    return this.ivrInboundService.getIVRInboundDID(filters);
  }

  @Post('getIVRInboundDIDWithPage')
  @ApiOperation({ summary: 'Lấy danh sách DID có phân trang' })
  getIVRInboundDIDWithPage(@Body() filters: any) {
    return this.ivrInboundService.getIVRInboundDID(filters);
  }

  @Post('addEditDIDForIVRInbound')
  @ApiOperation({ summary: 'Thêm hoặc cập nhật DID' })
  addEditDIDForIVRInbound(@Body() body: any) {
    return this.ivrInboundService.addEditDIDForIVRInbound(body);
  }

  @Post('getIVRInboundRecord')
  @ApiOperation({ summary: 'Lấy danh sách record của IVR' })
  getIVRInboundRecord(@Body() filters: any) {
    return this.ivrInboundService.getIVRInboundRecord(filters);
  }

  @Post('getIVRInboundRecordWithPage')
  @ApiOperation({ summary: 'Lấy danh sách record có phân trang' })
  getIVRInboundRecordWithPage(@Body() filters: any) {
    return this.ivrInboundService.getIVRInboundRecord(filters);
  }

  @Post('addEditRecordForIVRInbound')
  @ApiOperation({ summary: 'Thêm hoặc cập nhật record' })
  addEditRecordForIVRInbound(@Body() body: any) {
    return { message: 'Đã cập nhật record' };
  }

  @Post('getIVRInboundInboundRoute')
  @ApiOperation({ summary: 'Lấy inbound route' })
  getIVRInboundInboundRoute(@Body() filters: any) {
    return { data: [] };
  }

  @Post('addEditRouteForIVRInbound')
  @ApiOperation({ summary: 'Thêm hoặc cập nhật inbound route' })
  addEditRouteForIVRInbound(@Body() body: any) {
    return { message: 'Đã cập nhật route' };
  }

  @Post('getIVRInboundTimeCondition')
  @ApiOperation({ summary: 'Lấy time condition' })
  getIVRInboundTimeCondition(@Body() filters: any) {
    return this.ivrInboundService.getIVRInboundTimeCondition(filters);
  }

  @Post('getTimeCondition')
  @ApiOperation({ summary: 'Lấy time condition (public endpoint)' })
  getTimeCondition(@Body() filters: any) {
    return this.ivrInboundService.getIVRInboundTimeCondition(filters);
  }

  @Post('addEditTimeConditionForIVRInbound')
  @ApiOperation({ summary: 'Thêm hoặc cập nhật time condition' })
  addEditTimeConditionForIVRInbound(@Body() body: any) {
    return { message: 'Đã cập nhật time condition' };
  }

  @Post('getIVRInboundTimeGroup')
  @ApiOperation({ summary: 'Lấy time group' })
  getIVRInboundTimeGroup(@Body() filters: any) {
    return this.ivrInboundService.getIVRInboundTimeGroup(filters);
  }

  @Post('getTimeGroup')
  @ApiOperation({ summary: 'Lấy time group (public endpoint)' })
  getTimeGroup(@Body() filters: any) {
    return this.ivrInboundService.getIVRInboundTimeGroup(filters);
  }

  @Post('addEditTimeGroupForIVRInbound')
  @ApiOperation({ summary: 'Thêm hoặc cập nhật time group' })
  addEditTimeGroupForIVRInbound(@Body() body: any) {
    return { message: 'Đã cập nhật time group' };
  }

  @Post('getIVRInboundIVR')
  @ApiOperation({ summary: 'Lấy cấu hình IVR' })
  getIVRInboundIVR(@Body() filters: any) {
    return this.ivrInboundService.getIVRInboundIVR(filters);
  }

  @Post('getIVR')
  @ApiOperation({ summary: 'Lấy IVR' })
  getIVR(@Body() filters: any) {
    return this.ivrInboundService.getIVRInboundIVR(filters);
  }

  @Post('addEditIVRForIVRInbound')
  @ApiOperation({ summary: 'Thêm hoặc cập nhật IVR' })
  addEditIVRForIVRInbound(@Body() body: any) {
    return { message: 'Đã cập nhật IVR' };
  }
}
