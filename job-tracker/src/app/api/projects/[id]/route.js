import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  getProjectById,
  updateProject,
  deleteProject,
} from "@/lib/server/db/projectsRepo";

// Validation schema for PATCH request
const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  techStack: z.string().optional().nullable(),
});

/**
 * GET /api/projects/[id]
 * Returns a specific project by ID.
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

    const project = await getProjectById({
      supabase,
      userId: user.id,
      id,
    });

    if (!project) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { data: project, error: null },
      { status: 200 }
    );
  } catch (err) {
    console.log(
      JSON.stringify({
        level: "error",
        message: "GET /api/projects/[id] failed",
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
 * PATCH /api/projects/[id]
 * Updates a specific project by ID.
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
    const validation = updateProjectSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { data: null, error: { code: "VALIDATION_FAILED", details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    const patch = validation.data;

    const project = await updateProject({
      supabase,
      userId: user.id,
      id,
      patch,
    });

    if (!project) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { data: project, error: null },
      { status: 200 }
    );
  } catch (err) {
    console.log(
      JSON.stringify({
        level: "error",
        message: "PATCH /api/projects/[id] failed",
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
 * DELETE /api/projects/[id]
 * Deletes a specific project by ID.
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

    const deleted = await deleteProject({
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
        message: "DELETE /api/projects/[id] failed",
        error: err.message,
      })
    );
    return NextResponse.json(
      { data: null, error: { code: "DELETE_FAILED" } },
      { status: 500 }
    );
  }
}
