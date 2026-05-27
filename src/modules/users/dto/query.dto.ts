import { z } from "zod";
import { numberLike, optionalNumberLike } from "./common.dto";

export const userFilterTypeSchema = z.enum([
  "like",
  "like_left",
  "like_right",
  "not_like",
  "not_like_left",
  "not_like_right",
  "more",
  "less",
  "other",
  "more_equal",
  "more_less",
]);

export const userFilterSchema = z
  .object({
    type: userFilterTypeSchema,
    keyword: z.unknown().optional(),
  })
  .passthrough();

export const usersFiltersSchema = z
  .record(z.string(), userFilterSchema)
  .optional();

const userSortEntrySchema = z
  .object({
    name: z.string().optional(),
    field: z.string().optional(),
    direction: z.string().optional(),
    order: z.string().optional(),
  })
  .passthrough();

export const usersSortsSchema = z
  .union([
    z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
    z.array(userSortEntrySchema),
  ])
  .optional();

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
    filters: usersFiltersSchema,
    sorts: usersSortsSchema,
  })
  .passthrough();

export type UsersQueryBody = z.infer<typeof usersQuerySchema>;

export const userIdParamSchema = z.object({
  id: numberLike,
});

export type UserIdParams = z.infer<typeof userIdParamSchema>;
