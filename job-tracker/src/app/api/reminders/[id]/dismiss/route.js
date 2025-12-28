import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dismissReminder, getReminderById } from "@/lib/server/db/remindersRepo";

/**
 * POST /api/reminders/[id]/dismiss
 * Dismisses a reminder (marks as followed up).
 * Returns 404 for both not found and not owned (no leakage).
 */
export async function POST(request, { params }) {
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

    // Check if reminder exists and is owned by user
    const existing = await getReminderById({
      supabase,
      userId: user.id,
      id,
    });

    if (!existing) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    // Already dismissed
    if (existing.dismissedAt) {
      return NextResponse.json(
        { data: existing, error: null },
        { status: 200 }
      );
    }

    const reminder = await dismissReminder({
      supabase,
      userId: user.id,
      id,
    });

    if (!reminder) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { data: reminder, error: null },
      { status: 200 }
    );
  } catch (err) {
    console.log(
      JSON.stringify({
        level: "error",
        message: "POST /api/reminders/[id]/dismiss failed",
        error: err.message,
      })
    );
    return NextResponse.json(
      { data: null, error: { code: "DISMISS_FAILED" } },
      { status: 500 }
    );
  }
}
