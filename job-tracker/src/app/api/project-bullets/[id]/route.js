import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  getProjectBulletById,
  updateProjectBullet,
  deleteProjectBullet,
} from "@/lib/server/db/projectBulletsRepo";
import { normalizeTags } from "@/lib/utils/tagNormalization";

// Validation schema for PATCH request
const updateProjectBulletSchema = z.object({
  text: z.string().min(1).optional(),
  title: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  impact: z.string().optional().nullable(),
});

/**
 * GET /api/project-bullets/[id]
 * Returns a specific project bullet by ID.
 * Returns 404 for both not found and not owned (no leakage).
 */
export async function GET(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { data: null, error: { code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    const { id } = await params;

    const bullet = await getProjectBulletById({
      supabase,
      userId: user.id,
      id,
    });

    if (!bullet) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { data: bullet, error: null },
      { status: 200 }
    );
  } catch (err) {
    console.log(
      JSON.stringify({
        level: "error",
        message: "GET /api/project-bullets/[id] failed",
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
 * PATCH /api/project-bullets/[id]
 * Updates a specific project bullet by ID.
 * Returns 404 for both not found and not owned (no leakage).
 */
export async function PATCH(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { data: null, error: { code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    const { id } = await params;

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
    const validation = updateProjectBulletSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { data: null, error: { code: "VALIDATION_FAILED", details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    const patch = validation.data;

    // Normalize tags before updating
    if (patch.tags !== undefined) {
      patch.tags = normalizeTags(patch.tags);
    }

    const bullet = await updateProjectBullet({
      supabase,
      userId: user.id,
      id,
      patch,
    });

    if (!bullet) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { data: bullet, error: null },
      { status: 200 }
    );
  } catch (err) {
    console.log(
      JSON.stringify({
        level: "error",
        message: "PATCH /api/project-bullets/[id] failed",
        error: err.message,
      })
    );
    return NextResponse.json(
      { data: null, error: { code: "UPDATE_FAILED" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/project-bullets/[id]
 * Deletes a specific project bullet by ID.
 * Returns 404 for both not found and not owned (no leakage).
 */
export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { data: null, error: { code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    const { id } = await params;

    const deleted = await deleteProjectBullet({
      supabase,
      userId: user.id,
      id,
    });

    if (!deleted) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { data: { success: true }, error: null },
      { status: 200 }
    );
  } catch (err) {
    console.log(
      JSON.stringify({
        level: "error",
        message: "DELETE /api/project-bullets/[id] failed",
        error: err.message,
      })
    );
    return NextResponse.json(
      { data: null, error: { code: "DELETE_FAILED" } },
      { status: 500 }
    );
  }
}
