/**
 * Applications Repository
 * Server-only module for accessing applications table.
 * DO NOT import this file in Client Components.
 */

import { normalizeUrl } from "../ingestion/normalizeUrl.js";

function getMissingColumnName(error) {
  const message = error?.message || "";
  const match = message.match(/Could not find the '([^']+)' column of 'applications'/);
  return match?.[1] || null;
}

function stripColumn(values, columnName) {
  if (!values || typeof values !== "object") return values;
  if (!columnName || !(columnName in values)) return values;
  const { [columnName]: _ignored, ...rest } = values;
  return rest;
}

async function retryWithoutMissingColumns({ op, initialValues, execute }) {
  let values = initialValues;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await execute(values);
    } catch (err) {
      const missing = getMissingColumnName(err);
      if (!missing) {
        throw err;
      }
      console.log(
        JSON.stringify({
          level: "warn",
          message: "DB schema missing column; retrying without it",
          op,
          missingColumn: missing,
        })
      );
      values = stripColumn(values, missing);
      if (!values || Object.keys(values).length === 0) {
        throw err;
      }
    }
  }
  return execute(values);
}

/**
 * Converts snake_case DB record to camelCase for API/UI
 */
function toCamelCase(record) {
  if (!record) return null;
  return {
    id: record.id,
    userId: record.user_id,
    company: record.company,
    role: record.role,
    link: record.link,
    status: record.status,
    appliedDate: record.applied_date,
    notes: record.notes,
    source: record.source,
    location: record.location,
    jdSnapshot: record.jd_snapshot,
    extractedRequirements: record.extracted_requirements,
    confirmedMapping: record.confirmed_mapping,
    interviewPrepPack: record.interview_prep_pack,
    interviewPrepNotes: record.interview_prep_notes,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/**
 * Converts camelCase input to snake_case for DB
 * Also computes normalized_url if link is provided
 */
function toSnakeCase(values) {
  const result = {};
  if (values.company !== undefined) result.company = values.company;
  if (values.role !== undefined) result.role = values.role;
  if (values.link !== undefined) {
    result.link = values.link;
    // Compute normalized_url for duplicate detection and performance
    result.normalized_url = values.link ? normalizeUrl(values.link) : null;
  }
  if (values.status !== undefined) result.status = values.status;
  if (values.appliedDate !== undefined) result.applied_date = values.appliedDate;
  if (values.notes !== undefined) result.notes = values.notes;
  if (values.source !== undefined) result.source = values.source;
  if (values.location !== undefined) result.location = values.location;
  if (values.jdSnapshot !== undefined) result.jd_snapshot = values.jdSnapshot;
  if (values.extractedRequirements !== undefined) result.extracted_requirements = values.extractedRequirements;
  if (values.confirmedMapping !== undefined) result.confirmed_mapping = values.confirmedMapping;
  if (values.interviewPrepPack !== undefined) result.interview_prep_pack = values.interviewPrepPack;
  if (values.interviewPrepNotes !== undefined) result.interview_prep_notes = values.interviewPrepNotes;
  return result;
}

/**
 * Create a new application
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {Object} params.values - Application values in camelCase
 * @returns {Promise<Object>} Created application in camelCase
 */
export async function createApplication({ supabase, userId, values }) {
  const snakeCaseValues = toSnakeCase(values);

  async function insertWith(payload) {
    const { data, error } = await supabase
      .from("applications")
      .insert({
        user_id: userId,
        ...payload,
      })
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data);
  }

  return retryWithoutMissingColumns({
    op: "insert_applications",
    initialValues: snakeCaseValues,
    execute: insertWith,
  });
}

/**
 * Get an application by ID (returns null if not found or not owned)
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {string} params.id - Application ID
 * @returns {Promise<Object|null>} Application in camelCase or null
 */
export async function getApplicationById({ supabase, userId, id }) {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) {
    // PGRST116 = no rows returned
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return toCamelCase(data);
}

/**
 * List all applications for a user with optional filters
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {Object} [params.filters] - Optional filters
 * @param {string} [params.filters.status] - Filter by status
 * @param {string} [params.filters.source] - Filter by source
 * @param {string} [params.filters.q] - Search query (company or role)
 * @param {string} [params.filters.from] - Applied date from (YYYY-MM-DD)
 * @param {string} [params.filters.to] - Applied date to (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of applications in camelCase
 */
export async function listApplications({ supabase, userId, filters = {} }) {
  let query = supabase
    .from("applications")
    .select("*")
    .eq("user_id", userId);

  // Filter by status
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  // Filter by source
  if (filters.source) {
    query = query.eq("source", filters.source);
  }

  // Search by company or role (case-insensitive)
  if (filters.q) {
    const searchTerm = `%${filters.q}%`;
    query = query.or(`company.ilike.${searchTerm},role.ilike.${searchTerm}`);
  }

  // Filter by applied date range
  if (filters.from) {
    query = query.gte("applied_date", filters.from);
  }
  if (filters.to) {
    query = query.lte("applied_date", filters.to);
  }

  // If any date filter is active, exclude null applied_date
  if (filters.from || filters.to) {
    query = query.not("applied_date", "is", null);
  }

  // Order by updated_at descending
  query = query.order("updated_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []).map(toCamelCase);
}

/**
 * Update an application by ID (returns null if not found or not owned)
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {string} params.id - Application ID
 * @param {Object} params.patch - Partial application values in camelCase
 * @returns {Promise<Object|null>} Updated application in camelCase or null
 */
export async function updateApplication({ supabase, userId, id, patch }) {
  const snakeCasePatch = toSnakeCase(patch);

  async function updateWith(payload) {
    const { data, error } = await supabase
      .from("applications")
      .update(payload)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      // PGRST116 = no rows returned (not found or not owned)
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    return toCamelCase(data);
  }

  // If patch becomes empty after stripping missing columns, return the current record
  // (callers may still want the existing app even if no fields could be persisted).
  try {
    return await retryWithoutMissingColumns({
      op: "update_applications",
      initialValues: snakeCasePatch,
      execute: async (payload) => {
        if (!payload || Object.keys(payload).length === 0) {
          return await getApplicationById({ supabase, userId, id });
        }
        return await updateWith(payload);
      },
    });
  } catch (err) {
    const missing = getMissingColumnName(err);
    if (missing) {
      return await getApplicationById({ supabase, userId, id });
    }
    throw err;
  }
}

/**
 * Update extracted requirements for an application
 * Validates the structure before persisting to ensure data integrity
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {string} params.id - Application ID
 * @param {Object} params.extractedRequirements - Extracted requirements object
 * @param {string[]} params.extractedRequirements.responsibilities - List of responsibilities
 * @param {string[]} params.extractedRequirements.requirements - List of requirements/skills
 * @param {string} params.extractedRequirements.extractedAt - ISO-8601 timestamp
 * @returns {Promise<Object|null>} Updated application in camelCase or null
 * @throws {Error} If validation fails
 */
export async function updateExtractedRequirements({
  supabase,
  userId,
  id,
  extractedRequirements,
}) {
  // Validate structure
  if (!extractedRequirements || typeof extractedRequirements !== "object") {
    const error = new Error("extractedRequirements must be an object");
    error.code = "INVALID_REQUIREMENTS";
    throw error;
  }

  const { responsibilities, requirements, extractedAt } = extractedRequirements;

  // Validate responsibilities array
  if (!Array.isArray(responsibilities)) {
    const error = new Error("responsibilities must be an array");
    error.code = "INVALID_REQUIREMENTS";
    throw error;
  }

  // Validate requirements array
  if (!Array.isArray(requirements)) {
    const error = new Error("requirements must be an array");
    error.code = "INVALID_REQUIREMENTS";
    throw error;
  }

  // At least one array must have content to be worth saving
  if (responsibilities.length === 0 && requirements.length === 0) {
    const error = new Error("At least one of responsibilities or requirements must contain items");
    error.code = "EMPTY_REQUIREMENTS";
    throw error;
  }

  // Validate extractedAt timestamp
  if (!extractedAt || typeof extractedAt !== "string") {
    const error = new Error("extractedAt must be an ISO-8601 timestamp string");
    error.code = "INVALID_REQUIREMENTS";
    throw error;
  }

  // Use the generic update function with the validated payload
  return updateApplication({
    supabase,
    userId,
    id,
    patch: { extractedRequirements },
  });
}

/**
 * Find potential duplicate applications for a user
 * Uses DB indexes for fast lookups (normalized_url column)
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {Object} params.check - Fields to check for duplicates
 * @param {string} [params.check.normalizedUrl] - Canonical URL to check
 * @param {string} [params.check.normalizedCompany] - Lowercase company name
 * @param {string} [params.check.normalizedRole] - Lowercase role name
 * @returns {Promise<{ urlMatches: Array, companyRoleMatches: Array }>}
 */
export async function findDuplicates({ supabase, userId, check }) {
  const result = {
    urlMatches: [],
    companyRoleMatches: [],
  };

  // Check for URL duplicates (strong match) - uses normalized_url index
  if (check.normalizedUrl) {
    try {
      const { data: urlMatches, error: urlError } = await supabase
        .from("applications")
        .select("id, company, role, status, link, updated_at")
        .eq("user_id", userId)
        .eq("normalized_url", check.normalizedUrl);

      if (urlError) {
        throw urlError;
      }

      if (urlMatches && urlMatches.length > 0) {
        result.urlMatches = urlMatches.map((app) => ({
          id: app.id,
          company: app.company,
          role: app.role,
          status: app.status,
          link: app.link,
          updatedAt: app.updated_at,
        }));
      }
    } catch (err) {
      // Backward-compatible fallback: if normalized_url doesn't exist, scan by link and normalize in JS.
      if (getMissingColumnName(err) !== "normalized_url") {
        throw err;
      }

      const { data: apps, error: appsError } = await supabase
        .from("applications")
        .select("id, company, role, status, link, updated_at")
        .eq("user_id", userId)
        .not("link", "is", null);

      if (appsError) throw appsError;

      const matches = (apps || []).filter((app) => normalizeUrl(app.link) === check.normalizedUrl);
      result.urlMatches = matches.map((app) => ({
        id: app.id,
        company: app.company,
        role: app.role,
        status: app.status,
        link: app.link,
        updatedAt: app.updated_at,
      }));
    }
  }

  // Check for company+role duplicates (weak match)
  // Note: This still requires fetching all applications and filtering in JS
  // because we don't have normalized company/role columns (low priority optimization)
  if (check.normalizedCompany && check.normalizedRole) {
    const { data: companyRoleMatches, error: crError } = await supabase
      .from("applications")
      .select("id, company, role, status, link, updated_at")
      .eq("user_id", userId)
      .not("company", "is", null)
      .not("role", "is", null);

    if (crError) {
      throw crError;
    }

    // Filter by normalized company+role comparison
    if (companyRoleMatches) {
      const { normalizeCompany, normalizeRole } = await import("../ingestion/normalizeUrl.js");
      result.companyRoleMatches = companyRoleMatches
        .filter((app) => {
          const appNormalizedCompany = normalizeCompany(app.company);
          const appNormalizedRole = normalizeRole(app.role);
          return (
            appNormalizedCompany === check.normalizedCompany &&
            appNormalizedRole === check.normalizedRole
          );
        })
        .map((app) => ({
          id: app.id,
          company: app.company,
          role: app.role,
          status: app.status,
          link: app.link,
          updatedAt: app.updated_at,
        }));
    }
  }

  return result;
}
