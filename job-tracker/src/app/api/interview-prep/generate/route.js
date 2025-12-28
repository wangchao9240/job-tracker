import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getApplicationById, updateApplication } from "@/lib/server/db/applicationsRepo";
import { generateInterviewPrep } from "@/lib/server/ai/interviewPrepGenerate";
import { insertStatusEvent } from "@/lib/server/db/statusEventsRepo";

// Validation schema for POST request
const generateRequestSchema = z.object({
  applicationId: z.string().uuid("Invalid application ID"),
  companyContextNotes: z.string().max(10000, "Company context cannot exceed 10,000 characters").optional().nullable(),
});

/**
 * POST /api/interview-prep/generate
 * Generates an interview preparation pack from an application's extracted requirements.
 * Returns the generated pack and persists it to the application.
 */
export async function POST(request) {
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

    const validation = generateRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { data: null, error: { code: "VALIDATION_FAILED", details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    const { applicationId, companyContextNotes } = validation.data;

    // Load the application (must be owned by the session user)
    const application = await getApplicationById({
      supabase,
      userId: user.id,
      id: applicationId,
    });

    if (!application) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    // Check if extracted requirements exist
    const extractedReqs = application.extractedRequirements;
    if (!extractedReqs ||
        (!extractedReqs.responsibilities?.length && !extractedReqs.requirements?.length)) {
      return NextResponse.json(
        { data: null, error: { code: "REQUIREMENTS_REQUIRED" } },
        { status: 400 }
      );
    }

    // Generate interview prep pack using AI
    let pack;
    try {
      pack = await generateInterviewPrep({
        company: application.company,
        role: application.role,
        responsibilities: extractedReqs.responsibilities || [],
        requirements: extractedReqs.requirements || [],
        focusResponsibilities: extractedReqs.focusResponsibilities || null,
        companyContext: companyContextNotes || null,
      });
    } catch (err) {
      console.log(
        JSON.stringify({
          level: "error",
          message: "Interview prep generation failed",
          applicationId,
          errorCode: err.code || "UNKNOWN",
        })
      );

      // Map AI error codes to user-friendly responses
      const errorCode = err.code || "GENERATION_FAILED";
      const isConfigError = errorCode === "AI_NOT_CONFIGURED";

      return NextResponse.json(
        {
          data: null,
          error: {
            code: isConfigError ? "AI_NOT_CONFIGURED" : "GENERATION_FAILED",
            message: isConfigError
              ? "AI generation is not configured"
              : "Failed to generate interview prep pack. Please try again.",
          },
        },
        { status: 500 }
      );
    }

    // Persist the generated pack to the application
    const updatedApp = await updateApplication({
      supabase,
      userId: user.id,
      id: applicationId,
      patch: {
        interviewPrepPack: pack,
      },
    });

    if (!updatedApp) {
      console.log(
        JSON.stringify({
          level: "error",
          message: "Failed to update application with interview prep pack",
          applicationId,
        })
      );
      return NextResponse.json(
        { data: null, error: { code: "UPDATE_FAILED" } },
        { status: 500 }
      );
    }

    // Create timeline event for interview prep generation (non-blocking)
    try {
      await insertStatusEvent({
        supabase,
        userId: user.id,
        applicationId,
        eventType: "interview_prep_generated",
        payload: {
          questionsCount: pack.questions?.length || 0,
        },
      });
    } catch (timelineErr) {
      console.log(
        JSON.stringify({
          level: "warn",
          message: "Failed to create timeline event for interview prep generation",
          applicationId,
          error: timelineErr.message,
        })
      );
    }

    // Return the generated pack
    return NextResponse.json(
      {
        data: {
          applicationId,
          pack,
        },
        error: null,
      },
      { status: 200 }
    );
  } catch (err) {
    console.log(
      JSON.stringify({
        level: "error",
        message: "POST /api/interview-prep/generate failed",
        error: err.message,
      })
    );
    return NextResponse.json(
      { data: null, error: { code: "SERVER_ERROR" } },
      { status: 500 }
    );
  }
}
