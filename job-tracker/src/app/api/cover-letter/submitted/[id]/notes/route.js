/**
 * API Route: /api/cover-letter/submitted/[id]/notes
 *
 * PATCH: Update submission notes for a specific submitted cover letter version
 */

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { updateSubmissionNotes } from '@/lib/server/db/coverLetterVersionsRepo';

const paramsSchema = z.object({
  id: z.string().uuid('Invalid cover letter version ID'),
});

// Validation schema for PATCH body
const patchBodySchema = z.object({
  submissionWhere: z.string().nullable().optional(),
  submissionNotes: z.string().nullable().optional(),
  submittedAt: z.string().datetime().nullable().optional(),
});

/**
 * PATCH /api/cover-letter/submitted/[id]/notes
 * Update submission metadata for a specific submitted version
 */
export async function PATCH(request, { params }) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    const { id: versionId } = paramsSchema.parse(await params);

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { data: null, error: { code: 'INVALID_JSON', message: 'Invalid JSON body' } },
        { status: 400 }
      );
    }
    const parseResult = patchBodySchema.safeParse(body);

    if (!parseResult.success) {
      console.error('PATCH /api/cover-letter/submitted/[id]/notes: Validation failed', JSON.stringify({
        userId: user.id,
        versionId,
        errors: parseResult.error.flatten(),
      }));

      return Response.json(
        {
          data: null,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid request body',
          },
        },
        { status: 400 }
      );
    }

    const { submissionWhere, submissionNotes, submittedAt } = parseResult.data;

    // Build patch object with only provided fields
    const patch = {};
    if (submissionWhere !== undefined) {
      patch.submissionWhere = submissionWhere;
    }
    if (submissionNotes !== undefined) {
      patch.submissionNotes = submissionNotes;
    }
    if (submittedAt !== undefined) {
      patch.submittedAt = submittedAt;
    }

    // Update submission notes
    const { data, error } = await updateSubmissionNotes({
      supabase,
      userId: user.id,
      id: versionId,
      patch,
    });

    if (error) {
      if (error.code === 'NOT_FOUND') {
        console.error('PATCH /api/cover-letter/submitted/[id]/notes: Version not found', JSON.stringify({
          userId: user.id,
          versionId,
        }));

        return Response.json(
          {
            data: null,
            error: {
              code: 'NOT_FOUND',
              message: 'Cover letter version not found or not owned by user',
            },
          },
          { status: 404 }
        );
      }

      console.error('PATCH /api/cover-letter/submitted/[id]/notes: Update failed', JSON.stringify({
        userId: user.id,
        versionId,
        errorCode: error.code,
      }));

      return Response.json(
        {
          data: null,
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update submission notes',
          },
        },
        { status: 500 }
      );
    }

    return Response.json({
      data,
      error: null,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json(
        { data: null, error: { code: 'VALIDATION_FAILED', message: 'Invalid request parameters' } },
        { status: 400 }
      );
    }

    console.error('PATCH /api/cover-letter/submitted/[id]/notes: Unexpected error', JSON.stringify({
      message: err.message,
    }));

    return Response.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}
