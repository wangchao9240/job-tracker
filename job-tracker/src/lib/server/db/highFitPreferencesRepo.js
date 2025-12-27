/**
 * High-Fit Preferences Repository
 * Server-only module for accessing high_fit_preferences table.
 * DO NOT import this file in Client Components.
 */

/**
 * Converts snake_case DB record to camelCase for API/UI
 */
function toCamelCase(record) {
  if (!record) return null;
  return {
    userId: record.user_id,
    roleLevels: record.role_levels,
    preferredLocations: record.preferred_locations,
    visaFilter: record.visa_filter,
    roleFocus: record.role_focus,
    keywordsInclude: record.keywords_include,
    keywordsExclude: record.keywords_exclude,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/**
 * Converts camelCase input to snake_case for DB
 */
function toSnakeCase(values) {
  const result = {};
  if (values.roleLevels !== undefined) result.role_levels = values.roleLevels;
  if (values.preferredLocations !== undefined) result.preferred_locations = values.preferredLocations;
  if (values.visaFilter !== undefined) result.visa_filter = values.visaFilter;
  if (values.roleFocus !== undefined) result.role_focus = values.roleFocus;
  if (values.keywordsInclude !== undefined) result.keywords_include = values.keywordsInclude;
  if (values.keywordsExclude !== undefined) result.keywords_exclude = values.keywordsExclude;
  return result;
}

/**
 * Get high-fit preferences for a user
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @returns {Promise<Object|null>} Preferences in camelCase or null if not found
 */
export async function getHighFitPreferences({ supabase, userId }) {
  const { data, error } = await supabase
    .from("high_fit_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned (not an error for us)
    throw error;
  }

  return toCamelCase(data);
}

/**
 * Upsert high-fit preferences for a user
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {Object} params.values - Preferences values in camelCase
 * @returns {Promise<Object>} Updated preferences in camelCase
 */
export async function upsertHighFitPreferences({ supabase, userId, values }) {
  const snakeCaseValues = toSnakeCase(values);

  const { data, error } = await supabase
    .from("high_fit_preferences")
    .upsert(
      {
        user_id: userId,
        ...snakeCaseValues,
      },
      {
        onConflict: "user_id",
      }
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return toCamelCase(data);
}
