import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from './entities/user.entity';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * POST /api/v1/users
   * Tương đương UsersController::getUsers()
   */
  @Post('users')
  @ApiOperation({ summary: 'Lấy danh sách users có phân trang' })
  async getUsers(
    @Body() filters: any,
    @CurrentUser() currentUser: User,
  ) {
    const { page = 1, per_page = 20, ...rest } = filters;
    return this.usersService.getUsers(rest, page, per_page);
  }

  /**
   * GET /api/v1/user/:id
   * Tương đương UsersController::getUserByID()
   */
  @Get('user/:id')
  @ApiOperation({ summary: 'Lấy thông tin user theo ID' })
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(+id);
  }

  /**
   * POST /api/v1/usersByExt
   * Tương đương UsersController::getUserInfoByExtension()
   */
  @Post('usersByExt')
  @ApiOperation({ summary: 'Lấy thông tin user theo extension' })
  async getUsersByExt(@Body() body: { extension: string }) {
    return this.usersService.getUserByExtension(body.extension);
  }

  /**
   * POST /api/v1/updateUser
   * Tương đương UsersController::updateUser()
   */
  @Post('updateUser')
  @ApiOperation({ summary: 'Cập nhật thông tin user' })
  async updateUser(@Body() body: any) {
    const { id, ...data } = body;
    return this.usersService.updateUser(id, data);
  }

  /**
   * POST /api/v1/deleteUser
   * Tương đương UsersController::removeUser()
   */
  @Post('deleteUser')
  @ApiOperation({ summary: 'Xóa user' })
  async deleteUser(@Body() body: { id: number }) {
    return this.usersService.removeUser(body.id);
  }

  /**
   * GET /api/v1/duplicateUser/:id
   * Tương đương UsersController::duplicateUser()
   */
  @Get('duplicateUser/:id')
  @ApiOperation({ summary: 'Nhân đôi user' })
  async duplicateUser(@Param('id') id: string) {
    // TODO: implement duplicate user logic
    return { message: `Đã nhân đôi user ${id}` };
  }

  /**
   * POST /api/v1/getUserLogs
   * Tương đương UsersController::getUserLogs()
   */
  @Post('getUserLogs')
  @ApiOperation({ summary: 'Lấy lịch sử đăng nhập của user' })
  async getUserLogs(@Body() filters: any) {
    const { page = 1, per_page = 20, ...rest } = filters;
    return this.usersService.getUserLogs(rest, page, per_page);
  }

  /**
   * POST /api/v1/exportUsers
   * Tương đương UsersController::exportUsers()
   */
  @Post('exportUsers')
  @ApiOperation({ summary: 'Xuất danh sách users ra Excel' })
  async exportUsers(@Body() filters: any) {
    // TODO: implement Excel export using exceljs
    return { message: 'Export đang được xử lý' };
  }

  /**
   * POST /api/v1/getBlackList
   */
  @Post('getBlackList')
  @ApiOperation({ summary: 'Lấy danh sách blacklist' })
  async getBlackList(@Body() filters: any) {
    // TODO: implement blacklist logic
    return { data: [], meta: {} };
  }

  /**
   * POST /api/v1/insertBlackList
   */
  @Post('insertBlackList')
  @ApiOperation({ summary: 'Thêm vào blacklist' })
  async insertBlackList(@Body() body: any) {
    // TODO: implement insert blacklist
    return { message: 'Đã thêm vào blacklist' };
  }

  /**
   * POST /api/v1/updateBlackList
   */
  @Post('updateBlackList')
  @ApiOperation({ summary: 'Cập nhật blacklist' })
  async updateBlackList(@Body() body: any) {
    // TODO: implement update blacklist
    return { message: 'Đã cập nhật blacklist' };
  }

  /**
   * POST /api/v1/deleteBlackList
   */
  @Post('deleteBlackList')
  @ApiOperation({ summary: 'Xóa khỏi blacklist' })
  async deleteBlackList(@Body() body: any) {
    // TODO: implement delete blacklist
    return { message: 'Đã xóa khỏi blacklist' };
  }

  /**
   * POST /api/v1/getUserTeam
   */
  @Post('getUserTeam')
  @ApiOperation({ summary: 'Lấy danh sách team của user' })
  async getUserTeam(@Body() filters: any) {
    // TODO: implement user team logic
    return { data: [] };
  }

  /**
   * POST /api/v1/UpsertUserTeam
   */
  @Post('UpsertUserTeam')
  @ApiOperation({ summary: 'Thêm hoặc cập nhật team' })
  async upsertUserTeam(@Body() body: any) {
    // TODO: implement upsert user team
    return { message: 'Đã cập nhật team' };
  }

  /**
   * POST /api/v1/deleteTeam
   */
  @Post('deleteTeam')
  @ApiOperation({ summary: 'Xóa team' })
  async deleteTeam(@Body() body: any) {
    // TODO: implement delete team
    return { message: 'Đã xóa team' };
  }
}
