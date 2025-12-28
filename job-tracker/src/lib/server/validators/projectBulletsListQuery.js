import { z } from "zod";

const MAX_QUERY_LENGTH = 200;
const MAX_TAG_LENGTH = 30;

const listProjectBulletsQuerySchema = z.object({
  projectId: z.string().uuid("Invalid project ID").optional(),
  q: z.string().trim().min(1, "Search query cannot be empty").max(MAX_QUERY_LENGTH).optional(),
  tag: z
    .string()
    .trim()
    .min(1, "Tag cannot be empty")
    .max(MAX_TAG_LENGTH)
    .transform((value) => value.toLowerCase())
    .optional(),
});

function optionalParam(value) {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function parseProjectBulletsListQuery(searchParams) {
  return listProjectBulletsQuerySchema.safeParse({
    projectId: optionalParam(searchParams.get("projectId")),
    q: optionalParam(searchParams.get("q")),
    tag: optionalParam(searchParams.get("tag")),
  });
}

