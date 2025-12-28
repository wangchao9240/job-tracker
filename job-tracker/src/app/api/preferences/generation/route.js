import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  getGenerationPreferences,
  upsertGenerationPreferences,
} from "@/lib/server/db/generationPreferencesRepo";

// Default values for preferences
const DEFAULT_PREFERENCES = {
  tone: "professional",
  emphasis: [],
  keywordsInclude: [],
  keywordsAvoid: [],
};

// Validation schema for PUT request
const preferencesSchema = z.object({
  tone: z.string().optional(),
  emphasis: z.array(z.string()).optional(),
  keywordsInclude: z.array(z.string()).optional(),
  keywordsAvoid: z.array(z.string()).optional(),
});

/**
 * GET /api/preferences/generation
 * Returns the current user's generation preferences.
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

    const preferences = await getGenerationPreferences({
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
    console.log(
      JSON.stringify({
        level: "error",
        message: "GET /api/preferences/generation error",
        error: err.message,
        userId: "unknown",
      })
    );
    return NextResponse.json(
      { data: null, error: { code: "FETCH_FAILED" } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/preferences/generation
 * Updates the current user's generation preferences.
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

    await upsertGenerationPreferences({
      supabase,
      userId: user.id,
      values: validation.data,
    });

    return NextResponse.json(
      { data: { saved: true }, error: null },
      { status: 200 }
    );
  } catch (err) {
    console.log(
      JSON.stringify({
        level: "error",
        message: "PUT /api/preferences/generation error",
        error: err.message,
        userId: "unknown",
      })
    );
    return NextResponse.json(
      { data: null, error: { code: "SAVE_FAILED" } },
      { status: 500 }
    );
  }
}
