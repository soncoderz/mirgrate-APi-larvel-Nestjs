import { z } from "zod";
import { numberLike, optionalNumberLike, nullableText, optionalTextMax, optionalTextBetween } from "./common.dto";

export const updateUserSchema = z
  .object({
    id: numberLike,
    firstName: optionalTextBetween(
      1,
      50,
      "Tên phải có từ 1 đến 50 ký tự.",
    ),
    lastName: optionalTextBetween(1, 50, "Họ phải có từ 1 đến 50 ký tự."),
    email: z
      .string()
      .min(6, "Email phải có ít nhất 6 ký tự.")
      .max(255, "Email không được vượt quá 255 ký tự.")
      .email("Email không hợp lệ.")
      .optional(),
    password: z
      .string()
      .min(6, "Mật khẩu phải có ít nhất 6 ký tự.")
      .max(50, "Mật khẩu không được vượt quá 50 ký tự.")
      .optional(),
    address: optionalTextMax(255, "Địa chỉ không được vượt quá 255 ký tự."),
    note: optionalTextMax(255, "Ghi chú không được vượt quá 255 ký tự."),
    groupId: optionalNumberLike,
    status: z.enum(["active", "lock", "pending", "trash"]).optional(),
    role: z
      .enum(["agent", "admin", "superadmin", "supervisor", "manager"])
      .optional(),
    extension: optionalTextMax(50, "Extension không được vượt quá 50 ký tự."),
    extensions_view: nullableText.optional(),
    queues: optionalTextMax(255, "Queues không được vượt quá 255 ký tự."),
    phone: nullableText.optional(),
    mobile: nullableText.optional(),
    otherId: nullableText.optional(),
    otherEmail: nullableText.optional(),
    is_google2fa: z.enum(["active", "disabled"]).nullable().optional(),
    departmentId: optionalNumberLike,
    typeId: optionalNumberLike,
  })
  .passthrough();

export type UpdateUserBody = z.infer<typeof updateUserSchema>;
