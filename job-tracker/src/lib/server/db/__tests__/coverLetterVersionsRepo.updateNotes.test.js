/**
 * Tests for updateSubmissionNotes in coverLetterVersionsRepo
 * Tests updating submission metadata (where/notes/submittedAt) for submitted versions
 */

import { updateSubmissionNotes } from '../coverLetterVersionsRepo';

// Mock Supabase client helper
function createMockSupabase() {
  let mockChain;

  const mockSupabase = {
    from: jest.fn(() => mockChain),
  };

  const resetChain = () => {
    mockChain = {
      update: jest.fn(() => mockChain),
      eq: jest.fn(() => mockChain),
      select: jest.fn(() => mockChain),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    };
    return mockChain;
  };

  mockChain = resetChain();

  return { mockSupabase, mockChain, resetChain };
}

describe('updateSubmissionNotes', () => {
  test('should update submission notes for a submitted version', async () => {
    const { mockSupabase, mockChain } = createMockSupabase();

    mockChain.single.mockResolvedValue({
      data: {
        id: 'version-id-1',
        user_id: 'user-123',
        application_id: 'app-123',
        kind: 'submitted',
        content: 'Original content',
        is_latest: true,
        created_at: '2025-12-28T12:00:00.000Z',
        submission_where: 'Company Portal',
        submission_notes: 'Applied via job board',
        submitted_at: '2025-12-28T13:00:00.000Z',
      },
      error: null,
    });

    const result = await updateSubmissionNotes({
      supabase: mockSupabase,
      userId: 'user-123',
      id: 'version-id-1',
      patch: {
        submissionWhere: 'Company Portal',
        submissionNotes: 'Applied via job board',
        submittedAt: '2025-12-28T13:00:00.000Z',
      },
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      id: 'version-id-1',
      userId: 'user-123',
      applicationId: 'app-123',
      kind: 'submitted',
      content: 'Original content',
      isLatest: true,
      createdAt: '2025-12-28T12:00:00.000Z',
      submissionWhere: 'Company Portal',
      submissionNotes: 'Applied via job board',
      submittedAt: '2025-12-28T13:00:00.000Z',
    });

    // Verify update was called with correct parameters
    expect(mockSupabase.from).toHaveBeenCalledWith('cover_letter_versions');
    expect(mockChain.update).toHaveBeenCalledWith({
      submission_where: 'Company Portal',
      submission_notes: 'Applied via job board',
      submitted_at: '2025-12-28T13:00:00.000Z',
    });
    expect(mockChain.eq).toHaveBeenCalledWith('id', 'version-id-1');
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123');
  });

  test('should handle partial updates (only submissionWhere)', async () => {
    const { mockSupabase, mockChain } = createMockSupabase();

    mockChain.single.mockResolvedValue({
      data: {
        id: 'version-id-1',
        user_id: 'user-123',
        application_id: 'app-123',
        kind: 'submitted',
        content: 'Original content',
        is_latest: true,
        created_at: '2025-12-28T12:00:00.000Z',
        submission_where: 'LinkedIn',
        submission_notes: null,
        submitted_at: null,
      },
      error: null,
    });

    const result = await updateSubmissionNotes({
      supabase: mockSupabase,
      userId: 'user-123',
      id: 'version-id-1',
      patch: {
        submissionWhere: 'LinkedIn',
      },
    });

    expect(result.error).toBeNull();
    expect(result.data.submissionWhere).toBe('LinkedIn');
    expect(mockChain.update).toHaveBeenCalledWith({
      submission_where: 'LinkedIn',
    });
  });

  test('should handle null values to clear fields', async () => {
    const { mockSupabase, mockChain } = createMockSupabase();

    mockChain.single.mockResolvedValue({
      data: {
        id: 'version-id-1',
        user_id: 'user-123',
        application_id: 'app-123',
        kind: 'submitted',
        content: 'Original content',
        is_latest: true,
        created_at: '2025-12-28T12:00:00.000Z',
        submission_where: null,
        submission_notes: null,
        submitted_at: null,
      },
      error: null,
    });

    const result = await updateSubmissionNotes({
      supabase: mockSupabase,
      userId: 'user-123',
      id: 'version-id-1',
      patch: {
        submissionWhere: null,
        submissionNotes: null,
      },
    });

    expect(result.error).toBeNull();
    expect(mockChain.update).toHaveBeenCalledWith({
      submission_where: null,
      submission_notes: null,
    });
  });

  test('should return NOT_FOUND when version does not exist', async () => {
    const { mockSupabase, mockChain } = createMockSupabase();

    mockChain.single.mockResolvedValue({
      data: null,
      error: {
        code: 'PGRST116',
        message: 'No rows found',
      },
    });

    const result = await updateSubmissionNotes({
      supabase: mockSupabase,
      userId: 'user-123',
      id: 'non-existent-id',
      patch: {
        submissionWhere: 'Company Portal',
      },
    });

    expect(result.data).toBeNull();
    expect(result.error).toEqual({
      code: 'NOT_FOUND',
      message: 'Cover letter version not found or not owned by user',
    });
  });

  test('should return UPDATE_FAILED when database update fails', async () => {
    const { mockSupabase, mockChain } = createMockSupabase();

    mockChain.single.mockResolvedValue({
      data: null,
      error: {
        code: '23505',
        message: 'Database constraint violation',
      },
    });

    const result = await updateSubmissionNotes({
      supabase: mockSupabase,
      userId: 'user-123',
      id: 'version-id-1',
      patch: {
        submissionWhere: 'Company Portal',
      },
    });

    expect(result.data).toBeNull();
    expect(result.error.code).toBe('UPDATE_FAILED');
  });

  test('should be user-scoped (cannot update other users versions)', async () => {
    const { mockSupabase, mockChain } = createMockSupabase();

    // Simulate RLS blocking the update (no rows returned)
    mockChain.single.mockResolvedValue({
      data: null,
      error: {
        code: 'PGRST116',
        message: 'No rows found',
      },
    });

    const result = await updateSubmissionNotes({
      supabase: mockSupabase,
      userId: 'user-123',
      id: 'version-owned-by-user-456',
      patch: {
        submissionWhere: 'Company Portal',
      },
    });

    expect(result.data).toBeNull();
    expect(result.error.code).toBe('NOT_FOUND');

    // Verify user_id was used in the query
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123');
  });

  test('should NOT update content field (immutability check)', async () => {
    const { mockSupabase, mockChain } = createMockSupabase();

    mockChain.single.mockResolvedValue({
      data: {
        id: 'version-id-1',
        user_id: 'user-123',
        application_id: 'app-123',
        kind: 'submitted',
        content: 'Original content unchanged',
        is_latest: true,
        created_at: '2025-12-28T12:00:00.000Z',
        submission_where: 'LinkedIn',
        submission_notes: null,
        submitted_at: null,
      },
      error: null,
    });

    const result = await updateSubmissionNotes({
      supabase: mockSupabase,
      userId: 'user-123',
      id: 'version-id-1',
      patch: {
        submissionWhere: 'LinkedIn',
        // Even if caller tries to pass content, it should be ignored
        content: 'Attempted malicious content change',
      },
    });

    expect(result.error).toBeNull();

    // Verify content was NOT in the update call
    const updateCall = mockChain.update.mock.calls[0][0];
    expect(updateCall).not.toHaveProperty('content');
    expect(updateCall).toEqual({
      submission_where: 'LinkedIn',
    });
  });

  test('should handle unexpected errors gracefully', async () => {
    const { mockSupabase, mockChain } = createMockSupabase();

    mockChain.single.mockRejectedValue(new Error('Network failure'));

    const result = await updateSubmissionNotes({
      supabase: mockSupabase,
      userId: 'user-123',
      id: 'version-id-1',
      patch: {
        submissionWhere: 'Company Portal',
      },
    });

    expect(result.data).toBeNull();
    expect(result.error.code).toBe('UNKNOWN_ERROR');
  });
});
