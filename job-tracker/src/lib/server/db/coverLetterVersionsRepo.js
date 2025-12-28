/**
 * Cover Letter Versions Repository
 * Server-only module for managing cover letter versions (drafts and submitted)
 *
 * NEVER import this into Client Components
 */

/**
 * Create a new preview version for an application (ungrounded draft)
 * Replaces any previous draft OR preview version (shared latest semantics)
 *
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client with user session
 * @param {string} params.userId - User ID (auth.uid())
 * @param {string} params.applicationId - Application ID
 * @param {string} params.content - Preview content (full text)
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createPreviewVersion({ supabase, userId, applicationId, content }) {
  try {
    // Step 1: Mark all previous draft/preview versions as NOT latest
    // (draft and preview share "latest" semantics)
    const { error: updateError } = await supabase
      .from('cover_letter_versions')
      .update({ is_latest: false })
      .eq('user_id', userId)
      .eq('application_id', applicationId)
      .in('kind', ['draft', 'preview'])
      .eq('is_latest', true);

    if (updateError) {
      console.error('Failed to update previous draft/preview versions:', JSON.stringify({
        code: updateError.code,
        message: updateError.message,
        applicationId
      }));
      return {
        data: null,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update previous versions',
          details: {
            dbCode: updateError.code,
            dbMessage: updateError.message,
          }
        }
      };
    }

    // Step 2: Insert new preview version as latest
    const { data, error: insertError } = await supabase
      .from('cover_letter_versions')
      .insert({
        user_id: userId,
        application_id: applicationId,
        kind: 'preview',
        content,
        is_latest: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert new preview version:', JSON.stringify({
        code: insertError.code,
        message: insertError.message,
        applicationId
      }));
      return {
        data: null,
        error: {
          code: 'INSERT_FAILED',
          message: 'Failed to create new preview version',
          details: {
            dbCode: insertError.code,
            dbMessage: insertError.message,
          }
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
    console.error('Unexpected error in createPreviewVersion:', JSON.stringify({
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
      .in('kind', ['draft', 'preview'])
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
          message: 'Failed to update previous draft versions',
          details: {
            dbCode: updateError.code,
            dbMessage: updateError.message,
          }
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
          message: 'Failed to create new draft version',
          details: {
            dbCode: insertError.code,
            dbMessage: insertError.message,
          }
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
 * Get the latest draft OR preview version for an application.
 * Useful when draft/preview share "latest" semantics.
 *
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client with user session
 * @param {string} params.userId - User ID (auth.uid())
 * @param {string} params.applicationId - Application ID
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function getLatestDraftOrPreview({ supabase, userId, applicationId }) {
  try {
    const { data, error } = await supabase
      .from('cover_letter_versions')
      .select()
      .eq('user_id', userId)
      .eq('application_id', applicationId)
      .in('kind', ['draft', 'preview'])
      .eq('is_latest', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }

      console.error('Failed to fetch latest draft/preview:', JSON.stringify({
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
    console.error('Unexpected error in getLatestDraftOrPreview:', JSON.stringify({
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
 * Handles immutable history: marks previous latest as false, inserts new as latest
 *
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client with user session
 * @param {string} params.userId - User ID (auth.uid())
 * @param {string} params.applicationId - Application ID
 * @param {string} params.content - Submitted cover letter content
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createSubmittedVersion({ supabase, userId, applicationId, content }) {
  try {
    // Step 1: Mark previous submitted versions as NOT latest
    const { error: updateError } = await supabase
      .from('cover_letter_versions')
      .update({ is_latest: false })
      .eq('user_id', userId)
      .eq('application_id', applicationId)
      .eq('kind', 'submitted')
      .eq('is_latest', true);

    if (updateError) {
      console.error('Failed to update previous submitted versions:', JSON.stringify({
        code: updateError.code,
        message: updateError.message,
        applicationId
      }));
      return {
        data: null,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update previous submitted versions'
        }
      };
    }

    // Step 2: Insert new submitted version as latest
    const { data, error: insertError } = await supabase
      .from('cover_letter_versions')
      .insert({
        user_id: userId,
        application_id: applicationId,
        kind: 'submitted',
        content,
        is_latest: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert new submitted version:', JSON.stringify({
        code: insertError.code,
        message: insertError.message,
        applicationId
      }));
      return {
        data: null,
        error: {
          code: 'INSERT_FAILED',
          message: 'Failed to create new submitted version'
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
        createdAt: data.created_at,
        submissionWhere: data.submission_where,
        submissionNotes: data.submission_notes,
        submittedAt: data.submitted_at,
      },
      error: null
    };
  } catch (err) {
    console.error('Unexpected error in createSubmittedVersion:', JSON.stringify({
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
 * List all submitted versions for an application
 * Returns versions ordered by newest first
 *
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client with user session
 * @param {string} params.userId - User ID (auth.uid())
 * @param {string} params.applicationId - Application ID
 * @returns {Promise<{data: Array|null, error: Object|null}>}
 */
