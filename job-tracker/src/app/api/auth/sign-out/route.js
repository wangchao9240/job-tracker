import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/sign-out
 * Clears the cookie session and signs out the user.
 * Returns standard envelope: { data, error }
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(
        JSON.stringify({
          level: "error",
          code: "SIGN_OUT_FAILED",
          status: error.status,
        })
      );
      return NextResponse.json(
        { data: null, error: { code: "SIGN_OUT_FAILED" } },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: { signedOut: true }, error: null },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      JSON.stringify({ level: "error", code: "SIGN_OUT_UNEXPECTED_ERROR" })
    );
    return NextResponse.json(
      { data: null, error: { code: "SIGN_OUT_FAILED" } },
      { status: 500 }
    );
  }
}
