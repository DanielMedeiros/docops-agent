import { z } from "zod";

export const searchSchema = z.object({
  query: z.string().trim().min(3).max(2000),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

export type SearchInput = z.infer<typeof searchSchema>;
