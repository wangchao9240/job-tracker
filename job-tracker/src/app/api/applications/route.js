import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  createApplication,
  listApplications,
  findDuplicates,
} from "@/lib/server/db/applicationsRepo";
import {
  APPLICATION_STATUSES,
  APPLICATION_SOURCES,
  requiresAppliedDate,
} from "@/lib/utils/applicationStatus";
import { normalizeUrl, normalizeCompany, normalizeRole } from "@/lib/server/ingestion/normalizeUrl";

// Validation schema for POST request
const createApplicationSchema = z.object({
  company: z.string().min(1, "Company is required"),
  role: z.string().min(1, "Role is required"),
  link: z.string().optional().nullable(),
  status: z.enum(APPLICATION_STATUSES).optional().default("draft"),
  appliedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  source: z.enum(APPLICATION_SOURCES).optional().default("unknown"),
  location: z.string().optional().nullable(),
  jdSnapshot: z.string().max(100000, "Job description cannot exceed 100,000 characters").optional().nullable(),
  allowDuplicateUrl: z.boolean().optional().default(false),
});

/**
 * GET /api/applications
 * Returns the current user's applications list.
 * Supports query params: status, source, q (search), from, to (date range)
 */
export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { data: null, error: { code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    // Parse filter params from URL
    const { searchParams } = new URL(request.url);
    const filters = {};

    const status = searchParams.get("status");
    if (status && APPLICATION_STATUSES.includes(status)) {
      filters.status = status;
    }

    const source = searchParams.get("source");
    if (source && APPLICATION_SOURCES.includes(source)) {
      filters.source = source;
    }

    const q = searchParams.get("q");
    if (q && q.trim()) {
      filters.q = q.trim();
    }

    const from = searchParams.get("from");
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
      filters.from = from;
    }

    const to = searchParams.get("to");
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
      filters.to = to;
    }

    // Validate date range if both dates are provided
    if (filters.from && filters.to) {
      const fromDate = new Date(filters.from);
      const toDate = new Date(filters.to);

      if (fromDate > toDate) {
        return NextResponse.json(
          {
            data: null,
            error: {
              code: "INVALID_DATE_RANGE",
              message: "Start date must be before or equal to end date",
            },
          },
          { status: 400 }
        );
      }
    }

    const applications = await listApplications({
      supabase,
      userId: user.id,
      filters,
    });

    return NextResponse.json(
      { data: applications, error: null },
      { status: 200 }
    );
  } catch (err) {
    console.log(
      JSON.stringify({
        level: "error",
        message: "GET /api/applications failed",
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
 * POST /api/applications
 * Creates a new application.
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
    const validation = createApplicationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { data: null, error: { code: "VALIDATION_FAILED", details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    const values = validation.data;

    // Server-side enforcement: if status requires appliedDate, it must be provided
    if (requiresAppliedDate(values.status) && !values.appliedDate) {
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

    // Check for URL duplicates if link is provided (strong match)
    if (values.link && !values.allowDuplicateUrl) {
      const canonicalUrl = normalizeUrl(values.link);
      if (canonicalUrl) {
        const duplicates = await findDuplicates({
          supabase,
          userId: user.id,
          check: {
            normalizedUrl: canonicalUrl,
          },
        });

        if (duplicates.urlMatches.length > 0) {
          return NextResponse.json(
            {
              data: null,
              error: {
                code: "DUPLICATE_URL",
                duplicates: duplicates.urlMatches,
              },
            },
            { status: 409 }
          );
        }
      }
    }

    // Check for company+role duplicates (weak match, non-blocking warning)
    let companyRoleDuplicates = [];
    const normalizedCompany = normalizeCompany(values.company);
    const normalizedRole = normalizeRole(values.role);
    if (normalizedCompany && normalizedRole) {
      const duplicates = await findDuplicates({
        supabase,
        userId: user.id,
        check: {
          normalizedCompany,
          normalizedRole,
        },
      });
      companyRoleDuplicates = duplicates.companyRoleMatches;
    }

    // Remove allowDuplicateUrl before creating (not a DB field)
    const { allowDuplicateUrl: _, ...applicationValues } = values;

    const application = await createApplication({
      supabase,
      userId: user.id,
      values: applicationValues,
    });

    // Include company+role duplicates in response (non-blocking warning for UI)
    const responseData = {
      ...application,
      duplicates: {
        companyRoleMatches: companyRoleDuplicates,
      },
    };

    return NextResponse.json(
      { data: responseData, error: null },
      { status: 201 }
    );
  } catch (err) {
    console.log(
      JSON.stringify({
        level: "error",
        message: "POST /api/applications failed",
        error: err.message,
      })
    );
    return NextResponse.json(
      { data: null, error: { code: "CREATE_FAILED" } },
      { status: 500 }
    );
  }
}
