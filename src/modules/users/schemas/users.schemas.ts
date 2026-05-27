import { z } from "zod";

const numberLike = z.union([z.string(), z.number()]).refine(
  (value) => Number.isFinite(Number(value)) && Number(value) > 0,
  { message: "Giá trị phải là số hợp lệ." },
);

const optionalNumberLike = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .refine(
    (value) =>
      value === undefined ||
      value === null ||
      value === "" ||
      Number.isFinite(Number(value)),
    { message: "Giá trị phải là số." },
  );

const nullableText = z.union([z.string(), z.null()]);

const optionalTextMax = (max: number, message: string) =>
  nullableText
    .optional()
    .refine((value) => value === undefined || value === null || value.length <= max, {
      message,
    });

const optionalTextBetween = (min: number, max: number, message: string) =>
  nullableText.optional().refine(
    (value) =>
      value === undefined ||
      value === null ||
      value === "" ||
      (value.length >= min && value.length <= max),
    { message },
  );

export const requestUserPayloadSchema = z
  .object({
    sub: optionalNumberLike,
    id: optionalNumberLike,
    groupId: optionalNumberLike,
    email: z.string().email("Email trong token không hợp lệ.").optional(),
    role: z.string().optional(),
  })
  .passthrough();

export const usersQuerySchema = z
  .object({
    groupId: optionalNumberLike,
    departmentId: optionalNumberLike,
    typeId: optionalNumberLike,
    roleId: z.union([z.string(), z.number(), z.null()]).optional(),
    recordsOnPage: optionalNumberLike,
    current_page: optionalNumberLike,
    page: optionalNumberLike,
    search: z.unknown().optional(),
    filters: z.unknown().optional(),
    sorts: z.unknown().optional(),
  })
  .passthrough();

export type UsersQueryBody = z.infer<typeof usersQuerySchema>;

export const userIdParamSchema = z.object({
  id: numberLike,
});

export type UserIdParams = z.infer<typeof userIdParamSchema>;

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

