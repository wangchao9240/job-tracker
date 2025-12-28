import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  createProject,
  listProjects,
} from "@/lib/server/db/projectsRepo";

// Validation schema for POST request
const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  techStack: z.string().optional().nullable(),
});

/**
 * GET /api/projects
 * Returns the current user's projects list.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { data: null, error: { code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    const projects = await listProjects({
      supabase,
      userId: user.id,
    });

    return NextResponse.json(
      { data: projects, error: null },
      { status: 200 }
    );
  } catch (err) {
    console.log(
      JSON.stringify({
        level: "error",
        message: "GET /api/projects failed",
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
 * POST /api/projects
 * Creates a new project.
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
    const validation = createProjectSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { data: null, error: { code: "VALIDATION_FAILED", details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    const values = validation.data;

    const project = await createProject({
      supabase,
      userId: user.id,
      values,
    });

    return NextResponse.json(
      { data: project, error: null },
      { status: 201 }
    );
  } catch (err) {
    console.log(
      JSON.stringify({
        level: "error",
        message: "POST /api/projects failed",
        error: err.message,
      })
    );
    return NextResponse.json(
      { data: null, error: { code: "CREATE_FAILED" } },
      { status: 500 }
    );
  }
}
