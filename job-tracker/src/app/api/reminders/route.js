import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listActiveRemindersForUser } from "@/lib/server/db/remindersRepo";

/**
 * GET /api/reminders
 * Returns active reminders for the current user (not dismissed, due date reached).
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

    const reminders = await listActiveRemindersForUser({
      supabase,
      userId: user.id,
    });

    return NextResponse.json(
      { data: reminders, error: null },
      { status: 200 }
    );
  } catch (err) {
    console.log(
      JSON.stringify({
        level: "error",
        message: "GET /api/reminders failed",
        error: err.message,
      })
    );
    return NextResponse.json(
      { data: null, error: { code: "FETCH_FAILED" } },
      { status: 500 }
    );
  }
}