export async function listSubmittedVersions({ supabase, userId, applicationId }) {
  try {
    const { data, error } = await supabase
      .from('cover_letter_versions')
      .select()
      .eq('user_id', userId)
      .eq('application_id', applicationId)
      .eq('kind', 'submitted')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch submitted versions:', JSON.stringify({
        code: error.code,
        message: error.message,
        applicationId
      }));
      return {
        data: null,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch submitted versions'
        }
      };
    }

    // Map each row from snake_case to camelCase
    const mappedData = (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      applicationId: row.application_id,
      kind: row.kind,
      content: row.content,
      isLatest: row.is_latest,
      createdAt: row.created_at,
      submissionWhere: row.submission_where,
      submissionNotes: row.submission_notes,
      submittedAt: row.submitted_at,
    }));

    return {
      data: mappedData,
      error: null
    };
  } catch (err) {
    console.error('Unexpected error in listSubmittedVersions:', JSON.stringify({
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
 * Get the most recent submitted version for an application
 *
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client with user session
 * @param {string} params.userId - User ID (auth.uid())
 * @param {string} params.applicationId - Application ID
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function getMostRecentSubmitted({ supabase, userId, applicationId }) {
  try {
    const { data, error } = await supabase
      .from('cover_letter_versions')
      .select()
      .eq('user_id', userId)
      .eq('application_id', applicationId)
      .eq('kind', 'submitted')
      .eq('is_latest', true)
      .single();

    if (error) {
      // PGRST116 means no rows found (not an error for this use case)
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }

      console.error('Failed to fetch most recent submitted version:', JSON.stringify({
        code: error.code,
        message: error.message,
        applicationId
      }));
      return {
        data: null,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch most recent submitted version'
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
        createdAt: data.created_at,
        submissionWhere: data.submission_where,
        submissionNotes: data.submission_notes,
        submittedAt: data.submitted_at,
      },
      error: null
    };
  } catch (err) {
    console.error('Unexpected error in getMostRecentSubmitted:', JSON.stringify({
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
 * Update submission notes for a submitted cover letter version
 * Only updates metadata fields (submission_where, submission_notes, submitted_at)
 * Content field is immutable and cannot be updated
 *
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client with user session
 * @param {string} params.userId - User ID (auth.uid())
 * @param {string} params.id - Cover letter version ID
 * @param {Object} params.patch - Fields to update
 * @param {string} [params.patch.submissionWhere] - Where the cover letter was submitted
 * @param {string} [params.patch.submissionNotes] - Notes about the submission
 * @param {string} [params.patch.submittedAt] - ISO-8601 timestamp of submission
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updateSubmissionNotes({ supabase, userId, id, patch }) {
  try {
    // Build update object - only include submission metadata fields
    // NEVER include content field (immutability)
    const updatePayload = {};

    if (patch.hasOwnProperty('submissionWhere')) {
      updatePayload.submission_where = patch.submissionWhere;
    }
    if (patch.hasOwnProperty('submissionNotes')) {
      updatePayload.submission_notes = patch.submissionNotes;
    }
    if (patch.hasOwnProperty('submittedAt')) {
      updatePayload.submitted_at = patch.submittedAt;
    }

    const { data, error } = await supabase
      .from('cover_letter_versions')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      // PGRST116 means no rows found or updated (version doesn't exist or not owned by user)
      if (error.code === 'PGRST116') {
        console.error('Cover letter version not found or not owned:', JSON.stringify({
          userId,
          versionId: id
        }));
        return {
          data: null,
          error: {
            code: 'NOT_FOUND',
            message: 'Cover letter version not found or not owned by user'
          }
        };
      }

      console.error('Failed to update submission notes:', JSON.stringify({
        code: error.code,
        message: error.message,
        versionId: id
      }));
      return {
        data: null,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update submission notes'
        }
      };
    }

    if (!data) {
      return {
        data: null,
        error: {
          code: 'NOT_FOUND',
          message: 'Cover letter version not found or not owned by user'
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
        createdAt: data.created_at,
        submissionWhere: data.submission_where,
        submissionNotes: data.submission_notes,
        submittedAt: data.submitted_at
      },
      error: null
    };
  } catch (err) {
    console.error('Unexpected error in updateSubmissionNotes:', JSON.stringify({
      message: err.message,
      versionId: id
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
