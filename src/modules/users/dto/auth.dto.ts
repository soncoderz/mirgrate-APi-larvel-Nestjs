import { z } from "zod";
import { optionalNumberLike } from "./common.dto";

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

export const requestUserPayloadSchema = z
  .object({
    sub: optionalNumberLike,
    id: optionalNumberLike,
    groupId: optionalNumberLike,
    email: z.string().email("Email trong token không hợp lệ.").optional(),
    role: z.string().optional(),
  })
  .passthrough();
