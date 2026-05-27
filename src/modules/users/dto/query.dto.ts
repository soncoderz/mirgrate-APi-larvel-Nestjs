import { z } from "zod";
import { numberLike, optionalNumberLike } from "./common.dto";

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
