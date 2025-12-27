/**
 * Generation Preferences Repository
 * Server-only module for accessing generation_preferences table.
 * DO NOT import this file in Client Components.
 */

/**
 * Converts snake_case DB record to camelCase for API/UI
 */
function toCamelCase(record) {
  if (!record) return null;
  return {
    userId: record.user_id,
    tone: record.tone,
    emphasis: record.emphasis,
    keywordsInclude: record.keywords_include,
    keywordsAvoid: record.keywords_avoid,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/**
 * Converts camelCase input to snake_case for DB
 */
function toSnakeCase(values) {
  const result = {};
  if (values.tone !== undefined) result.tone = values.tone;
  if (values.emphasis !== undefined) result.emphasis = values.emphasis;
  if (values.keywordsInclude !== undefined) result.keywords_include = values.keywordsInclude;
  if (values.keywordsAvoid !== undefined) result.keywords_avoid = values.keywordsAvoid;
  return result;
}

/**
 * Get generation preferences for a user
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @returns {Promise<Object|null>} Preferences in camelCase or null if not found
 */
export async function getGenerationPreferences({ supabase, userId }) {
  const { data, error } = await supabase
    .from("generation_preferences")
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
 * Upsert generation preferences for a user
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {Object} params.values - Preferences values in camelCase
 * @returns {Promise<Object>} Updated preferences in camelCase
 */
export async function upsertGenerationPreferences({ supabase, userId, values }) {
  const snakeCaseValues = toSnakeCase(values);

  const { data, error } = await supabase
    .from("generation_preferences")
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
