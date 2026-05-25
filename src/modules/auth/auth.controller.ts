import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { LoginDto, ForgotPasswordDto, ChangePasswordForgotDto, ResetPasswordDto } from './dto/auth.dto';

@ApiTags('Auth')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/login
   * Tương đương UsersController::login()
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập - tương đương /api/v1/login trong Laravel' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = req.ip || req.headers['x-forwarded-for'] as string || '0.0.0.0';
    return this.authService.login(dto, ip);
  }

  /**
   * POST /api/v1/loginv2
   * Tương đương UsersController::loginv3()
   */
  @Post('loginv2')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập v2' })
  async loginV2(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = req.ip || '0.0.0.0';
    return this.authService.login(dto, ip);
  }

  /**
   * POST /api/v1/checkToken
   * GET /api/v1/me
   * Tương đương UsersController::me()
   */
  @Post('checkToken')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Kiểm tra token và lấy thông tin user' })
  async checkToken(@CurrentUser() user: User) {
    return user;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Lấy thông tin user hiện tại' })
  async getMe(@CurrentUser() user: User) {
    return user;
  }

  /**
   * POST /api/v1/logout
   * Tương đương UsersController::logout()
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng xuất' })
  async logout(@CurrentUser() user: User) {
    return this.authService.logout(user.id);
  }

  /**
   * POST /api/v1/forgotPassword
   */
  @Post('forgotPassword')
  @ApiOperation({ summary: 'Quên mật khẩu - gửi email reset' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    // TODO: implement forgot password logic
    return { message: 'Email đặt lại mật khẩu đã được gửi.' };
  }

  /**
   * POST /api/v1/changePasswordForgot
   */
  @Post('changePasswordForgot')
  @ApiOperation({ summary: 'Thay đổi mật khẩu qua token email' })
  async changePasswordForgot(@Body() dto: ChangePasswordForgotDto) {
    // TODO: implement change password by token logic
    return { message: 'Mật khẩu đã được thay đổi thành công.' };
  }
}
