/**
 * POST /api/mapping/propose
 * Generate rule-based mapping proposal from application requirements to project bullets
 * Returns candidate bullet suggestions for each requirement/responsibility item
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getApplicationById } from "@/lib/server/db/applicationsRepo";
import { listProjectBullets } from "@/lib/server/db/projectBulletsRepo";
import { proposeMapping } from "@/lib/server/mapping/proposeRuleBased";

// Request validation schema
const proposeMappingSchema = z.object({
  applicationId: z.string().uuid("Application ID must be a valid UUID"),
});

/**
 * POST /api/mapping/propose
 * Generate mapping proposal for an application's requirements
 */
export async function POST(request) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ data: null, error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (err) {
      return NextResponse.json(
        { data: null, error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } },
        { status: 400 }
      );
    }

    const validation = proposeMappingSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "VALIDATION_FAILED",
            message: firstError.message,
            field: firstError.path.join("."),
          },
        },
        { status: 400 }
      );
    }

    const { applicationId } = validation.data;

    // Load application (must be owned by user)
    const application = await getApplicationById({
      supabase,
      userId: user.id,
      id: applicationId,
    });

    if (!application) {
      return NextResponse.json({ data: null, error: { code: "NOT_FOUND" } }, { status: 404 });
    }

    // Validate that requirements exist
    const extractedRequirements = application.extractedRequirements;
    if (
      !extractedRequirements ||
      typeof extractedRequirements !== "object" ||
      (!extractedRequirements.responsibilities?.length &&
        !extractedRequirements.requirements?.length)
    ) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "REQUIREMENTS_REQUIRED",
            message: "Application must have extracted requirements before mapping can be proposed",
          },
        },
        { status: 400 }
      );
    }

    // Load all user bullets (across all projects for MVP)
    const bullets = await listProjectBullets({
      supabase,
      userId: user.id,
      // projectId, q, tag are all omitted - load all bullets
    });

    if (!bullets || bullets.length === 0) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "BULLETS_REQUIRED",
            message: "User must have project bullets before mapping can be proposed",
          },
        },
        { status: 400 }
      );
    }

    // Combine responsibilities and requirements into items array
    const items = [];

    if (extractedRequirements.responsibilities && Array.isArray(extractedRequirements.responsibilities)) {
      extractedRequirements.responsibilities.forEach((text) => {
        if (text && typeof text === "string") {
          items.push({ kind: "responsibility", text });
        }
      });
    }

    if (extractedRequirements.requirements && Array.isArray(extractedRequirements.requirements)) {
      extractedRequirements.requirements.forEach((text) => {
        if (text && typeof text === "string") {
          items.push({ kind: "requirement", text });
        }
      });
    }

    // Run rule-based proposal algorithm
    const proposal = proposeMapping({ items, bullets });

    // Return proposal with metadata
    const generatedAt = new Date().toISOString();

    return NextResponse.json(
      {
        data: {
          proposal,
          generatedAt,
        },
        error: null,
      },
      { status: 200 }
    );
  } catch (err) {
    console.log(
      JSON.stringify({
        level: "error",
        message: "POST /api/mapping/propose failed",
        error: err.message,
      })
    );

    return NextResponse.json(
      { data: null, error: { code: "PROPOSE_FAILED", message: "Failed to generate mapping proposal" } },
      { status: 500 }
    );
  }
}
