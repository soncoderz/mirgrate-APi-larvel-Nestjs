import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserTypeService } from './user-type.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('User Type')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller()
export class UserTypeController {
  constructor(private readonly userTypeService: UserTypeService) {}

  // GET /api/v1/userTypes
  @Get('userTypes')
  @ApiOperation({ summary: 'Lấy tất cả loại user' })
  getUserTypes() {
    return this.userTypeService.getUserTypes();
  }

  // GET /api/v1/userType/:id
  @Get('userType/:id')
  @ApiOperation({ summary: 'Lấy loại user theo ID' })
  getUserType(@Param('id') id: string) {
    return this.userTypeService.getUserType(+id);
  }

  // POST /api/v1/userTypesWithPage
  @Post('userTypesWithPage')
  @ApiOperation({ summary: 'Lấy danh sách loại user có phân trang' })
  getUserTypesWithPage(@Body() filters: any) {
    const { page = 1, per_page = 20, ...rest } = filters;
    return this.userTypeService.getUserTypesWithPage(rest, page, per_page);
  }

  // POST /api/v1/insertUserType
  @Post('insertUserType')
  @ApiOperation({ summary: 'Thêm loại user mới' })
  insertUserType(@Body() body: any) {
    return this.userTypeService.insertUserType(body);
  }

  // PUT /api/v1/updateUserType/:id
  @Put('updateUserType/:id')
  @ApiOperation({ summary: 'Cập nhật loại user' })
  updateUserType(@Param('id') id: string, @Body() body: any) {
    return this.userTypeService.updateUserType(+id, body);
  }

  // DELETE /api/v1/deleteUserType/:id
  @Delete('deleteUserType/:id')
  @ApiOperation({ summary: 'Xóa loại user' })
  deleteUserType(@Param('id') id: string) {
    return this.userTypeService.deleteUserType(+id);
  }

  // POST /api/v1/deleteUserTypes
  @Post('deleteUserTypes')
  @ApiOperation({ summary: 'Xóa nhiều loại user' })
  deleteUserTypes(@Body() body: { ids: number[] }) {
    // TODO: implement delete multiple user types
    return { message: 'Đã xóa các loại user' };
  }
}
