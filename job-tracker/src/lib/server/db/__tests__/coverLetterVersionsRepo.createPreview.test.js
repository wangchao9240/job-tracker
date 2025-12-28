/**
 * Tests for createPreviewVersion in coverLetterVersionsRepo
 * Tests preview draft creation with shared latest semantics (draft/preview share "latest", submitted separate)
 */

import { createPreviewVersion, createDraftVersion } from '../coverLetterVersionsRepo';

// Mock Supabase client helper
function createMockSupabase() {
  let mockChain;

  const mockSupabase = {
    from: jest.fn(() => mockChain),
  };

  const resetChain = () => {
    mockChain = {
      update: jest.fn(() => mockChain),
      insert: jest.fn(() => mockChain),
      eq: jest.fn(() => mockChain),
      in: jest.fn(() => mockChain),
      select: jest.fn(() => mockChain),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    };
    return mockChain;
  };

  mockChain = resetChain();

  return { mockSupabase, mockChain, resetChain };
}

describe('coverLetterVersionsRepo - createPreviewVersion', () => {

  describe('Preview creation', () => {
    it('should update previous draft/preview versions and insert new preview', async () => {
      const { mockSupabase, mockChain } = createMockSupabase();

      // Mock successful update (marks previous draft/preview as not latest)
      const mockUpdateResult = { data: null, error: null };
      mockChain.update.mockReturnValue(mockChain);
      mockChain.eq.mockReturnValue(mockChain);
      mockChain.in.mockReturnValue(mockChain);

      // Mock successful insert
      mockChain.single.mockResolvedValue({
        data: {
          id: 'preview-id-1',
          user_id: 'user-123',
          application_id: 'app-123',
          kind: 'preview',
          content: 'Preview content',
          is_latest: true,
          created_at: '2025-12-28T12:00:00.000Z',
        },
        error: null,
      });

      const result = await createPreviewVersion({
        supabase: mockSupabase,
        userId: 'user-123',
        applicationId: 'app-123',
        content: 'Preview content',
      });

      // Verify update was called to mark previous draft/preview as not latest
      expect(mockChain.update).toHaveBeenCalledWith({ is_latest: false });
      expect(mockChain.in).toHaveBeenCalledWith('kind', ['draft', 'preview']);

      // Verify insert was called with correct data
      expect(mockChain.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        application_id: 'app-123',
        kind: 'preview',
        content: 'Preview content',
        is_latest: true,
      });

      // Verify result
      expect(result.data).toEqual({
        id: 'preview-id-1',
        userId: 'user-123',
        applicationId: 'app-123',
        kind: 'preview',
        content: 'Preview content',
        isLatest: true,
        createdAt: '2025-12-28T12:00:00.000Z',
      });
      expect(result.error).toBeNull();
    });

    it('should handle insert errors gracefully', async () => {
      const { mockSupabase, mockChain } = createMockSupabase();

      // Mock successful update
      mockChain.update.mockReturnValue(mockChain);
      mockChain.eq.mockReturnValue(mockChain);
      mockChain.in.mockReturnValue(mockChain);

      // Mock insert error
      mockChain.single.mockResolvedValue({
        data: null,
        error: { code: 'INSERT_ERROR', message: 'Insert failed' },
      });

      const result = await createPreviewVersion({
        supabase: mockSupabase,
        userId: 'user-123',
        applicationId: 'app-123',
        content: 'Preview content',
      });

      expect(result.error).not.toBeNull();
      expect(result.error.code).toBe('INSERT_FAILED');
    });
  });
});
