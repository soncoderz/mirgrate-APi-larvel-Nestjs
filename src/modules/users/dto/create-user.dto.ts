import { z } from "zod";
import { numberLike, optionalNumberLike, nullableText, optionalTextMax } from "./common.dto";

export const addUserAsMemberOfCompanySchema = z
  .object({
    firstName: z
      .string()
      .min(1, "Tên là bắt buộc.")
      .max(50, "Tên không được vượt quá 50 ký tự."),
    lastName: z
      .string()
      .min(1, "Họ là bắt buộc.")
      .max(50, "Họ không được vượt quá 50 ký tự."),
    email: z
      .string()
      .min(6, "Email phải có ít nhất 6 ký tự.")
      .max(255, "Email không được vượt quá 255 ký tự.")
      .email("Email không hợp lệ."),
    password: z
      .string()
      .min(6, "Mật khẩu phải có ít nhất 6 ký tự.")
      .max(32, "Mật khẩu không được vượt quá 32 ký tự."),
    confirmPassword: z.string().min(1, "Xác nhận mật khẩu là bắt buộc."),
    groupId: numberLike,
    address: optionalTextMax(255, "Địa chỉ không được vượt quá 255 ký tự."),
    note: optionalTextMax(255, "Ghi chú không được vượt quá 255 ký tự."),
    status: z.enum(["active", "lock", "pending", "trash"]).optional(),
    role: z
      .enum(["agent", "manager", "supervisor", "admin", "superadmin"])
      .optional(),
    userCode: z.union([z.string(), z.number()]).optional(),
    type_user: z.string().optional(),
    typeId: optionalNumberLike,
    extension: optionalTextMax(50, "Extension không được vượt quá 50 ký tự."),
    extensions_view: nullableText.optional(),
    departmentId: optionalNumberLike,
    queues: optionalTextMax(255, "Queues không được vượt quá 255 ký tự."),
    mobile: nullableText.optional(),
    phone: nullableText.optional(),
    otherId: nullableText.optional(),
    otherEmail: nullableText.optional(),
    firstLogin: z.unknown().optional(),
    is_google2fa: z.enum(["active", "disabled"]).optional(),
    emailqr: nullableText.optional(),
    list_region: z.unknown().optional(),
    list_branch: z.unknown().optional(),
    list_department: z.unknown().optional(),
  })
  .passthrough()
  .superRefine((body, context) => {
    if (body.confirmPassword !== body.password) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Xác nhận mật khẩu không khớp.",
      });
    }
  });

export type AddUserAsMemberOfCompanyBody = z.infer<
  typeof addUserAsMemberOfCompanySchema
>;
