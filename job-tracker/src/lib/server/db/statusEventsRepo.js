/**
 * Status Events Repository
 * Server-only module for accessing application_status_events table.
 * DO NOT import this file in Client Components.
 */

/**
 * Valid event types for application status events
 */
export const EVENT_TYPES = [
  "status_changed",
  "field_changed",
  "jd_snapshot_updated",
  "requirements_extracted",
  "requirements_updated",
  "focus_set_updated",
  "interview_prep_generated",
];

/**
 * Validate payload structure for event type
 * @param {string} eventType - Event type
 * @param {Object} payload - Payload to validate
 * @throws {Error} If payload structure is invalid
 */
function validatePayload(eventType, payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error(`Payload must be an object for event type: ${eventType}`);
  }

  if (eventType === "status_changed") {
    if (!("from" in payload) || !("to" in payload)) {
      throw new Error(
        'Payload for status_changed must have "from" and "to" properties'
      );
    }
  } else if (eventType === "field_changed") {
    if (!("field" in payload) || !("from" in payload) || !("to" in payload)) {
      throw new Error(
        'Payload for field_changed must have "field", "from", and "to" properties'
      );
    }
  } else if (eventType === "jd_snapshot_updated") {
    if (!("fromLength" in payload) || !("toLength" in payload)) {
      throw new Error(
        'Payload for jd_snapshot_updated must have "fromLength" and "toLength" properties'
      );
    }
  } else if (eventType === "requirements_extracted") {
    if (
      !("responsibilitiesCount" in payload) ||
      !("requirementsCount" in payload)
    ) {
      throw new Error(
        'Payload for requirements_extracted must have "responsibilitiesCount" and "requirementsCount" properties'
      );
    }
  } else if (eventType === "requirements_updated") {
    if (
      !("responsibilitiesCount" in payload) ||
      !("requirementsCount" in payload)
    ) {
      throw new Error(
        'Payload for requirements_updated must have "responsibilitiesCount" and "requirementsCount" properties'
      );
    }
  } else if (eventType === "focus_set_updated") {
    if (!("action" in payload) || !("count" in payload)) {
      throw new Error(
        'Payload for focus_set_updated must have "action" and "count" properties'
      );
    }
  } else if (eventType === "interview_prep_generated") {
    if (!("questionsCount" in payload)) {
      throw new Error(
        'Payload for interview_prep_generated must have "questionsCount" property'
      );
    }
  }
}

/**
 * Converts snake_case DB record to camelCase for API/UI
 */
function toCamelCase(record) {
  if (!record) return null;
  return {
    id: record.id,
    applicationId: record.application_id,
    userId: record.user_id,
    eventType: record.event_type,
    payload: record.payload,
    createdAt: record.created_at,
  };
}

/**
 * List status events for an application (newest first)
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {string} params.applicationId - Application ID
 * @returns {Promise<Array>} Array of events in camelCase
 */
export async function listStatusEvents({ supabase, userId, applicationId }) {
  const { data, error } = await supabase
    .from("application_status_events")
    .select("*")
    .eq("application_id", applicationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(toCamelCase);
}

/**
 * Insert a status event
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {string} params.applicationId - Application ID
 * @param {string} params.eventType - Event type (status_changed, field_changed, jd_snapshot_updated)
 * @param {Object} params.payload - Event payload with before/after values
 * @returns {Promise<Object>} Created event in camelCase
 */
export async function insertStatusEvent({
  supabase,
  userId,
  applicationId,
  eventType,
  payload,
}) {
  // Validate event type
  if (!EVENT_TYPES.includes(eventType)) {
    throw new Error(
      `Invalid event type: ${eventType}. Must be one of: ${EVENT_TYPES.join(", ")}`
    );
  }

  // Validate payload structure
  validatePayload(eventType, payload);

  const { data, error } = await supabase
    .from("application_status_events")
    .insert({
      application_id: applicationId,
      user_id: userId,
      event_type: eventType,
      payload,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return toCamelCase(data);
}

/**
 * Insert multiple status events at once
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.userId - User ID
 * @param {string} params.applicationId - Application ID
 * @param {Array} params.events - Array of { eventType, payload }
 * @returns {Promise<Array>} Created events in camelCase
 */
export async function insertStatusEvents({
  supabase,
  userId,
  applicationId,
  events,
}) {
  if (!events || events.length === 0) {
    return [];
  }

  // Validate all event types and payloads before inserting
  for (const event of events) {
    if (!EVENT_TYPES.includes(event.eventType)) {
      throw new Error(
        `Invalid event type: ${event.eventType}. Must be one of: ${EVENT_TYPES.join(", ")}`
      );
    }
    validatePayload(event.eventType, event.payload);
  }

  const records = events.map((e) => ({
    application_id: applicationId,
    user_id: userId,
    event_type: e.eventType,
    payload: e.payload,
  }));

  const { data, error } = await supabase
    .from("application_status_events")
    .insert(records)
    .select();

  if (error) {
    throw error;
  }

  return (data || []).map(toCamelCase);
}
