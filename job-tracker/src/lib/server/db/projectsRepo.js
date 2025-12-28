/**
 * Projects Repository
 * Server-only module for accessing projects table.
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
    name: record.name,
    description: record.description,
    role: record.role,
    techStack: record.tech_stack,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/**
 * Converts camelCase input to snake_case for DB
 */
function toSnakeCase(values) {
  const result = {};
  if (values.name !== undefined) result.name = values.name;
  if (values.description !== undefined) result.description = values.description;
  if (values.role !== undefined) result.role = values.role;
  if (values.techStack !== undefined) result.tech_stack = values.techStack;
  return result;
}

/**
 * Create a new project
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {Object} params.values - Project values in camelCase
 * @returns {Promise<Object>} Created project in camelCase
 */
export async function createProject({ supabase, userId, values }) {
  const snakeCaseValues = toSnakeCase(values);

  const { data, error } = await supabase
    .from("projects")
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
 * Get a project by ID (returns null if not found or not owned)
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {string} params.id - Project ID
 * @returns {Promise<Object|null>} Project in camelCase or null
 */
export async function getProjectById({ supabase, userId, id }) {
  const { data, error } = await supabase
    .from("projects")
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
 * List all projects for a user
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @returns {Promise<Array>} Array of projects in camelCase
 */
export async function listProjects({ supabase, userId }) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(toCamelCase);
}

/**
 * Update a project by ID (returns null if not found or not owned)
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {string} params.id - Project ID
 * @param {Object} params.patch - Partial project values in camelCase
 * @returns {Promise<Object|null>} Updated project in camelCase or null
 */
export async function updateProject({ supabase, userId, id, patch }) {
  const snakeCasePatch = toSnakeCase(patch);

  const { data, error } = await supabase
    .from("projects")
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
 * Delete a project by ID (returns false if not found or not owned)
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {string} params.id - Project ID
 * @returns {Promise<boolean>} True if deleted, false if not found/not owned
 */
export async function deleteProject({ supabase, userId, id }) {
  const { error, count } = await supabase
    .from("projects")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return count > 0;
}
