import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/me
 * Returns the current authenticated user's ID.
 * Returns standard envelope: { data, error }
 *
 * - 200: { data: { userId }, error: null }
 * - 401: { data: null, error: { code: "UNAUTHORIZED" } }
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { data: null, error: { code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { data: { userId: user.id }, error: null },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      JSON.stringify({ level: "error", code: "ME_UNEXPECTED_ERROR" })
    );
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL" } },
      { status: 500 }
    );
  }
}
