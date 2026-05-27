import { z } from "zod";

export const loginSchema = z
  .object({
    email: z.string().email("Email không hợp lệ."),
    password: z.string().min(1, "Mật khẩu là bắt buộc."),
    remember_token: z.unknown().optional(),
  })
  .passthrough();

export type LoginBody = z.infer<typeof loginSchema>;

export const logoutSchema = z
  .object({
    id: z
      .union([z.string(), z.number(), z.null()])
      .optional()
      .refine(
        (value) =>
          value === undefined ||
          value === null ||
          value === "" ||
          Number.isFinite(Number(value)),
        { message: "Id log đăng xuất phải là số." },
      ),
  })
  .passthrough();

export type LogoutBody = z.infer<typeof logoutSchema>;

export const addUserAsCompanySchema = z
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
    groupName: z
      .string()
      .min(6, "Tên group phải có ít nhất 6 ký tự.")
      .max(255, "Tên group không được vượt quá 255 ký tự."),
    typeId: z
      .union([z.string(), z.number()])
      .refine((value) => String(value).trim() !== "", {
        message: "Loại người dùng là bắt buộc.",
      })
      .refine((value) => Number.isFinite(Number(value)), {
        message: "Loại người dùng phải là số.",
      }),
    address: z.string().max(255, "Địa chỉ không được vượt quá 255 ký tự.").optional(),
    note: z.string().max(255, "Ghi chú không được vượt quá 255 ký tự.").optional(),
    groupSetting: z.string().optional(),
    userCode: z.union([z.string(), z.number()]).optional(),
    mobile: z.string().optional(),
    phone: z.string().optional(),
    status: z.enum(["active", "lock", "pending", "trash"]).optional(),
    role: z.enum(["agent", "admin", "superadmin"]).optional(),
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

export type AddUserAsCompanyBody = z.infer<typeof addUserAsCompanySchema>;
