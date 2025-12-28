/**
 * Project Bullets Repository
 * Server-only module for accessing project_bullets table.
 * DO NOT import this file in Client Components.
 */

/**
 * Converts snake_case DB record to camelCase for API/UI
 */
function toCamelCase(record) {
  if (!record) return null;
  return {
    id: record.id,
    userId: record.user_id,
    projectId: record.project_id,
    text: record.text,
    title: record.title,
    tags: record.tags,
    impact: record.impact,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/**
 * Converts camelCase input to snake_case for DB
 */
function toSnakeCase(values) {
  const result = {};
  if (values.projectId !== undefined) result.project_id = values.projectId;
  if (values.text !== undefined) result.text = values.text;
  if (values.title !== undefined) result.title = values.title;
  if (values.tags !== undefined) result.tags = values.tags;
  if (values.impact !== undefined) result.impact = values.impact;
  return result;
}

/**
 * Create a new project bullet
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {Object} params.values - Bullet values in camelCase
 * @returns {Promise<Object>} Created bullet in camelCase
 */
export async function createProjectBullet({ supabase, userId, values }) {
  const snakeCaseValues = toSnakeCase(values);

  const { data, error } = await supabase
    .from("project_bullets")
    .insert({
      user_id: userId,
      ...snakeCaseValues,
    })
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

/**
 * Get a project bullet by ID (returns null if not found or not owned)
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {string} params.id - Bullet ID
 * @returns {Promise<Object|null>} Bullet in camelCase or null
 */
export async function getProjectBulletById({ supabase, userId, id }) {
  const { data, error } = await supabase
    .from("project_bullets")
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
 * List all project bullets with optional filters
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {string} [params.projectId] - Optional project ID filter
 * @param {string} [params.q] - Optional text search query (searches text, title, impact)
 * @param {string} [params.tag] - Optional tag filter (exact match, normalized)
 * @returns {Promise<Array>} Array of bullets in camelCase
 */
export async function listProjectBullets({ supabase, userId, projectId, q, tag }) {
  let query = supabase
    .from("project_bullets")
    .select("*")
    .eq("user_id", userId);

  // Optional: filter by project
  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  // Optional: filter by tag (exact match using array contains operator)
  if (tag) {
    // Use Postgres array contains operator: tags @> ARRAY[tag]
    // In Supabase JS client, use .contains() for array containment
    query = query.contains("tags", [tag]);
  }

  // Optional: text search across text, title, and impact fields
  // Using ilike for case-insensitive search (acceptable for MVP)
  if (q) {
    const escaped = q.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
    const pattern = `%${escaped}%`;
    query = query.or(
      `text.ilike."${pattern}",title.ilike."${pattern}",impact.ilike."${pattern}"`
    );
  }

  // Always order by updated_at descending
  query = query.order("updated_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []).map(toCamelCase);
}

/**
 * List project bullets by ID (returns only bullets owned by the user).
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {string[]} params.ids - Bullet IDs
 * @returns {Promise<Array>} Array of bullets in camelCase
 */
export async function listProjectBulletsByIds({ supabase, userId, ids }) {
  const uniqueIds = Array.from(new Set(ids || [])).filter(Boolean);
  if (uniqueIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("project_bullets")
    .select("*")
    .eq("user_id", userId)
    .in("id", uniqueIds);

  if (error) {
    throw error;
  }

  return (data || []).map(toCamelCase);
}

/**
 * Update a project bullet by ID (returns null if not found or not owned)
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {string} params.id - Bullet ID
 * @param {Object} params.patch - Partial bullet values in camelCase
 * @returns {Promise<Object|null>} Updated bullet in camelCase or null
 */
export async function updateProjectBullet({ supabase, userId, id, patch }) {
  const snakeCasePatch = toSnakeCase(patch);

  const { data, error } = await supabase
    .from("project_bullets")
    .update(snakeCasePatch)
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

/**
 * Delete a project bullet by ID (returns false if not found or not owned)
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {string} params.id - Bullet ID
 * @returns {Promise<boolean>} True if deleted, false if not found/not owned
 */
export async function deleteProjectBullet({ supabase, userId, id }) {
  const { error, count } = await supabase
    .from("project_bullets")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return count > 0;
}
