import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/cron/reminders
 * Cron endpoint to compute no-response follow-up reminders.
 * Requires Authorization: Bearer <CRON_SECRET>
 * Idempotent - safe to retry.
 */
export async function POST(request) {
  try {
    // Verify cron secret
    // IMPORTANT: Never log the CRON_SECRET value or authorization header in error logs
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.log(
        JSON.stringify({
          level: "error",
          message: "CRON_SECRET not configured",
        })
      );
      return NextResponse.json(
        { data: null, error: { code: "SERVER_ERROR" } },
        { status: 500 }
      );
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      // Log auth failure without exposing the secret
      console.log(
        JSON.stringify({
          level: "warn",
          message: "Unauthorized cron request",
          hasAuthHeader: !!authHeader,
        })
      );
      return NextResponse.json(
        { data: null, error: { code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();

    // Calculate 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString().split("T")[0];

    // Find all applications in "applied" status with applied_date older than 7 days
    const { data: eligibleApplications, error: fetchError } = await supabase
      .from("applications")
      .select("id, user_id, applied_date")
      .eq("status", "applied")
      .lte("applied_date", cutoffDate);

    if (fetchError) {
      console.log(
        JSON.stringify({
          level: "error",
          message: "Failed to fetch eligible applications",
          error: fetchError.message,
        })
      );
      return NextResponse.json(
        { data: null, error: { code: "FETCH_FAILED" } },
        { status: 500 }
      );
    }

    if (!eligibleApplications || eligibleApplications.length === 0) {
      console.log(
        JSON.stringify({
          level: "info",
          message: "No eligible applications for reminders",
        })
      );
      return NextResponse.json(
        { data: { processed: 0, created: 0 }, error: null },
        { status: 200 }
      );
    }

    // Upsert reminders for each eligible application
    let created = 0;
    for (const app of eligibleApplications) {
      // Calculate due date (applied_date + 7 days)
      const dueAt = new Date(app.applied_date);
      dueAt.setDate(dueAt.getDate() + 7);

      const { error: upsertError } = await supabase
        .from("reminders")
        .upsert(
          {
            application_id: app.id,
            user_id: app.user_id,
            type: "no_response_follow_up",
            due_at: dueAt.toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "application_id,type",
            ignoreDuplicates: false,
          }
        );

      if (upsertError) {
        console.log(
          JSON.stringify({
            level: "warn",
            message: "Failed to upsert reminder",
            applicationId: app.id,
            error: upsertError.message,
          })
        );
      } else {
        created++;
      }
    }

    console.log(
      JSON.stringify({
        level: "info",
        message: "Cron reminders completed",
        processed: eligibleApplications.length,
        created,
      })
    );

    return NextResponse.json(
      { data: { processed: eligibleApplications.length, created }, error: null },
      { status: 200 }
    );
  } catch (err) {
    console.log(
      JSON.stringify({
        level: "error",
        message: "POST /api/cron/reminders failed",
        error: err.message,
      })
    );
    return NextResponse.json(
      { data: null, error: { code: "SERVER_ERROR" } },
      { status: 500 }
    );
  }
}
