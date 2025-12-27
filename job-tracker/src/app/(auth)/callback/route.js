import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle error from Supabase (e.g., expired link)
  if (error) {
    console.error("Auth callback error:", error, errorDescription);
    return NextResponse.redirect(`${origin}/sign-in?error=invalid_link`);
  }

  // No code provided
  if (!code) {
    console.error("Auth callback: No code provided");
    return NextResponse.redirect(`${origin}/sign-in?error=invalid_link`);
  }

  // Exchange code for session
  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("Auth callback exchange error:", exchangeError.message);
    return NextResponse.redirect(`${origin}/sign-in?error=invalid_link`);
  }

  // Success - redirect to workspace
  return NextResponse.redirect(`${origin}/`);
}
