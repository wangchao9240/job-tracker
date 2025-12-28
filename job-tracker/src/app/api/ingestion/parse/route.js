import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { detectSource, validateUrl, JOB_SOURCES } from "@/lib/server/ingestion/sourceDetect";
import { normalizeOrNull, htmlToText } from "@/lib/server/ingestion/normalize";
import { normalizeUrl } from "@/lib/server/ingestion/normalizeUrl";
import { findDuplicates } from "@/lib/server/db/applicationsRepo";

// Validation schema
const parseRequestSchema = z.object({
  url: z.string().min(1, "URL is required"),
  allowDuplicateUrl: z.boolean().optional().default(false),
});

// Timeout for fetch requests (10 seconds)
const FETCH_TIMEOUT = 10000;

/**
 * Attempt to extract job details from HTML
 * @param {string} html - The page HTML
 * @param {string} source - The detected source (seek, linkedin, etc.)
 * @returns {Object} Extracted fields
 */
function extractFromHtml(html, source) {
  const result = {
    company: null,
    role: null,
    location: null,
    jdSnapshot: null,
  };

  if (!html) return result;

  // Try to extract from common meta tags and structured data
  try {
    // Extract title - often contains role
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      const title = normalizeOrNull(titleMatch[1]);
      // Title often contains "Role at Company" or "Role - Company"
      if (title) {
        const atMatch = title.match(/^(.+?)\s+at\s+(.+?)(?:\s*[-|]|$)/i);
        const dashMatch = title.match(/^(.+?)\s*[-|]\s*(.+?)(?:\s*[-|]|$)/i);

        if (atMatch) {
          result.role = normalizeOrNull(atMatch[1]);
          result.company = normalizeOrNull(atMatch[2]);
        } else if (dashMatch && !result.role) {
          result.role = normalizeOrNull(dashMatch[1]);
        }
      }
    }

    // Try Open Graph tags
    const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);

    if (ogTitleMatch && !result.role) {
      result.role = normalizeOrNull(ogTitleMatch[1]);
    }

    // Try to get company from meta tags
    const companyMeta = html.match(/<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i);
    if (companyMeta && !result.company) {
      result.company = normalizeOrNull(companyMeta[1]);
    }

    // Source-specific extraction
    if (source === "seek") {
      // Seek-specific patterns
      const seekCompanyMatch = html.match(/data-automation="advertiser-name"[^>]*>([^<]+)</i);
      if (seekCompanyMatch) {
        result.company = normalizeOrNull(seekCompanyMatch[1]);
      }

      const seekLocationMatch = html.match(/data-automation="job-detail-location"[^>]*>([^<]+)</i);
      if (seekLocationMatch) {
        result.location = normalizeOrNull(seekLocationMatch[1]);
      }
    }

    if (source === "linkedin") {
      // LinkedIn-specific patterns
      const linkedinCompanyMatch = html.match(/class="[^"]*company[^"]*"[^>]*>([^<]+)</i);
      if (linkedinCompanyMatch) {
        result.company = normalizeOrNull(linkedinCompanyMatch[1]);
      }
    }

    // Extract job description from main content
    // Look for common job description containers
    const jdPatterns = [
      /<div[^>]+class="[^"]*job-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]+class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<section[^>]+class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
      /<article[^>]*>([\s\S]*?)<\/article>/i,
    ];

    for (const pattern of jdPatterns) {
      const match = html.match(pattern);
      if (match) {
        const text = htmlToText(match[1]);
        if (text && text.length > 100) { // Only use if substantial content
          result.jdSnapshot = text.slice(0, 50000); // Limit size
          break;
        }
      }
    }

    // Fallback: try to get description from meta
    if (!result.jdSnapshot && ogDescMatch) {
      const desc = normalizeOrNull(ogDescMatch[1]);
      if (desc && desc.length > 50) {
        result.jdSnapshot = desc;
      }
    }
  } catch (err) {
    // Extraction failed, return partial results
    console.log(
      JSON.stringify({
        level: "warn",
        message: "HTML extraction failed",
        source,
        error: err.message,
      })
    );
  }

  // Log when extraction patterns found nothing (possible pattern degradation)
  const extractedCount = Object.values(result).filter(v => v !== null).length;
  if (extractedCount === 0 && html && html.length > 0) {
    console.log(
      JSON.stringify({
        level: "warn",
        message: "Extraction patterns found no fields",
        source,
        htmlLength: html.length,
        note: "Extraction patterns may be outdated - job board HTML may have changed"
      })
    );
  }

  return result;
}

/**
 * Fetch URL with timeout
 * @param {string} url - URL to fetch
 * @returns {Promise<{ ok: boolean, status: number|null, html: string|null, blockedBy: string|null, error: string|null }>}
 */
