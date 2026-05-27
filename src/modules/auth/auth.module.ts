/**
 * =============================================================================
 * auth.module.ts - Module xác thực (Authentication Module)
 * =============================================================================
 *
 * Module quản lý các route liên quan đến xác thực:
 * login, logout, forgot password, check token, reCAPTCHA, ...
 *
 * Tương đương với nhóm route public (không cần middleware) trong Laravel routes/api.php:
 * Route::prefix('v1')->group(function () {
 *     Route::post('login', ...);
 *     Route::post('forgotPassword', ...);
 *     // ...
 * });
 *
 * Import UsersModule vì phần lớn logic auth thực tế nằm trong UsersService
 * (login, logout, checkToken, forgotPassword đều đã migrate trong UsersService).
 */

import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    CommonModule,   // Cung cấp JWT, guards, helper services
    UsersModule,    // Cung cấp UsersService (chứa logic auth đã migrate)
  ],
  controllers: [AuthController],  // Controller xử lý route auth
  providers: [AuthService],       // Service cho các endpoint chưa migrate
})
export class AuthModule {}
