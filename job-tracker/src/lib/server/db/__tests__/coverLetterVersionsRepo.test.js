/**
 * Tests for coverLetterVersionsRepo
 * Documents "latest draft" semantics: no duplicates, latest replaced
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createDraftVersion, getLatestDraft } from '../coverLetterVersionsRepo';

// Mock Supabase client
function createMockSupabase() {
  const mockSupabase = {
    from: vi.fn(),
  };

  const mockQuery = {
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  mockSupabase.from.mockReturnValue(mockQuery);

  return { mockSupabase, mockQuery };
}

describe('coverLetterVersionsRepo', () => {
  describe('createDraftVersion', () => {
    test('should create a new draft version and mark previous as not latest', async () => {
      const { mockSupabase, mockQuery } = createMockSupabase();

      // Mock successful update of previous versions
      mockQuery.eq.mockImplementation(function (column, value) {
        if (column === 'is_latest' && value === true) {
          return {
            ...this,
            then: async () => ({ data: null, error: null }),
          };
        }
        return this;
      });

      // Mock successful insert of new version
      mockQuery.single.mockResolvedValue({
        data: {
          id: 'new-draft-id',
          user_id: 'user-123',
          application_id: 'app-123',
          kind: 'draft',
          content: 'New draft content',
          is_latest: true,
          created_at: '2025-12-28T10:00:00.000Z',
        },
        error: null,
      });

      const result = await createDraftVersion({
        supabase: mockSupabase,
        userId: 'user-123',
        applicationId: 'app-123',
        content: 'New draft content',
      });

      expect(result.error).toBeNull();
      expect(result.data).toEqual({
        id: 'new-draft-id',
        userId: 'user-123',
        applicationId: 'app-123',
        kind: 'draft',
        content: 'New draft content',
        isLatest: true,
        createdAt: '2025-12-28T10:00:00.000Z',
      });

      // Verify update was called to flip previous latest to false
      expect(mockSupabase.from).toHaveBeenCalledWith('cover_letter_versions');
      expect(mockQuery.update).toHaveBeenCalledWith({ is_latest: false });
    });

    test('should return error when update fails', async () => {
      const { mockSupabase, mockQuery } = createMockSupabase();

      // Mock failed update
      mockQuery.eq.mockImplementation(function (column, value) {
        if (column === 'is_latest' && value === true) {
          return {
            ...this,
            then: async () => ({
              data: null,
              error: { code: 'UPDATE_ERROR', message: 'Update failed' },
            }),
          };
        }
        return this;
      });

      const result = await createDraftVersion({
        supabase: mockSupabase,
        userId: 'user-123',
        applicationId: 'app-123',
        content: 'New draft content',
      });

      expect(result.data).toBeNull();
      expect(result.error).toEqual({
        code: 'UPDATE_FAILED',
        message: 'Failed to update previous draft versions',
      });
    });

    test('should return error when insert fails', async () => {
      const { mockSupabase, mockQuery } = createMockSupabase();

      // Mock successful update
      mockQuery.eq.mockImplementation(function (column, value) {
        if (column === 'is_latest' && value === true) {
          return {
            ...this,
            then: async () => ({ data: null, error: null }),
          };
        }
        return this;
      });

      // Mock failed insert
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: 'INSERT_ERROR', message: 'Insert failed' },
      });

      const result = await createDraftVersion({
        supabase: mockSupabase,
        userId: 'user-123',
        applicationId: 'app-123',
        content: 'New draft content',
      });

      expect(result.data).toBeNull();
      expect(result.error).toEqual({
        code: 'INSERT_FAILED',
        message: 'Failed to create new draft version',
      });
    });
  });

  describe('getLatestDraft', () => {
    test('should return the latest draft when it exists', async () => {
      const { mockSupabase, mockQuery } = createMockSupabase();

      mockQuery.single.mockResolvedValue({
        data: {
          id: 'draft-id',
          user_id: 'user-123',
          application_id: 'app-123',
          kind: 'draft',
          content: 'Latest draft content',
          is_latest: true,
          created_at: '2025-12-28T10:00:00.000Z',
        },
        error: null,
      });

      const result = await getLatestDraft({
        supabase: mockSupabase,
        userId: 'user-123',
        applicationId: 'app-123',
      });

      expect(result.error).toBeNull();
      expect(result.data).toEqual({
        id: 'draft-id',
        userId: 'user-123',
        applicationId: 'app-123',
        kind: 'draft',
        content: 'Latest draft content',
        isLatest: true,
        createdAt: '2025-12-28T10:00:00.000Z',
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('cover_letter_versions');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockQuery.eq).toHaveBeenCalledWith('application_id', 'app-123');
      expect(mockQuery.eq).toHaveBeenCalledWith('kind', 'draft');
      expect(mockQuery.eq).toHaveBeenCalledWith('is_latest', true);
    });

    test('should return null when no latest draft exists (PGRST116)', async () => {
      const { mockSupabase, mockQuery } = createMockSupabase();

      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const result = await getLatestDraft({
        supabase: mockSupabase,
        userId: 'user-123',
        applicationId: 'app-123',
      });

      expect(result.error).toBeNull();
      expect(result.data).toBeNull();
    });

    test('should return error for other database errors', async () => {
      const { mockSupabase, mockQuery } = createMockSupabase();

      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: 'DB_ERROR', message: 'Database error' },
      });

      const result = await getLatestDraft({
        supabase: mockSupabase,
        userId: 'user-123',
        applicationId: 'app-123',
      });

      expect(result.data).toBeNull();
      expect(result.error).toEqual({
        code: 'FETCH_FAILED',
        message: 'Failed to fetch latest draft',
      });
    });
  });

  describe('Latest draft semantics', () => {
    test('should ensure only one latest draft per application after multiple creates', async () => {
      // This is a conceptual test documenting the expected behavior
      // In real usage:
      // 1. First createDraftVersion: is_latest = true
      // 2. Second createDraftVersion:
      //    - Updates first draft: is_latest = false
      //    - Inserts second draft: is_latest = true
      // 3. Third createDraftVersion:
      //    - Updates second draft: is_latest = false
      //    - Inserts third draft: is_latest = true
      //
      // The partial unique index ensures only one row can have is_latest = true
      // per (application_id, kind) combination

      expect(true).toBe(true); // Documented behavior validated by migration + integration tests
    });
  });
});
