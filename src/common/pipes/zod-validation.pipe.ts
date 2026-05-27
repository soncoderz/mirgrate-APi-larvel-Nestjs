import { BadRequestException, PipeTransform } from "@nestjs/common";
import { ZodType } from "zod";

export class ZodValidationPipe<TInput = unknown, TOutput = unknown>
  implements PipeTransform<TInput, TOutput>
{
  constructor(private readonly schema: ZodType<TOutput, TInput>) {}

  transform(value: TInput): TOutput {
    // `safeParse` không throw exception trực tiếp, giúp pipe tự định dạng lỗi
    // theo response chuẩn NestJS trước khi request đi vào controller/service.
    const result = this.schema.safeParse(value);
    if (result.success) {
      // Zod có thể parse/coerce/strip dữ liệu theo schema; controller luôn nhận
      // giá trị đã được chuẩn hóa thay vì body thô từ client.
      return result.data;
    }

    // Không trả format Laravel nữa: validation mới dùng BadRequestException
    // với danh sách issue rõ field/message/code để frontend xử lý ổn định.
    throw new BadRequestException({
      statusCode: 400,
      message: "Dữ liệu không hợp lệ.",
      error: "Bad Request",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      })),
    });
  }
}
