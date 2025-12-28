/**
 * GET /api/cover-letter/latest
 * Fetch the latest cover letter draft for an application
 */

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getLatestDraftOrPreview } from '@/lib/server/db/coverLetterVersionsRepo';

const querySchema = z.object({
  applicationId: z.string().uuid('Invalid application ID format'),
});

export async function GET(request) {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(
      JSON.stringify({
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Parse query parameter
    const { searchParams } = new URL(request.url);
    const parseResult = querySchema.safeParse({ applicationId: searchParams.get('applicationId') });

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          data: null,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'applicationId query parameter is required and must be a valid UUID',
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { applicationId } = parseResult.data;

    // Fetch latest draft
    const { data, error } = await getLatestDraftOrPreview({
      supabase,
      userId: user.id,
      applicationId,
    });

    if (error) {
      console.error('Failed to fetch latest draft:', JSON.stringify({
        error,
        applicationId,
        userId: user.id
      }));

      return new Response(
        JSON.stringify({
          data: null,
          error,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        data,
        error: null,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Unexpected error in /api/cover-letter/latest:', JSON.stringify({
      message: err.message,
      userId: user?.id
    }));

    return new Response(
      JSON.stringify({
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
