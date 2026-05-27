import { z } from "zod";

export const upsertUserTypeSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
    privileges: z.record(z.string(), z.unknown()).optional(),
    groupId: z.union([z.string(), z.number()]).optional(),
    group_id: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

export type UpsertUserTypeBody = z.infer<typeof upsertUserTypeSchema>;
