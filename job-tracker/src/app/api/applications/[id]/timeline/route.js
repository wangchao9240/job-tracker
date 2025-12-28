import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getApplicationById } from "@/lib/server/db/applicationsRepo";
import { listStatusEvents } from "@/lib/server/db/statusEventsRepo";

/**
 * GET /api/applications/[id]/timeline
 * Returns the timeline/history events for a specific application.
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

    // First check if application exists and is owned by user
    const application = await getApplicationById({
      supabase,
      userId: user.id,
      id,
    });

    if (!application) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    // Get timeline events
    const events = await listStatusEvents({
      supabase,
      userId: user.id,
      applicationId: id,
    });

    return NextResponse.json(
      { data: events, error: null },
      { status: 200 }
    );
  } catch (err) {
    console.log(
      JSON.stringify({
        level: "error",
        message: "GET /api/applications/[id]/timeline failed",
        error: err.message,
      })
    );
    return NextResponse.json(
      { data: null, error: { code: "FETCH_FAILED" } },
      { status: 500 }
    );
  }
}
