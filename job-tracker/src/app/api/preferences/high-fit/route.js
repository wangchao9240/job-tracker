import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  getHighFitPreferences,
  upsertHighFitPreferences,
} from "@/lib/server/db/highFitPreferencesRepo";

const ROLE_LEVELS = [
  "Graduate",
  "Junior",
  "Entry-level",
  "Intern",
  "Mid",
];

const VISA_FILTERS = ["no_pr_required", "any"];

const ROLE_FOCUS = [
  "software",
  "frontend",
  "backend",
  "fullstack",
  "data",
  "devops",
];

// Default values for preferences
const DEFAULT_PREFERENCES = {
  roleLevels: [],
  preferredLocations: [],
  visaFilter: "no_pr_required",
  roleFocus: "software",
  keywordsInclude: [],
  keywordsExclude: [],
};

// Validation schema for PUT request
const preferencesSchema = z.object({
  roleLevels: z.array(z.enum(ROLE_LEVELS)).optional(),
  preferredLocations: z.array(z.string()).optional(),
  visaFilter: z.enum(VISA_FILTERS).optional(),
  roleFocus: z.enum(ROLE_FOCUS).optional(),
  keywordsInclude: z.array(z.string()).optional(),
  keywordsExclude: z.array(z.string()).optional(),
});

/**
 * GET /api/preferences/high-fit
 * Returns the current user's high-fit preferences.
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

    const preferences = await getHighFitPreferences({
      supabase,
      userId: user.id,
    });

    // Return preferences or defaults if not found
    return NextResponse.json(
      {
        data: preferences || DEFAULT_PREFERENCES,
        error: null,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      JSON.stringify({ level: "error", code: "HIGH_FIT_PREFS_GET_FAILED" })
    );
    return NextResponse.json(
      { data: null, error: { code: "FETCH_FAILED" } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/preferences/high-fit
 * Updates the current user's high-fit preferences.
 */
export async function PUT(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { data: null, error: { code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { data: null, error: { code: "INVALID_JSON" } },
        { status: 400 }
      );
    }

    const validation = preferencesSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { data: null, error: { code: "VALIDATION_FAILED" } },
        { status: 400 }
      );
    }

    await upsertHighFitPreferences({
      supabase,
      userId: user.id,
      values: validation.data,
    });

    return NextResponse.json(
      { data: { saved: true }, error: null },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      JSON.stringify({ level: "error", code: "HIGH_FIT_PREFS_SAVE_FAILED" })
    );
    return NextResponse.json(
      { data: null, error: { code: "SAVE_FAILED" } },
      { status: 500 }
    );
  }
}
