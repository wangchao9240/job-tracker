/**
 * Cover Letter Versions Repository
 * Server-only module for managing cover letter versions (drafts and submitted)
 *
 * NEVER import this into Client Components
 */

/**
 * Create a new draft version for an application
 * Handles "latest draft" semantics by marking the new version as latest
 * and flipping the previous latest to false in a transaction
 *
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client with user session
 * @param {string} params.userId - User ID (auth.uid())
 * @param {string} params.applicationId - Application ID
 * @param {string} params.content - Draft content (full text)
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createDraftVersion({ supabase, userId, applicationId, content }) {
  try {
    // Start a transaction by:
    // 1. Mark all previous draft versions for this application as NOT latest
    // 2. Insert new draft version with is_latest = true

    // Step 1: Flip previous latest drafts to false
    const { error: updateError } = await supabase
      .from('cover_letter_versions')
      .update({ is_latest: false })
      .eq('user_id', userId)
      .eq('application_id', applicationId)
      .eq('kind', 'draft')
      .eq('is_latest', true);

    if (updateError) {
      console.error('Failed to update previous draft versions:', JSON.stringify({
        code: updateError.code,
        message: updateError.message,
        applicationId
      }));
      return {
        data: null,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update previous draft versions'
        }
      };
    }

    // Step 2: Insert new draft version as latest
    const { data, error: insertError } = await supabase
      .from('cover_letter_versions')
      .insert({
        user_id: userId,
        application_id: applicationId,
        kind: 'draft',
        content,
        is_latest: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert new draft version:', JSON.stringify({
        code: insertError.code,
        message: insertError.message,
        applicationId
      }));
      return {
        data: null,
        error: {
          code: 'INSERT_FAILED',
          message: 'Failed to create new draft version'
        }
      };
    }

    // Map snake_case to camelCase
    return {
      data: {
        id: data.id,
        userId: data.user_id,
        applicationId: data.application_id,
        kind: data.kind,
        content: data.content,
        isLatest: data.is_latest,
        createdAt: data.created_at
      },
      error: null
    };
  } catch (err) {
    console.error('Unexpected error in createDraftVersion:', JSON.stringify({
      message: err.message,
      applicationId
    }));
    return {
      data: null,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred'
      }
    };
  }
}

/**
 * Get the latest draft version for an application
 *
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client with user session
 * @param {string} params.userId - User ID (auth.uid())
 * @param {string} params.applicationId - Application ID
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function getLatestDraft({ supabase, userId, applicationId }) {
  try {
    const { data, error } = await supabase
      .from('cover_letter_versions')
      .select()
      .eq('user_id', userId)
      .eq('application_id', applicationId)
      .eq('kind', 'draft')
      .eq('is_latest', true)
      .single();

    if (error) {
      // PGRST116 means no rows found (not an error for this use case)
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }

      console.error('Failed to fetch latest draft:', JSON.stringify({
        code: error.code,
        message: error.message,
        applicationId
      }));
      return {
        data: null,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch latest draft'
        }
      };
    }

    if (!data) {
      return { data: null, error: null };
    }

    // Map snake_case to camelCase
    return {
      data: {
        id: data.id,
        userId: data.user_id,
        applicationId: data.application_id,
        kind: data.kind,
        content: data.content,
        isLatest: data.is_latest,
        createdAt: data.created_at
      },
      error: null
    };
  } catch (err) {
    console.error('Unexpected error in getLatestDraft:', JSON.stringify({
      message: err.message,
      applicationId
    }));
    return {
      data: null,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred'
      }
    };
  }
}

/**
 * Create a new submitted version for an application
 * (Future implementation for Story 6.3)
 *
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client with user session
 * @param {string} params.userId - User ID (auth.uid())
 * @param {string} params.applicationId - Application ID
 * @param {string} params.content - Submitted cover letter content
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createSubmittedVersion({ supabase, userId, applicationId, content }) {
  // Placeholder for Story 6.3
  // Will mark previous submitted versions as NOT latest and insert new one
  return {
    data: null,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'createSubmittedVersion will be implemented in Story 6.3'
    }
  };
}
