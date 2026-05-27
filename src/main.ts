/**
 * =============================================================================
 * main.ts - Điểm khởi đầu (Entry Point) của ứng dụng NestJS
 * =============================================================================
 *
 * File này là nơi ứng dụng NestJS được khởi tạo và cấu hình.
 * Tương đương với file `public/index.php` trong Laravel.
 *
 * Luồng khởi động:
 * 1. Tạo instance ứng dụng NestJS từ AppModule (module gốc)
 * 2. Cấu hình global prefix cho API (mặc định: '/api')
 * 3. Bật CORS (Cross-Origin Resource Sharing) cho phép frontend gọi API
 * 4. Đăng ký ValidationPipe toàn cục để tự động validate DTO
 * 5. Đăng ký HttpExceptionFilter để xử lý lỗi thống nhất
 * 6. Lắng nghe trên port được cấu hình (mặc định: 3002)
 */

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/**
 * Hàm bootstrap - Khởi động ứng dụng NestJS
 *
 * Đây là hàm async vì việc tạo ứng dụng NestJS là bất đồng bộ.
 * Nó khởi tạo IoC container, resolve tất cả dependency, sau đó start HTTP server.
 */
async function bootstrap() {
  // Tạo instance ứng dụng NestJS từ module gốc (AppModule)
  // NestFactory.create() sẽ khởi tạo toàn bộ dependency injection container
  const app = await NestFactory.create(AppModule);

  // Lấy ConfigService để đọc biến môi trường từ file .env
  const config = app.get(ConfigService);

  // Đặt prefix cho tất cả API routes
  // Ví dụ: API_PREFIX='api' → tất cả routes sẽ bắt đầu bằng '/api/...'
  // Tương đương với RouteServiceProvider prefix trong Laravel
  app.setGlobalPrefix(config.get<string>('API_PREFIX', 'api'));

  // Bật CORS - cho phép frontend từ domain khác gọi API
  // CORS_ORIGIN='*' cho phép tất cả domain (phù hợp cho development)
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', '*'),
  });

  // Middleware ghi log request thời gian thực (Real-time HTTP Request Logging)
  app.use((req: any, res: any, next: any) => {
    const { method, originalUrl, ip } = req;
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;
      console.log(
        `\x1b[36m[HTTP]\x1b[0m ${new Date().toLocaleString()} | \x1b[32m${method}\x1b[0m ${originalUrl} | Status: \x1b[33m${statusCode}\x1b[0m | IP: ${ip} | \x1b[35m+${duration}ms\x1b[0m`
      );
    });

    next();
  });

  // Đăng ký ValidationPipe toàn cục
  // - transform: true → tự động chuyển đổi kiểu dữ liệu (string → number, ...)
  // - whitelist: false → KHÔNG loại bỏ các property không có trong DTO
  //   (giữ false vì project dùng Record<string, unknown> làm body type)
  // - forbidUnknownValues: false → cho phép giá trị không xác định
  // Tương đương với middleware validate trong Laravel
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: false,
      forbidUnknownValues: false,
    }),
  );

  // Đăng ký filter bắt lỗi toàn cục
  // Tất cả exception sẽ được HttpExceptionFilter xử lý và trả về format thống nhất
  // Tương đương với Handler.php (Exception Handler) trong Laravel
  app.useGlobalFilters(new HttpExceptionFilter());

  // Lấy port từ biến môi trường, mặc định là 3002
  const port = config.get<number>('PORT', 3001);

  // Khởi động HTTP server và lắng nghe trên port đã cấu hình
  await app.listen(port);
}

// Gọi hàm bootstrap để khởi động ứng dụng
// void keyword cho TypeScript biết ta cố ý bỏ qua Promise trả về
void bootstrap();
