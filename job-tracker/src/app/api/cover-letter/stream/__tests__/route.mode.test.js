/**
 * @jest-environment node
 */

import { POST } from '../route';
import { createClient } from '@/lib/supabase/server';
import { getApplicationById } from '@/lib/server/db/applicationsRepo';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/server/db/applicationsRepo');

// Polyfills for Request and Response in Node.js test environment
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

describe('POST /api/cover-letter/stream - mode parameter', () => {
  let mockSupabase;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.JOB_OPENAI_API_KEY;
    delete process.env.JOB_OPENAI_BASE_URL;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_BASE_URL;
    global.fetch = jest.fn(() => {
      throw new Error('fetch should not be called in route.mode tests');
    });

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id', email: 'test@example.com' } },
          error: null,
        }),
      },
    };

    createClient.mockResolvedValue(mockSupabase);
  });

  describe('Mode: preview', () => {
    it('should accept request with mode=preview and JD only (no mapping required)', async () => {
      const testAppId = 'a9508bea-5f77-4009-a368-cfb1f98ee706';

      const applicationWithJdOnly = {
        id: testAppId,
        userId: 'test-user-id',
        company: 'Test Corp',
        role: 'Software Engineer',
        jdSnapshot: 'Job description here...',
        // No confirmedMapping
      };

      getApplicationById.mockResolvedValue({
        ...applicationWithJdOnly,
      });

      const request = new Request('http://localhost/api/cover-letter/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: testAppId,
          mode: 'preview',
        }),
      });

      const response = await POST(request);

      // Should NOT return error about missing mapping
      if (response.status !== 200) {
        const errorData = await response.json();
        expect(errorData.error?.code).not.toBe('CONFIRMED_MAPPING_REQUIRED');
      }

      // Should return SSE stream (200 status with text/event-stream)
      // We're not testing the full streaming here, just that it doesn't reject
      expect(getApplicationById).toHaveBeenCalledWith({
        supabase: mockSupabase,
        userId: 'test-user-id',
        id: testAppId,
      });
    });

    it('should reject preview mode if JD snapshot is missing', async () => {
      const testAppId = '8ca6cffe-9726-4bf1-8c11-15fb488805f2';

      const applicationWithoutJd = {
        id: testAppId,
        userId: 'test-user-id',
        company: 'Test Corp',
        role: 'Software Engineer',
        // No jdSnapshot
      };

      getApplicationById.mockResolvedValue({
        ...applicationWithoutJd,
      });

      const request = new Request('http://localhost/api/cover-letter/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: testAppId,
          mode: 'preview',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('JD_SNAPSHOT_REQUIRED');
    });
  });

  describe('Mode: grounded', () => {
    it('should require confirmed mapping when mode=grounded', async () => {
      const testAppId = '204b3d82-a8e4-4b8c-b32b-428ffbdbfdfc';

      const applicationWithJdOnly = {
        id: testAppId,
        userId: 'test-user-id',
        company: 'Test Corp',
        role: 'Software Engineer',
        jdSnapshot: 'Job description here...',
        // No confirmedMapping
      };

      getApplicationById.mockResolvedValue({
        ...applicationWithJdOnly,
      });

      const request = new Request('http://localhost/api/cover-letter/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: testAppId,
          mode: 'grounded',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('CONFIRMED_MAPPING_REQUIRED');
    });

    it('should reject grounded mode if JD snapshot is missing', async () => {
      const testAppId = 'ada4eae7-f97c-4253-b12d-28ffbfa834f7';

      const applicationWithMapping = {
        id: testAppId,
        userId: 'test-user-id',
        company: 'Test Corp',
        role: 'Software Engineer',
        // No jdSnapshot
        confirmedMapping: {
          items: [
            { kind: 'requirement', text: 'Test requirement', bulletIds: ['bullet-1'] },
          ],
        },
      };

      getApplicationById.mockResolvedValue({
        ...applicationWithMapping,
      });

      const request = new Request('http://localhost/api/cover-letter/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: testAppId,
          mode: 'grounded',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('JD_SNAPSHOT_REQUIRED');
    });
  });

  describe('Mode: default behavior', () => {
    it('should default to grounded mode when mode parameter is omitted', async () => {
      const testAppId = 'c28c86c4-0a77-41be-a5e1-96dbeee98bf5';

      const applicationWithJdOnly = {
        id: testAppId,
        userId: 'test-user-id',
        company: 'Test Corp',
        role: 'Software Engineer',
        jdSnapshot: 'Job description here...',
        // No confirmedMapping
      };

      getApplicationById.mockResolvedValue({
        ...applicationWithJdOnly,
      });

      const request = new Request('http://localhost/api/cover-letter/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: testAppId,
          // mode not specified
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should behave like grounded mode and require mapping
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('CONFIRMED_MAPPING_REQUIRED');
    });
  });

  describe('Mode: validation', () => {
    it('should reject invalid mode values', async () => {
      const testAppId = '2eb6b733-cfa1-4624-8080-4d02a0f89914';

      const request = new Request('http://localhost/api/cover-letter/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: testAppId,
          mode: 'invalid-mode',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_FAILED');
    });
  });
});
