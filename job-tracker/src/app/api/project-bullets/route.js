import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  createProjectBullet,
  listProjectBullets,
} from "@/lib/server/db/projectBulletsRepo";
import { normalizeTags } from "@/lib/utils/tagNormalization";
import { parseProjectBulletsListQuery } from "@/lib/server/validators/projectBulletsListQuery";

// Validation schema for POST request
const tagSchema = z.string().trim().min(1, "Tag cannot be empty").max(30).transform((value) => value.toLowerCase());
const createProjectBulletSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  text: z.string().min(1, "Bullet text is required"),
  title: z.string().optional().nullable(),
  tags: z.array(tagSchema).max(20).optional().nullable(),
  impact: z.string().optional().nullable(),
});

/**
 * GET /api/project-bullets?projectId={uuid}&q={text}&tag={tag}
 * Returns project bullets with optional filters.
 * - projectId: optional (when absent, searches across all user's projects)
 * - q: optional text search (searches text, title, impact fields)
 * - tag: optional tag filter (exact match, case-insensitive)
 */
export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { data: null, error: { code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const parsed = parseProjectBulletsListQuery(searchParams);
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: { code: "VALIDATION_FAILED", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    const { projectId, q, tag } = parsed.data;

    const bullets = await listProjectBullets({
      supabase,
      userId: user.id,
      projectId,
      q,
      tag,
    });

    return NextResponse.json(
      { data: bullets, error: null },
      { status: 200 }
    );
  } catch (err) {
    console.log(
      JSON.stringify({
        level: "error",
        message: "GET /api/project-bullets failed",
        error: err.message,
      })
    );
    return NextResponse.json(
      { data: null, error: { code: "FETCH_FAILED" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/project-bullets
 * Creates a new project bullet.
 */
export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { data: null, error: { code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { data: null, error: { code: "INVALID_JSON" } },
        { status: 400 }
      );
    }

    // Validate with zod
    const validation = createProjectBulletSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { data: null, error: { code: "VALIDATION_FAILED", details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    const values = validation.data;

    // Normalize tags before storing
    if (values.tags !== undefined) {
      values.tags = normalizeTags(values.tags);
    }

    const bullet = await createProjectBullet({
      supabase,
      userId: user.id,
      values,
    });

    return NextResponse.json(
      { data: bullet, error: null },
      { status: 201 }
    );
  } catch (err) {
    console.log(
      JSON.stringify({
        level: "error",
        message: "POST /api/project-bullets failed",
        error: err.message,
      })
    );
    return NextResponse.json(
      { data: null, error: { code: "CREATE_FAILED" } },
      { status: 500 }
    );
  }
}
