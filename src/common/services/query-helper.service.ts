/**
 * =============================================================================
 * query-helper.service.ts - Service hỗ trợ xây dựng query SQL
 * =============================================================================
 *
 * Cung cấp các tiện ích cho pagination (phân trang) và escape chuỗi LIKE.
 * Tương đương với Helper::checkRecordsOnPage() và một phần logic pagination
 * trong Laravel project.
 */

import { Injectable } from '@nestjs/common';

@Injectable()
export class QueryHelperService {
  /**
   * toPagination - Chuẩn hóa thông tin phân trang từ request body
   *
   * Hỗ trợ nhiều tên field từ client:
   * - page / currentPage → số trang hiện tại (bắt đầu từ 1)
   * - limit / pageSize   → số bản ghi mỗi trang (mặc định: 20)
   *
   * Tự động tính offset cho SQL LIMIT ... OFFSET ...
   *
   * @param input - Object chứa thông tin phân trang từ request
   * @returns {{ page: number, limit: number, offset: number }}
   *
   * @example
   * toPagination({ page: 3, limit: 10 })
   * // → { page: 3, limit: 10, offset: 20 }
   */
  toPagination(input: Record<string, unknown>) {
    const page = Number(input.page ?? input.currentPage ?? 1);
    const limit = Number(input.limit ?? input.pageSize ?? 20);

    return {
      // Đảm bảo page >= 1, nếu giá trị không hợp lệ → mặc định là 1
      page: Number.isFinite(page) && page > 0 ? page : 1,

      // Đảm bảo limit >= 1, nếu giá trị không hợp lệ → mặc định là 20
      limit: Number.isFinite(limit) && limit > 0 ? limit : 20,

      // Tính offset cho SQL: offset = (page - 1) * limit
      // VD: page=3, limit=10 → offset=20 (bỏ qua 20 bản ghi đầu)
      offset:
        ((Number.isFinite(page) && page > 0 ? page : 1) - 1) *
        (Number.isFinite(limit) && limit > 0 ? limit : 20),
    };
  }

  /**
   * like - Escape chuỗi cho SQL LIKE query
   *
   * Thêm ký tự '%' ở đầu và cuối chuỗi, đồng thời escape các ký tự đặc biệt
   * của LIKE (% và _) để tránh SQL injection trong LIKE clause.
   *
   * Tương đương với '%' . $value . '%' trong Laravel nhưng an toàn hơn.
   *
   * @param value - Chuỗi cần tìm kiếm
   * @returns Chuỗi đã được escape và wrap với %...%
   *
   * @example
   * like("test")      → "%test%"
   * like("100%")      → "%100\\%%"  (escape ký tự %)
   * like("user_name") → "%user\\_name%"  (escape ký tự _)
   */
  like(value: string) {
    return `%${value.replace(/[%_]/g, '\\$&')}%`;
  }
}
