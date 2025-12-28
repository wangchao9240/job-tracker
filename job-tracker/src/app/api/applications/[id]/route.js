import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  getApplicationById,
  updateApplication,
} from "@/lib/server/db/applicationsRepo";
import { insertStatusEvents } from "@/lib/server/db/statusEventsRepo";
import {
  APPLICATION_STATUSES,
  requiresAppliedDate,
} from "@/lib/utils/applicationStatus";

// Maximum items per requirements list
const MAX_REQUIREMENTS_ITEMS = 50;
// Maximum characters per item
const MAX_ITEM_LENGTH = 200;

// Schema for quality metadata from low-signal detection
const qualitySchema = z.object({
  isLowSignal: z.boolean(),
  reasons: z.array(z.string()),
});

// Schema for extractedRequirements JSONB
const extractedRequirementsSchema = z.object({
  responsibilities: z
    .array(
      z.string().min(1, "Item cannot be empty").max(MAX_ITEM_LENGTH, `Item cannot exceed ${MAX_ITEM_LENGTH} characters`)
    )
    .max(MAX_REQUIREMENTS_ITEMS, `Cannot exceed ${MAX_REQUIREMENTS_ITEMS} responsibilities`),
  requirements: z
    .array(
      z.string().min(1, "Item cannot be empty").max(MAX_ITEM_LENGTH, `Item cannot exceed ${MAX_ITEM_LENGTH} characters`)
    )
    .max(MAX_REQUIREMENTS_ITEMS, `Cannot exceed ${MAX_REQUIREMENTS_ITEMS} requirements`),
  extractedAt: z.string().optional(),
  updatedAt: z.string().optional(),
  source: z.enum(["ai", "manual", "mixed"]).optional(),
  // Low-signal detection results
  quality: qualitySchema.optional().nullable(),
  // Focus set for key responsibilities
  focusResponsibilities: z
    .array(z.string().min(1, "Item cannot be empty"))
    .max(MAX_REQUIREMENTS_ITEMS)
    .optional()
    .nullable(),
  focusSetUpdatedAt: z.string().optional().nullable(),
  // Track if user dismissed the focus prompt
  focusDismissed: z.boolean().optional(),
});

// Schema for confirmedMapping JSONB
// Canonical shape for persisting user-confirmed requirement → bullet mapping
const confirmedMappingItemSchema = z.object({
  itemKey: z.string().min(1, "Item key is required"), // Stable key (e.g., "responsibility-0" or hash)
  kind: z.enum(["responsibility", "requirement"]),
  text: z.string().min(1, "Item text is required").max(MAX_ITEM_LENGTH), // Snapshot of requirement text
  bulletIds: z.array(z.string().uuid()).max(10, "Cannot map more than 10 bullets per item"),
  uncovered: z.boolean(), // True if user marked as uncovered (no suitable evidence)
});

const confirmedMappingSchema = z.object({
  version: z.literal(1), // Schema version for future evolution
  confirmedAt: z.string(), // ISO-8601 timestamp when mapping was last confirmed
  items: z
    .array(confirmedMappingItemSchema)
    .max(MAX_REQUIREMENTS_ITEMS * 2, "Too many mapping items"), // Max = responsibilities + requirements
});

// Validation schema for PATCH request
const updateApplicationSchema = z.object({
  company: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  link: z.string().optional().nullable(),
  status: z.enum(APPLICATION_STATUSES).optional(),
  appliedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  jdSnapshot: z.string().max(100000, "Job description cannot exceed 100,000 characters").optional().nullable(),
  extractedRequirements: extractedRequirementsSchema.optional().nullable(),
  confirmedMapping: confirmedMappingSchema.optional().nullable(),
  interviewPrepNotes: z.string().max(50000, "Interview prep notes cannot exceed 50,000 characters").optional().nullable(),
});

/**
 * Truncate field value for timeline event payload
 * Prevents bloating event storage with long field values
 * @param {string|null} value - Field value to truncate
 * @param {number} maxLength - Maximum length (default 200)
 * @returns {string|null} Truncated value with ellipsis if needed
 */
function truncateForTimeline(value, maxLength = 200) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    return value;
  }
  if (value.length <= maxLength) {
    return value;
  }
  return value.slice(0, maxLength) + "...";
}

