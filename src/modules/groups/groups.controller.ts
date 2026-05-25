import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Groups')
@Controller()
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  // Public routes (không cần JWT)

  // GET /api/v1/groupBySecret/:secret
  @Get('groupBySecret/:secret?')
  @ApiOperation({ summary: 'Lấy thông tin group theo secret key' })
  getGroupBySecret(@Param('secret') secret: string) {
    return this.groupsService.getGroupBySecret(secret);
  }

  // GET /api/v1/getExtensionQueueBySecret/:secret
  @Get('getExtensionQueueBySecret/:secret?')
  @ApiOperation({ summary: 'Lấy extension queue theo secret' })
  getExtensionQueueBySecret(@Param('secret') secret: string) {
    // TODO: implement get extension queue by secret
    return { data: [] };
  }

  // GET /api/v1/getQueueBySecret/:secret
  @Get('getQueueBySecret/:secret?')
  @ApiOperation({ summary: 'Lấy queue theo secret' })
  getQueueBySecret(@Param('secret') secret: string) {
    // TODO: implement get queue by secret
    return { data: [] };
  }

  // Protected routes (yêu cầu JWT)

  // GET /api/v1/groups
  @Get('groups')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Lấy tất cả groups' })
  getGroups() {
    return this.groupsService.getGroups();
  }

  // GET /api/v1/group/:groupId
  @Get('group/:groupId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Lấy thông tin group theo ID' })
  getGroup(@Param('groupId') groupId: string) {
    return this.groupsService.getGroupById(+groupId);
  }

  // POST /api/v1/groupsWithPage
  @Post('groupsWithPage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Lấy danh sách groups có phân trang' })
  getGroupsWithPage(@Body() filters: any) {
    const { page = 1, per_page = 20, ...rest } = filters;
    return this.groupsService.getGroupsWithPage(rest, page, per_page);
  }

  // POST /api/v1/groupsWithPagev2
  @Post('groupsWithPagev2')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Lấy danh sách groups có phân trang (v2)' })
  getGroupsWithPageV2(@Body() filters: any) {
    const { page = 1, per_page = 20, ...rest } = filters;
    return this.groupsService.getGroupsWithPage(rest, page, per_page);
  }

  // POST /api/v1/addGroup
  @Post('addGroup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Thêm group mới' })
  addGroup(@Body() body: any) {
    return this.groupsService.addGroup(body);
  }

  // PUT /api/v1/updateGroup/:groupId
  @Put('updateGroup/:groupId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Cập nhật thông tin group' })
  updateGroup(@Param('groupId') groupId: string, @Body() body: any) {
    return this.groupsService.updateGroup(+groupId, body);
  }

  // DELETE /api/v1/deleteGroup/:id
  @Delete('deleteGroup/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Xóa group' })
  deleteGroup(@Param('id') id: string) {
    return this.groupsService.deleteGroup(+id);
  }

  // POST /api/v1/deleteGroups
  @Post('deleteGroups')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Xóa nhiều groups' })
  deleteGroups(@Body() body: { ids: number[] }) {
    // TODO: implement delete multiple groups
    return { message: 'Đã xóa các groups' };
  }

  // POST /api/v1/duplicateGroup
  @Post('duplicateGroup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Nhân đôi group' })
  duplicateGroup(@Body() body: { id: number }) {
    return this.groupsService.duplicateGroup(body.id);
  }

  // POST /api/v1/updatewebhook
  @Post('updatewebhook')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Cập nhật webhook của group' })
  updateWebhook(@Body() body: any) {
    return this.groupsService.updateGroup(body.id, { webhook_url: body.webhook_url });
  }

  // POST /api/v1/getDepartments
  @Post('getDepartments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Lấy danh sách phòng ban' })
  getDepartments(@Body() filters: any) {
    // TODO: implement departments
    return { data: [], meta: {} };
  }

  // POST /api/v1/addDepartment
  @Post('addDepartment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Thêm phòng ban mới' })
  addDepartment(@Body() body: any) {
    // TODO: implement add department
    return { message: 'Đã thêm phòng ban' };
  }

  // GET /api/v1/reason/getList/:groupId
  @Get('reason/getList/:groupId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Lấy danh sách lý do' })
  getListReason(@Param('groupId') groupId: string) {
    // TODO: implement get reason list
    return { data: [] };
  }
}
