import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO cho API POST /login
 * Tương đương validate request trong Laravel UsersController::login()
 */
export class LoginDto {
  @ApiProperty({ example: 'superadmin@mipbx.vn' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

/**
 * DTO cho API POST /loginv2 (loginv3 trong Laravel)
 */
export class LoginV2Dto extends LoginDto {
  @ApiProperty({ required: false, example: 'group-secret-key' })
  secret?: string;
}

/**
 * DTO cho API POST /loginExternal
 */
export class LoginExternalDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;
}

/**
 * DTO cho API POST /forgotPassword
 */
export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

/**
 * DTO cho API POST /changePasswordForgot
 */
export class ChangePasswordForgotDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password_confirmation: string;
}

/**
 * DTO cho API POST /resetPassword
 */
export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  old_password: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  new_password: string;
}