/**
 * GET /api/applications/[id]
 * Returns a specific application by ID.
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

    return NextResponse.json(
      { data: application, error: null },
      { status: 200 }
    );
  } catch (err) {
    console.log(
      JSON.stringify({
        level: "error",
        message: "GET /api/applications/[id] failed",
        error: err.message,
      })
    );
    return NextResponse.json(
      { data: null, error: { code: "FETCH_FAILED" } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/applications/[id]
 * Updates a specific application by ID.
 * Returns 404 for both not found and not owned (no leakage).
 */
export async function PATCH(request, { params }) {
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

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { data: null, error: { code: "INVALID_JSON" } },
        { status: 400 }
      );
    }

    // Validate with zod
    const validation = updateApplicationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { data: null, error: { code: "VALIDATION_FAILED", details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    const patch = validation.data;

    // Get existing application to merge with patch for validation
    const existing = await getApplicationById({
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

    // Merge patch with existing to get final values for cross-field validation
    const finalStatus = patch.status ?? existing.status;
    const finalAppliedDate = patch.appliedDate !== undefined ? patch.appliedDate : existing.appliedDate;

    // Server-side enforcement: if status requires appliedDate, it must be provided
    if (requiresAppliedDate(finalStatus) && !finalAppliedDate) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "VALIDATION_FAILED",
            message: "Applied date is required for this status",
          },
        },
        { status: 400 }
      );
    }

    // Handle extractedRequirements: add updatedAt timestamp and determine source
    if (patch.extractedRequirements) {
      const existingReqs = existing.extractedRequirements;
      const now = new Date().toISOString();

      // Determine source: if previously AI-extracted and now edited, mark as mixed
      let source = patch.extractedRequirements.source;
      if (!source) {
        if (existingReqs?.source === "ai") {
          source = "mixed";
        } else if (existingReqs?.source) {
          source = existingReqs.source;
        } else {
          source = "manual";
        }
      }

      // Get the final responsibilities list for focus validation
      const finalResponsibilities = patch.extractedRequirements.responsibilities || existingReqs?.responsibilities || [];

      // Handle focusResponsibilities: validate items exist in responsibilities (best-effort)
      let focusResponsibilities = patch.extractedRequirements.focusResponsibilities;
      let focusSetUpdatedAt = patch.extractedRequirements.focusSetUpdatedAt || existingReqs?.focusSetUpdatedAt || null;
      let focusDismissed = patch.extractedRequirements.focusDismissed ?? existingReqs?.focusDismissed ?? false;

      if (focusResponsibilities !== undefined) {
        if (focusResponsibilities === null) {
          // User is clearing focus set
          focusSetUpdatedAt = now;
        } else if (Array.isArray(focusResponsibilities) && focusResponsibilities.length > 0) {
          // Validate that focus items exist in responsibilities (best-effort, filter invalid)
          const validFocusItems = focusResponsibilities.filter((item) =>
            finalResponsibilities.includes(item)
          );

          if (validFocusItems.length === 0 && focusResponsibilities.length > 0) {
            // All items are invalid - return error
            return NextResponse.json(
              {
                data: null,
                error: {
                  code: "VALIDATION_FAILED",
                  message: "Focus responsibilities must be from the current responsibilities list",
                },
              },
              { status: 400 }
            );
          }

          // Use only valid items (best-effort filtering)
          focusResponsibilities = validFocusItems;
          focusSetUpdatedAt = now;
        }
      } else {
        // Preserve existing focus data if not explicitly set
        focusResponsibilities = existingReqs?.focusResponsibilities || null;
      }

      // Merge with timestamps, preserving quality metadata unless overwritten
      patch.extractedRequirements = {
        ...patch.extractedRequirements,
        extractedAt: patch.extractedRequirements.extractedAt || existingReqs?.extractedAt || null,
        updatedAt: now,
        source,
        // Preserve quality unless explicitly overwritten
        quality: patch.extractedRequirements.quality ?? existingReqs?.quality ?? null,
        // Focus set fields
        focusResponsibilities,
        focusSetUpdatedAt,
        focusDismissed,
      };
    }

    // Compute meaningful changes and create events BEFORE update
    // This ensures we never lose events - if update fails, we may have orphaned events,
    // but they're filtered by ownership check and are just metadata
    const events = [];

    // Check for status change
    if (patch.status !== undefined && patch.status !== existing.status) {
      events.push({
        eventType: "status_changed",
        payload: {
          from: existing.status,
          to: patch.status,
        },
      });
    }

    // Check for field changes (company, role, link, location, interviewPrepNotes)
    const trackedFields = ["company", "role", "link", "location", "interviewPrepNotes"];
    for (const field of trackedFields) {
      if (patch[field] !== undefined && patch[field] !== existing[field]) {
        events.push({
          eventType: "field_changed",
          payload: {
            field,
            from: truncateForTimeline(existing[field]),
            to: truncateForTimeline(patch[field]),
          },
        });
      }
    }

    // Special handling for jdSnapshot - track only metadata, not content
    if (patch.jdSnapshot !== undefined && patch.jdSnapshot !== existing.jdSnapshot) {
      events.push({
        eventType: "jd_snapshot_updated",
        payload: {
          fromLength: existing.jdSnapshot ? existing.jdSnapshot.length : 0,
          toLength: patch.jdSnapshot ? patch.jdSnapshot.length : 0,
        },
      });
    }

    // Track requirements editing (manual or mixed updates after extraction)
    if (patch.extractedRequirements !== undefined) {
      const existingReqs = existing.extractedRequirements;
      const newReqs = patch.extractedRequirements;

      // Only create event if this is an update to existing requirements (not initial extraction)
      // Initial extraction is tracked by requirements_extracted event in extract endpoint
      if (existingReqs && newReqs && existingReqs.extractedAt) {
        const responsibilitiesChanged =
          JSON.stringify(existingReqs.responsibilities) !== JSON.stringify(newReqs.responsibilities);
        const requirementsChanged =
          JSON.stringify(existingReqs.requirements) !== JSON.stringify(newReqs.requirements);

        if (responsibilitiesChanged || requirementsChanged) {
          events.push({
            eventType: "requirements_updated",
            payload: {
              responsibilitiesCount: newReqs.responsibilities?.length || 0,
              requirementsCount: newReqs.requirements?.length || 0,
            },
          });
        }

        // Track focus set changes
        const focusChanged =
          JSON.stringify(existingReqs.focusResponsibilities) !== JSON.stringify(newReqs.focusResponsibilities);

        if (focusChanged) {
          const focusCount = newReqs.focusResponsibilities?.length || 0;
          const oldFocusCount = existingReqs.focusResponsibilities?.length || 0;
          let action;

          if (focusCount === 0 && oldFocusCount > 0) {
            action = "cleared";
          } else if (focusCount > 0 && oldFocusCount === 0) {
            action = "set";
          } else if (focusCount > 0 && oldFocusCount > 0) {
            action = "updated";
          }

          if (action) {
            events.push({
              eventType: "focus_set_updated",
              payload: {
                action,
                count: focusCount,
              },
            });
          }
        }
      }
    }

    // Update application (core operation)
    const application = await updateApplication({
      supabase,
      userId: user.id,
      id,
      patch,
    });

    if (!application) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    // Insert timeline events as best-effort (never block saving if timeline is misconfigured)
    if (events.length > 0) {
      try {
        await insertStatusEvents({
          supabase,
          userId: user.id,
          applicationId: id,
          events,
        });
      } catch (timelineErr) {
        console.log(
          JSON.stringify({
            level: "warn",
            message: "Failed to insert status events (non-blocking)",
            applicationId: id,
            error: timelineErr.message,
          })
        );
      }
    }

    return NextResponse.json(
      { data: application, error: null },
      { status: 200 }
    );
  } catch (err) {
    const debug =
      process.env.NODE_ENV !== "production"
        ? {
            message: err.message,
            code: err.code,
            details: err.details,
            hint: err.hint,
          }
        : {};
    console.log(
      JSON.stringify({
        level: "error",
        message: "PATCH /api/applications/[id] failed",
        error: err.message,
      })
    );
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "UPDATE_FAILED",
          ...debug,
        },
      },
      { status: 500 }
    );
  }
}
