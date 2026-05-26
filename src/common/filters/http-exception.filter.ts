/**
 * =============================================================================
 * http-exception.filter.ts - Bộ lọc xử lý lỗi toàn cục (Global Exception Filter)
 * =============================================================================
 *
 * Filter này bắt TẤT CẢ exception trong ứng dụng và trả về response JSON
 * với format thống nhất. Nó được đăng ký ở main.ts với app.useGlobalFilters().
 *
 * Tương đương với App\Exceptions\Handler.php trong Laravel.
 *
 * Luồng xử lý lỗi:
 * 1. Một exception được throw ở bất kỳ đâu (controller, service, guard, ...)
 * 2. NestJS bắt exception và chuyển đến filter này
 * 3. Filter kiểm tra loại exception:
 *    - HttpException (lỗi có chủ đích) → lấy status code + message từ exception
 *    - Lỗi khác (bug, crash) → trả về 500 Internal Server Error
 * 4. Trả về JSON response với status code tương ứng
 */

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * HttpExceptionFilter - Bộ lọc lỗi toàn cục
 *
 * @Catch() không có tham số → bắt TẤT CẢ loại exception
 * Nếu muốn chỉ bắt HttpException: @Catch(HttpException)
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  /**
   * Phương thức catch - Xử lý exception
   *
   * @param exception - Exception đã được throw (có thể là bất kỳ loại nào)
   * @param host - ArgumentsHost chứa thông tin context (HTTP, WebSocket, RPC, ...)
   */
  catch(exception: unknown, host: ArgumentsHost) {
    // Chuyển sang HTTP context để lấy response object
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Xác định HTTP status code:
    // - Nếu là HttpException (lỗi có chủ đích) → lấy status từ exception
    // - Nếu là lỗi khác (crash, bug) → mặc định 500 Internal Server Error
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Xác định nội dung response:
    // - HttpException → lấy response body đã được set sẵn khi throw
    // - Lỗi khác → trả về thông báo mặc định
    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : {
            statusCode: status,
            message: 'Internal server error',
          };

    // Trong môi trường development, log lỗi không phải HttpException ra console
    // để debug (production thì không log để tránh leak thông tin nhạy cảm)
    if (!(exception instanceof HttpException) && process.env.NODE_ENV !== 'production') {
      console.error(exception);
    }

    // Trả về JSON response
    // Nếu exceptionResponse là string → wrap trong object có statusCode + message
    // Nếu là object → trả nguyên (giữ format từ nơi throw exception)
    response.status(status).json(
      typeof exceptionResponse === 'string'
        ? {
            statusCode: status,
            message: exceptionResponse,
          }
        : exceptionResponse,
    );
  }
}
