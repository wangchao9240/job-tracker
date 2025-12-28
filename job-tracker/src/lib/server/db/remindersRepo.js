/**
 * Reminders Repository
 * Server-only module for accessing reminders table.
 * DO NOT import this file in Client Components.
 */

/**
 * Valid reminder types
 */
export const REMINDER_TYPES = ["no_response_follow_up"];

/**
 * Converts snake_case DB record to camelCase for API/UI
 */
function toCamelCase(record) {
  if (!record) return null;
  return {
    id: record.id,
    applicationId: record.application_id,
    userId: record.user_id,
    type: record.type,
    dueAt: record.due_at,
    dismissedAt: record.dismissed_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/**
 * Upsert a no-response follow-up reminder (idempotent by application_id + type)
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {string} params.applicationId - Application ID
 * @param {string} params.dueAt - Due date (ISO string)
 * @returns {Promise<Object>} Created/updated reminder in camelCase
 */
export async function upsertNoResponseReminder({
  supabase,
  userId,
  applicationId,
  dueAt,
}) {
  // Validate dueAt is a valid ISO8601 datetime string
  if (!dueAt || typeof dueAt !== "string") {
    throw new Error("dueAt must be a non-empty string");
  }

  const parsedDate = new Date(dueAt);
  if (isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid date format for dueAt: ${dueAt}`);
  }

  const { data, error } = await supabase
    .from("reminders")
    .upsert(
      {
        application_id: applicationId,
        user_id: userId,
        type: "no_response_follow_up",
        due_at: dueAt,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "application_id,type",
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return toCamelCase(data);
}

/**
 * List active reminders for a user (not dismissed and due)
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @returns {Promise<Array>} Array of reminders in camelCase
 */
export async function listActiveRemindersForUser({ supabase, userId }) {
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("user_id", userId)
    .is("dismissed_at", null)
    .lte("due_at", new Date().toISOString())
    .order("due_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map(toCamelCase);
}

/**
 * Get a reminder by ID
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {string} params.id - Reminder ID
 * @returns {Promise<Object|null>} Reminder in camelCase or null
 */
export async function getReminderById({ supabase, userId, id }) {
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return toCamelCase(data);
}

/**
 * Dismiss a reminder
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {string} params.id - Reminder ID
 * @returns {Promise<Object|null>} Updated reminder in camelCase or null if not found
 */
export async function dismissReminder({ supabase, userId, id }) {
  const { data, error } = await supabase
    .from("reminders")
    .update({
      dismissed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return toCamelCase(data);
}

/**
 * Get active reminder for an application by type
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {string} params.applicationId - Application ID
 * @param {string} params.type - Reminder type
 * @returns {Promise<Object|null>} Reminder in camelCase or null
 */
export async function getActiveReminderByApplicationAndType({
  supabase,
  userId,
  applicationId,
  type,
}) {
  // Validate reminder type
  if (!REMINDER_TYPES.includes(type)) {
    throw new Error(
      `Invalid reminder type: ${type}. Must be one of: ${REMINDER_TYPES.join(", ")}`
    );
  }

  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("application_id", applicationId)
    .eq("user_id", userId)
    .eq("type", type)
    .is("dismissed_at", null)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return toCamelCase(data);
}
