import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Handle error from Supabase (e.g., expired link)
  if (error) {
    console.error(
      JSON.stringify({ level: "error", code: "AUTH_CALLBACK_ERROR", error })
    );
    return NextResponse.redirect(`${origin}/sign-in?error=invalid_link`);
  }

  // No code provided
  if (!code) {
    console.error(
      JSON.stringify({ level: "error", code: "AUTH_CALLBACK_MISSING_CODE" })
    );
    return NextResponse.redirect(`${origin}/sign-in?error=invalid_link`);
  }

  // Exchange code for session
  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error(
      JSON.stringify({
        level: "error",
        code: "AUTH_CALLBACK_EXCHANGE_FAILED",
        status: exchangeError.status,
      })
    );
    return NextResponse.redirect(`${origin}/sign-in?error=invalid_link`);
  }

  // Success - redirect to workspace
  return NextResponse.redirect(`${origin}/`);
}
