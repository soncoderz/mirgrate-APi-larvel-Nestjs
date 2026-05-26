/**
 * =============================================================================
 * date-helper.service.ts - Service hỗ trợ xử lý ngày tháng
 * =============================================================================
 *
 * Cung cấp các tiện ích chuyển đổi và so sánh ngày tháng.
 * Tương đương với một phần của Helper.php trong Laravel project.
 */

import { Injectable } from '@nestjs/common';

@Injectable()
export class DateHelperService {
  /**
   * toDateRange - Trích xuất khoảng thời gian từ request body
   *
   * Hỗ trợ nhiều tên field khác nhau từ client:
   * - startDate / fromDate → ngày bắt đầu
   * - endDate / toDate     → ngày kết thúc
   *
   * @param input - Object chứa thông tin ngày tháng từ request
   * @returns {{ startDate: string, endDate: string }} Khoảng thời gian đã chuẩn hóa
   */
  toDateRange(input: Record<string, unknown>) {
    return {
      startDate: String(input.startDate ?? input.fromDate ?? ''),
      endDate: String(input.endDate ?? input.toDate ?? ''),
    };
  }

  /**
   * isSameMonth - Kiểm tra 2 ngày có cùng tháng/năm không
   *
   * So sánh 7 ký tự đầu tiên (format: "YYYY-MM")
   * Ví dụ: "2024-03-01" và "2024-03-31" → true (cùng tháng 3/2024)
   *         "2024-03-01" và "2024-04-01" → false (khác tháng)
   *
   * Dùng để quyết định query bảng 'cdr' (tháng hiện tại) hay 'cdr_monthly' (tháng cũ)
   *
   * @param startDate - Ngày bắt đầu (format: YYYY-MM-DD)
   * @param endDate - Ngày kết thúc (format: YYYY-MM-DD)
   * @returns true nếu cùng tháng/năm
   */
  isSameMonth(startDate: string, endDate: string) {
    return startDate.slice(0, 7) === endDate.slice(0, 7);
  }
}
