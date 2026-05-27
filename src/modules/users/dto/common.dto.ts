import { z } from "zod";

export const numberLike = z.union([z.string(), z.number()]).refine(
  (value) => Number.isFinite(Number(value)) && Number(value) > 0,
  { message: "Giá trị phải là số hợp lệ." },
);

export const optionalNumberLike = z
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

export const nullableText = z.union([z.string(), z.null()]);

export const optionalTextMax = (max: number, message: string) =>
  nullableText
    .optional()
    .refine((value) => value === undefined || value === null || value.length <= max, {
      message,
    });

export const optionalTextBetween = (min: number, max: number, message: string) =>
  nullableText.optional().refine(
    (value) =>
      value === undefined ||
      value === null ||
      value === "" ||
      (value.length >= min && value.length <= max),
    { message },
  );
