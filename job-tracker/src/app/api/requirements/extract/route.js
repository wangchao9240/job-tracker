import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getApplicationById, updateExtractedRequirements } from "@/lib/server/db/applicationsRepo";
import { extractRequirements } from "@/lib/server/ai/requirementsExtract";
import { insertStatusEvent } from "@/lib/server/db/statusEventsRepo";
import { detectLowSignal } from "@/lib/server/requirements/lowSignalDetect";

// Validation schema for POST request
const extractRequestSchema = z.object({
  applicationId: z.string().uuid("Invalid application ID"),
});

/**
 * POST /api/requirements/extract
 * Extracts responsibilities and requirements from an application's JD snapshot.
 * Returns the extracted lists and persists them to the application.
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

    const validation = extractRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { data: null, error: { code: "VALIDATION_FAILED", details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    const { applicationId } = validation.data;

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

    // Check if JD snapshot exists
    if (!application.jdSnapshot || application.jdSnapshot.trim().length === 0) {
      return NextResponse.json(
        { data: null, error: { code: "JD_SNAPSHOT_REQUIRED" } },
        { status: 400 }
      );
    }

    // Extract requirements using AI
    let extractedData;
    try {
      extractedData = await extractRequirements(application.jdSnapshot);
    } catch (err) {
      console.log(
        JSON.stringify({
          level: "error",
          message: "Requirements extraction failed",
          applicationId,
          errorCode: err.code || "UNKNOWN",
          errorStatus: err.status,
        })
      );

      // Map AI error codes to user-friendly responses
      const errorCode = err.code || "EXTRACTION_FAILED";
      const isConfigError = errorCode === "AI_NOT_CONFIGURED";
      const isRequestError = errorCode === "AI_REQUEST_FAILED";
      const isAiError = typeof errorCode === "string" && errorCode.startsWith("AI_");
      const debug = process.env.NODE_ENV !== "production"
        ? { message: err.message, details: err.details, status: err.status }
        : {};

      return NextResponse.json(
        {
          data: null,
          error: {
            code: isConfigError ? "AI_NOT_CONFIGURED" : isAiError ? errorCode : "EXTRACTION_FAILED",
            message: isConfigError
              ? "AI extraction is not configured"
              : isRequestError && process.env.NODE_ENV !== "production"
                ? `AI request failed (status ${err.status || "unknown"}). Check JOB_OPENAI_API_KEY/JOB_OPENAI_BASE_URL.`
                : "Failed to extract requirements. Please try again.",
            ...debug,
          },
        },
        { status: isConfigError ? 500 : isRequestError ? 502 : 500 }
      );
    }

    // Run low-signal detection on the JD and extraction results
    const quality = detectLowSignal({
      jdText: application.jdSnapshot,
      responsibilities: extractedData.responsibilities,
    });

    // Prepare the extracted requirements object
    const extractedAt = new Date().toISOString();
    const extractedRequirements = {
      responsibilities: extractedData.responsibilities,
      requirements: extractedData.requirements,
      extractedAt,
      updatedAt: extractedAt,
      source: "ai",
      quality,
      // Clear any previous focus set on fresh extraction
      focusResponsibilities: null,
      focusSetUpdatedAt: null,
      focusDismissed: false,
    };

    // Persist the extracted lists to the application using dedicated repo method
    // This method validates the structure before persisting
    const updatedApp = await updateExtractedRequirements({
      supabase,
      userId: user.id,
      id: applicationId,
      extractedRequirements,
    });

    if (!updatedApp) {
      // This shouldn't happen since we already verified ownership, but handle it
      console.log(
        JSON.stringify({
          level: "error",
          message: "Failed to update application with extracted requirements",
          applicationId,
        })
      );
      return NextResponse.json(
        { data: null, error: { code: "UPDATE_FAILED" } },
        { status: 500 }
      );
    }

    // Create timeline event for extraction (non-blocking - don't fail request if this fails)
    try {
      await insertStatusEvent({
        supabase,
        userId: user.id,
        applicationId,
        eventType: "requirements_extracted",
        payload: {
          responsibilitiesCount: extractedData.responsibilities.length,
          requirementsCount: extractedData.requirements.length,
        },
      });
    } catch (timelineErr) {
      // Log but don't fail the request
      console.log(
        JSON.stringify({
          level: "warn",
          message: "Failed to create timeline event for requirements extraction",
          applicationId,
          error: timelineErr.message,
        })
      );
    }

    // Return the extracted data with quality metadata for UI prompting
    return NextResponse.json(
      {
        data: {
          applicationId,
          responsibilities: extractedData.responsibilities,
          requirements: extractedData.requirements,
          extractedAt,
          quality,
        },
        error: null,
      },
      { status: 200 }
    );
  } catch (err) {
    console.log(
      JSON.stringify({
        level: "error",
        message: "POST /api/requirements/extract failed",
        error: err.message,
      })
    );
    return NextResponse.json(
      { data: null, error: { code: "SERVER_ERROR" } },
      { status: 500 }
    );
  }
}
