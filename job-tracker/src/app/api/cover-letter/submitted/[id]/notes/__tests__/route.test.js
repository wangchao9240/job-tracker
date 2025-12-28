/**
 * Tests for PATCH /api/cover-letter/submitted/[id]/notes
 * Tests updating submission notes for a specific submitted version
 */

import { PATCH } from '../route';
import { createClient } from '@/lib/supabase/server';
import { updateSubmissionNotes } from '@/lib/server/db/coverLetterVersionsRepo';

// Polyfill Request and Response for Node.js test environment
if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(url, options = {}) {
      this.url = url;
      this.method = options.method || 'GET';
      this._bodyText = options.body;
    }
    async json() {
      return JSON.parse(this._bodyText);
    }
  };
}

if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body, options = {}) {
      this.body = body;
      this.status = options.status || 200;
    }
    static json(body, options = {}) {
      return new Response(JSON.stringify(body), {
        status: options.status || 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    async json() {
      return JSON.parse(this.body);
    }
  };
}

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/server/db/coverLetterVersionsRepo');

describe('PATCH /api/cover-letter/submitted/[id]/notes', () => {
  const VERSION_ID = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return UNAUTHORIZED when user is not authenticated', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
    };

    createClient.mockResolvedValue(mockSupabase);

    const request = new Request('http://localhost:3000/api/cover-letter/submitted/version-123/notes', {
      method: 'PATCH',
      body: JSON.stringify({
        submissionWhere: 'Company Portal',
      }),
    });

    const params = { id: 'version-123' };
    const response = await PATCH(request, { params });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
    expect(json.data).toBeNull();
  });

  test('should return VALIDATION_FAILED when body is invalid', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    };

    createClient.mockResolvedValue(mockSupabase);

    // Invalid: submittedAt is not ISO-8601 format
    const request = new Request('http://localhost:3000/api/cover-letter/submitted/version-123/notes', {
      method: 'PATCH',
      body: JSON.stringify({
        submittedAt: 'not-a-valid-date',
      }),
    });

    const params = { id: VERSION_ID };
    const response = await PATCH(request, { params });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_FAILED');
    expect(json.data).toBeNull();
  });

  test('should update submission notes successfully', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    };

    createClient.mockResolvedValue(mockSupabase);

    const mockUpdatedVersion = {
      id: VERSION_ID,
      userId: 'user-123',
      applicationId: 'app-123',
      kind: 'submitted',
      content: 'Cover letter content',
      isLatest: true,
      createdAt: '2025-12-28T12:00:00.000Z',
      submissionWhere: 'Company Portal',
      submissionNotes: 'Applied via job board',
      submittedAt: '2025-12-28T13:00:00.000Z',
    };

    updateSubmissionNotes.mockResolvedValue({
      data: mockUpdatedVersion,
      error: null,
    });

    const request = new Request('http://localhost:3000/api/cover-letter/submitted/version-123/notes', {
      method: 'PATCH',
      body: JSON.stringify({
        submissionWhere: 'Company Portal',
        submissionNotes: 'Applied via job board',
        submittedAt: '2025-12-28T13:00:00.000Z',
      }),
    });

    const params = { id: VERSION_ID };
    const response = await PATCH(request, { params });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.error).toBeNull();
    expect(json.data).toEqual(mockUpdatedVersion);
    expect(updateSubmissionNotes).toHaveBeenCalledWith({
      supabase: mockSupabase,
      userId: 'user-123',
      id: VERSION_ID,
      patch: {
        submissionWhere: 'Company Portal',
        submissionNotes: 'Applied via job board',
        submittedAt: '2025-12-28T13:00:00.000Z',
      },
    });
  });

  test('should handle partial updates (only submissionWhere)', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    };

    createClient.mockResolvedValue(mockSupabase);

    const mockUpdatedVersion = {
      id: VERSION_ID,
      userId: 'user-123',
      applicationId: 'app-123',
      kind: 'submitted',
      content: 'Cover letter content',
      isLatest: true,
      createdAt: '2025-12-28T12:00:00.000Z',
      submissionWhere: 'LinkedIn',
      submissionNotes: null,
      submittedAt: null,
    };

    updateSubmissionNotes.mockResolvedValue({
      data: mockUpdatedVersion,
      error: null,
    });

    const request = new Request('http://localhost:3000/api/cover-letter/submitted/version-123/notes', {
      method: 'PATCH',
      body: JSON.stringify({
        submissionWhere: 'LinkedIn',
      }),
    });

    const params = { id: VERSION_ID };
    const response = await PATCH(request, { params });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.error).toBeNull();
    expect(json.data.submissionWhere).toBe('LinkedIn');
  });

  test('should handle null values to clear fields', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    };

    createClient.mockResolvedValue(mockSupabase);

    const mockUpdatedVersion = {
      id: VERSION_ID,
      userId: 'user-123',
      applicationId: 'app-123',
      kind: 'submitted',
      content: 'Cover letter content',
      isLatest: true,
      createdAt: '2025-12-28T12:00:00.000Z',
      submissionWhere: null,
      submissionNotes: null,
      submittedAt: null,
    };

    updateSubmissionNotes.mockResolvedValue({
      data: mockUpdatedVersion,
      error: null,
    });

    const request = new Request('http://localhost:3000/api/cover-letter/submitted/version-123/notes', {
      method: 'PATCH',
      body: JSON.stringify({
        submissionWhere: null,
        submissionNotes: null,
      }),
    });

    const params = { id: VERSION_ID };
    const response = await PATCH(request, { params });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.error).toBeNull();
    expect(json.data.submissionWhere).toBeNull();
    expect(json.data.submissionNotes).toBeNull();
  });

  test('should return NOT_FOUND when version does not exist', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    };

    createClient.mockResolvedValue(mockSupabase);

    updateSubmissionNotes.mockResolvedValue({
      data: null,
      error: {
        code: 'NOT_FOUND',
        message: 'Cover letter version not found or not owned by user',
      },
    });

    const request = new Request('http://localhost:3000/api/cover-letter/submitted/non-existent/notes', {
      method: 'PATCH',
      body: JSON.stringify({
        submissionWhere: 'Company Portal',
      }),
    });

    const params = { id: VERSION_ID };
    const response = await PATCH(request, { params });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error.code).toBe('NOT_FOUND');
    expect(json.data).toBeNull();
  });

  test('should return UPDATE_FAILED when repository fails', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    };

    createClient.mockResolvedValue(mockSupabase);

    updateSubmissionNotes.mockResolvedValue({
      data: null,
      error: {
        code: 'UPDATE_FAILED',
        message: 'Failed to update submission notes',
      },
    });

    const request = new Request('http://localhost:3000/api/cover-letter/submitted/version-123/notes', {
      method: 'PATCH',
      body: JSON.stringify({
        submissionWhere: 'Company Portal',
      }),
    });

    const params = { id: VERSION_ID };
    const response = await PATCH(request, { params });
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error.code).toBe('UPDATE_FAILED');
    expect(json.data).toBeNull();
  });

  test('should allow empty body (no changes)', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    };

    createClient.mockResolvedValue(mockSupabase);

    const mockUpdatedVersion = {
      id: VERSION_ID,
      userId: 'user-123',
      applicationId: 'app-123',
      kind: 'submitted',
      content: 'Cover letter content',
      isLatest: true,
      createdAt: '2025-12-28T12:00:00.000Z',
      submissionWhere: null,
      submissionNotes: null,
      submittedAt: null,
    };

    updateSubmissionNotes.mockResolvedValue({
      data: mockUpdatedVersion,
      error: null,
    });

    const request = new Request('http://localhost:3000/api/cover-letter/submitted/version-123/notes', {
      method: 'PATCH',
      body: JSON.stringify({}),
    });

    const params = { id: VERSION_ID };
    const response = await PATCH(request, { params });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.error).toBeNull();
    expect(updateSubmissionNotes).toHaveBeenCalledWith({
      supabase: mockSupabase,
      userId: 'user-123',
      id: VERSION_ID,
      patch: {},
    });
  });
});
