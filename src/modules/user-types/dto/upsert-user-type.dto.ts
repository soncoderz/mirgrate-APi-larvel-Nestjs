/**
 * =============================================================================
 * upsert-user-type.dto.ts - DTO cho thêm/sửa loại người dùng
 * =============================================================================
 *
 * DTO cho API insertUserType và updateUserType.
 * Cả 2 field đều tùy chọn vì body còn chứa các trường khác
 * (privileges, groupId, ...) dưới dạng Record<string, unknown>.
 *
 * Tương đương FormRequest trong Laravel.
 */

import { IsOptional, IsString } from 'class-validator';

export class UpsertUserTypeDto {
  /** Tên loại người dùng (VD: 'Admin', 'Agent', 'Supervisor') */
  @IsOptional()
  @IsString()
  name?: string;

  /** Mô tả chi tiết về loại người dùng */
  @IsOptional()
  @IsString()
  description?: string;
}