async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; JobTracker/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    clearTimeout(timeoutId);
    const cfMitigated = response.headers.get("cf-mitigated");

    if (!response.ok) {
      // Some job boards (e.g. Seek) are protected by bot mitigation (Cloudflare challenge),
      // which cannot be fetched reliably via server-side HTTP without a real browser session.
      const blockedBy = response.status === 403 && cfMitigated ? "cloudflare-challenge" : null;
      return { ok: false, status: response.status, html: null, blockedBy, error: "HTTP_ERROR" };
    }

    const html = await response.text();
    return { ok: true, status: response.status, html, blockedBy: null, error: null };
  } catch (err) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === "AbortError";
    return { ok: false, status: null, html: null, blockedBy: null, error: isTimeout ? "TIMEOUT" : "FETCH_FAILED" };
  }
}

/**
 * POST /api/ingestion/parse
 * Create application from URL with source detection and best-effort extraction.
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

    const validation = parseRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { data: null, error: { code: "VALIDATION_FAILED", details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    // Validate and normalize URL
    const urlResult = validateUrl(validation.data.url);
    if (!urlResult.valid) {
      return NextResponse.json(
        { data: null, error: { code: "INVALID_URL", message: urlResult.error } },
        { status: 400 }
      );
    }

    const normalizedUrl = urlResult.normalized;

    // Detect source
    const source = detectSource(normalizedUrl);

    // Validate source (defensive check)
    if (!JOB_SOURCES.includes(source)) {
      console.log(
        JSON.stringify({
          level: "error",
          message: "Invalid source detected",
          source,
          url: normalizedUrl,
        })
      );
      return NextResponse.json(
        { data: null, error: { code: "INVALID_SOURCE" } },
        { status: 500 }
      );
    }

    // Check for duplicates
    const canonicalUrl = normalizeUrl(normalizedUrl);
    const duplicates = await findDuplicates({
      supabase,
      userId: user.id,
      check: {
        normalizedUrl: canonicalUrl,
      },
    });

    // Strong duplicate: URL match - block unless override flag is set
    if (duplicates.urlMatches.length > 0 && !validation.data.allowDuplicateUrl) {
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

    // Prepare response data (no DB writes; client will create after user confirms required fields)
    const responseData = {
      source,
      normalizedUrl,
      extracted: {},
      missing: [],
      recoveryAction: null,
      warnings: [],
      duplicates: {
        urlMatches: duplicates.urlMatches,
        companyRoleMatches: [], // Will be populated after extraction if company/role found
      },
    };

    // Attempt best-effort extraction for known sources
    if (source === "seek" || source === "linkedin") {
      try {
        const fetched = await fetchWithTimeout(normalizedUrl);
        if (fetched.ok && fetched.html) {
          const extracted = extractFromHtml(fetched.html, source);

          if (extracted.company) {
            responseData.extracted.company = extracted.company;
          }
          if (extracted.role) {
            responseData.extracted.role = extracted.role;
          }
          if (extracted.location) {
            responseData.extracted.location = extracted.location;
          }
          if (extracted.jdSnapshot) {
            responseData.extracted.jdSnapshot = true; // Don't send full text in response
          }
        } else if (fetched.blockedBy) {
          responseData.warnings.push({
            code: "FETCH_BLOCKED",
            message: "This site blocked automated fetching (anti-bot challenge). Paste the job description manually.",
          });
        }
      } catch (err) {
        // Extraction failed, but application is saved
        console.log(
          JSON.stringify({
            level: "warn",
            message: "Extraction failed",
            source,
            error: err.message,
          })
        );
      }
    }

    // Check for company+role duplicates if we extracted both (weak match)
    if (responseData.extracted.company && responseData.extracted.role) {
      const { normalizeCompany, normalizeRole } = await import("@/lib/server/ingestion/normalizeUrl");
      const normalizedCompany = normalizeCompany(responseData.extracted.company);
      const normalizedRole = normalizeRole(responseData.extracted.role);

      if (normalizedCompany && normalizedRole) {
        const companyRoleDuplicates = await findDuplicates({
          supabase,
          userId: user.id,
          check: {
            normalizedCompany,
            normalizedRole,
          },
        });
        responseData.duplicates.companyRoleMatches = companyRoleDuplicates.companyRoleMatches;
      }
    }

    // Determine missing fields
    const trackedFields = ["company", "role", "location", "jdSnapshot"];
    for (const field of trackedFields) {
      if (!responseData.extracted[field]) {
        responseData.missing.push(field);
      }
    }

    // Always offer pasteJd as recovery action when jdSnapshot is missing
    if (responseData.missing.includes("jdSnapshot")) {
      responseData.recoveryAction = "pasteJd";
    }

    return NextResponse.json(
      { data: responseData, error: null },
      { status: 200 }
    );
  } catch (err) {
    console.log(
      JSON.stringify({
        level: "error",
        message: "POST /api/ingestion/parse failed",
        error: err.message,
      })
    );
    return NextResponse.json(
      { data: null, error: { code: "SERVER_ERROR" } },
      { status: 500 }
    );
  }
}
