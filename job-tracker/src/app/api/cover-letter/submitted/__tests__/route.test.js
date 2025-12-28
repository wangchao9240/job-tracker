/**
 * Tests for /api/cover-letter/submitted route
 * Tests GET and POST handlers for submitted cover letter versions
 */

import { GET, POST } from '../route';
import { createClient } from '@/lib/supabase/server';
import {
  createSubmittedVersion,
  listSubmittedVersions,
} from '@/lib/server/db/coverLetterVersionsRepo';

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

describe('GET /api/cover-letter/submitted', () => {
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

    const request = new Request('http://localhost:3000/api/cover-letter/submitted?applicationId=app-123');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
    expect(json.data).toBeNull();
  });

  test('should return INVALID_REQUEST when applicationId is missing', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    };

    createClient.mockResolvedValue(mockSupabase);

    const request = new Request('http://localhost:3000/api/cover-letter/submitted');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe('INVALID_REQUEST');
    expect(json.data).toBeNull();
  });

  test('should return INVALID_REQUEST when applicationId is not a valid UUID', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    };

    createClient.mockResolvedValue(mockSupabase);

    const request = new Request('http://localhost:3000/api/cover-letter/submitted?applicationId=invalid');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe('INVALID_REQUEST');
    expect(json.data).toBeNull();
  });

  test('should return list of submitted versions when successful', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    };

    createClient.mockResolvedValue(mockSupabase);

    const mockVersions = [
      {
        id: 'version-2',
        userId: 'user-123',
        applicationId: '123e4567-e89b-12d3-a456-426614174000',
        kind: 'submitted',
        content: 'Second version',
        isLatest: true,
        createdAt: '2025-12-28T13:00:00.000Z',
      },
      {
        id: 'version-1',
        userId: 'user-123',
        applicationId: '123e4567-e89b-12d3-a456-426614174000',
        kind: 'submitted',
        content: 'First version',
        isLatest: false,
        createdAt: '2025-12-28T12:00:00.000Z',
      },
    ];

    listSubmittedVersions.mockResolvedValue({
      data: mockVersions,
      error: null,
    });

    const request = new Request('http://localhost:3000/api/cover-letter/submitted?applicationId=123e4567-e89b-12d3-a456-426614174000');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.error).toBeNull();
    expect(json.data).toEqual(mockVersions);
    expect(listSubmittedVersions).toHaveBeenCalledWith({
      supabase: mockSupabase,
      userId: 'user-123',
      applicationId: '123e4567-e89b-12d3-a456-426614174000',
    });
  });

  test('should return empty array when no submitted versions exist', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    };

    createClient.mockResolvedValue(mockSupabase);

    listSubmittedVersions.mockResolvedValue({
      data: [],
      error: null,
    });

    const request = new Request('http://localhost:3000/api/cover-letter/submitted?applicationId=123e4567-e89b-12d3-a456-426614174000');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.error).toBeNull();
    expect(json.data).toEqual([]);
  });

  test('should return FETCH_FAILED when repository fails', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    };

    createClient.mockResolvedValue(mockSupabase);

    listSubmittedVersions.mockResolvedValue({
      data: null,
      error: { code: 'FETCH_FAILED', message: 'Database error' },
    });

    const request = new Request('http://localhost:3000/api/cover-letter/submitted?applicationId=123e4567-e89b-12d3-a456-426614174000');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error.code).toBe('FETCH_FAILED');
    expect(json.data).toBeNull();
  });
});

describe('POST /api/cover-letter/submitted', () => {
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

    const request = new Request('http://localhost:3000/api/cover-letter/submitted', {
      method: 'POST',
      body: JSON.stringify({
        applicationId: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Test content',
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
    expect(json.data).toBeNull();
  });

  test('should return INVALID_REQUEST when applicationId is missing', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    };

    createClient.mockResolvedValue(mockSupabase);

    const request = new Request('http://localhost:3000/api/cover-letter/submitted', {
      method: 'POST',
      body: JSON.stringify({
        content: 'Test content',
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe('INVALID_REQUEST');
    expect(json.data).toBeNull();
  });

  test('should return INVALID_REQUEST when content is empty', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    };

    createClient.mockResolvedValue(mockSupabase);

    const request = new Request('http://localhost:3000/api/cover-letter/submitted', {
      method: 'POST',
      body: JSON.stringify({
        applicationId: '123e4567-e89b-12d3-a456-426614174000',
        content: '',
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe('INVALID_REQUEST');
    expect(json.data).toBeNull();
  });

  test('should create submitted version successfully', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    };

    createClient.mockResolvedValue(mockSupabase);

    const mockVersion = {
      id: 'version-1',
      userId: 'user-123',
      applicationId: '123e4567-e89b-12d3-a456-426614174000',
      kind: 'submitted',
      content: 'Test submitted content',
      isLatest: true,
      createdAt: '2025-12-28T12:00:00.000Z',
    };

    createSubmittedVersion.mockResolvedValue({
      data: mockVersion,
      error: null,
    });

    const request = new Request('http://localhost:3000/api/cover-letter/submitted', {
      method: 'POST',
      body: JSON.stringify({
        applicationId: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Test submitted content',
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.error).toBeNull();
    expect(json.data).toEqual(mockVersion);
    expect(createSubmittedVersion).toHaveBeenCalledWith({
      supabase: mockSupabase,
      userId: 'user-123',
      applicationId: '123e4567-e89b-12d3-a456-426614174000',
      content: 'Test submitted content',
    });
  });

  test('should return CREATE_FAILED when repository fails', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    };

    createClient.mockResolvedValue(mockSupabase);

    createSubmittedVersion.mockResolvedValue({
      data: null,
      error: { code: 'INSERT_FAILED', message: 'Database error' },
    });

    const request = new Request('http://localhost:3000/api/cover-letter/submitted', {
      method: 'POST',
      body: JSON.stringify({
        applicationId: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Test content',
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error.code).toBe('CREATE_FAILED');
    expect(json.data).toBeNull();
  });
});
