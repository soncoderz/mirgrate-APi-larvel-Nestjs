import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response chuẩn - tương đương Helper::successResponse() trong Laravel
 */
export class PaginationMeta {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  per_page: number;

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 5 })
  last_page: number;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  data: T[];

  @ApiProperty()
  meta: PaginationMeta;
}

export class ApiResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  data: T;

  @ApiPropertyOptional({ example: 'Operation successful' })
  message?: string;
}

/**
 * Pagination helper - tương đương LengthAwarePaginator của Laravel
 */
export function paginate<T>(items: T[], total: number, page: number, perPage: number) {
  return {
    data: items,
    meta: {
      page,
      per_page: perPage,
      total,
      last_page: Math.ceil(total / perPage),
    },
  };
}
