/**
 * =============================================================================
 * common.module.ts - Module chung chứa các thành phần dùng chung toàn ứng dụng
 * =============================================================================
 *
 * Module này cung cấp:
 * - JWT configuration (cấu hình token xác thực)
 * - Guards (bảo vệ route - tương đương middleware auth trong Laravel)
 * - Helper services (các tiện ích dùng chung)
 *
 * Tương đương với việc đăng ký middleware + helper trong AppServiceProvider Laravel.
 * Các module khác import CommonModule để sử dụng guards và services.
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConnectorGuard } from './guards/connector.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { DateHelperService } from './services/date-helper.service';
import { JwtBlacklistService } from './services/jwt-blacklist.service';
import { MigrationStubService } from './services/migration-stub.service';
import { QueryHelperService } from './services/query-helper.service';

@Module({
  imports: [
    /**
     * Cấu hình JWT Module (JSON Web Token)
     *
     * registerAsync() → dùng factory pattern để inject ConfigService
     * và đọc JWT_SECRET từ biến môi trường.
     *
     * Tương đương với config/jwt.php trong Laravel + package jwt-auth
     *
     * - secret: Khóa bí mật để ký và xác thực token
     * - expiresIn: Thời gian hết hạn token (mặc định: 1 ngày)
     */
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', ''),
        signOptions: {
          algorithm: config.get<string>('JWT_ALGO', 'HS256') as never,
        },
      }),
    }),
  ],
  providers: [
    // Guards - Bảo vệ route (tương đương middleware trong Laravel)
    ConnectorGuard,    // Guard cho route connector (JWT hoặc X-Custom-Token header)
    JwtAuthGuard,      // Guard xác thực JWT bắt buộc

    // Helper Services - Các tiện ích dùng chung
    DateHelperService,     // Xử lý ngày tháng (parse date range, so sánh tháng)
    JwtBlacklistService,
    MigrationStubService,  // Tạo response cho endpoint chưa được migrate
    QueryHelperService,    // Hỗ trợ query: pagination, LIKE escape
  ],
  exports: [
    // Export để các module khác có thể sử dụng khi import CommonModule
    ConnectorGuard,
    DateHelperService,
    JwtAuthGuard,
    JwtBlacklistService,
    MigrationStubService,
    QueryHelperService,
    JwtModule,  // Export JwtModule để các module khác dùng JwtService
  ],
})
export class CommonModule {}
