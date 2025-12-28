/**
 * API Route: /api/cover-letter/submitted
 *
 * GET: List all submitted cover letter versions for an application
 * POST: Create a new submitted cover letter version
 */

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  createSubmittedVersion,
  listSubmittedVersions,
} from '@/lib/server/db/coverLetterVersionsRepo';

// Validation schemas
const getQuerySchema = z.object({
  applicationId: z.string().uuid('Invalid application ID format'),
});

const postBodySchema = z.object({
  applicationId: z.string().uuid('Invalid application ID format'),
  content: z.string().min(1, 'Content cannot be empty'),
});

/**
 * GET /api/cover-letter/submitted
 * List all submitted cover letter versions for an application
 */
export async function GET(request) {
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

    // Parse and validate query params
    const { searchParams } = new URL(request.url);
    const parseResult = getQuerySchema.safeParse({
      applicationId: searchParams.get('applicationId'),
    });

    if (!parseResult.success) {
      console.error('GET /api/cover-letter/submitted: Validation failed', JSON.stringify({
        userId: user.id,
        errors: parseResult.error.flatten(),
      }));

      return Response.json(
        {
          data: null,
          error: {
            code: 'INVALID_REQUEST',
            message: 'applicationId query parameter is required and must be a valid UUID',
          },
        },
        { status: 400 }
      );
    }

    const { applicationId } = parseResult.data;

    // Fetch submitted versions
    const { data, error } = await listSubmittedVersions({
      supabase,
      userId: user.id,
      applicationId,
    });

    if (error) {
      console.error('GET /api/cover-letter/submitted: Fetch failed', JSON.stringify({
        userId: user.id,
        applicationId,
        errorCode: error.code,
      }));

      return Response.json(
        {
          data: null,
          error: {
            code: 'FETCH_FAILED',
            message: 'Failed to fetch submitted versions',
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
    console.error('GET /api/cover-letter/submitted: Unexpected error', JSON.stringify({
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

/**
 * POST /api/cover-letter/submitted
 * Create a new submitted cover letter version
 */
export async function POST(request) {
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

    // Parse and validate request body
    const body = await request.json();
    const parseResult = postBodySchema.safeParse(body);

    if (!parseResult.success) {
      console.error('POST /api/cover-letter/submitted: Validation failed', JSON.stringify({
        userId: user.id,
        errors: parseResult.error.flatten(),
      }));

      return Response.json(
        {
          data: null,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid request body. applicationId (UUID) and content (non-empty string) are required.',
          },
        },
        { status: 400 }
      );
    }

    const { applicationId, content } = parseResult.data;

    // Create submitted version
    const { data, error } = await createSubmittedVersion({
      supabase,
      userId: user.id,
      applicationId,
      content,
    });

    if (error) {
      console.error('POST /api/cover-letter/submitted: Create failed', JSON.stringify({
        userId: user.id,
        applicationId,
        errorCode: error.code,
      }));

      return Response.json(
        {
          data: null,
          error: {
            code: 'CREATE_FAILED',
            message: 'Failed to create submitted version',
          },
        },
        { status: 500 }
      );
    }

    return Response.json(
      {
        data,
        error: null,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/cover-letter/submitted: Unexpected error', JSON.stringify({
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
