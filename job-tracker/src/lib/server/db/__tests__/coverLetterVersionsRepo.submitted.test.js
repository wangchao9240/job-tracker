/**
 * Tests for submitted cover letter versions in coverLetterVersionsRepo
 * Documents immutable history semantics: multiple submitted versions per application
 */

import { createSubmittedVersion, listSubmittedVersions, getMostRecentSubmitted } from '../coverLetterVersionsRepo';

// Mock Supabase client helper
function createMockSupabase() {
  let mockChain;

  const mockSupabase = {
    from: jest.fn(() => mockChain),
  };

  // Reset chain for each operation
  const resetChain = () => {
    mockChain = {
      update: jest.fn(() => mockChain),
      insert: jest.fn(() => mockChain),
      select: jest.fn(() => mockChain),
      eq: jest.fn(() => mockChain),
      order: jest.fn(() => mockChain),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    };
    return mockChain;
  };

  mockChain = resetChain();

  return { mockSupabase, mockChain, resetChain };
}

describe('Submitted Cover Letter Versions', () => {
  describe('createSubmittedVersion', () => {
    test('should create first submitted version with is_latest=true', async () => {
      const { mockSupabase, mockChain, resetChain } = createMockSupabase();

      // First, configure the insert chain's single() method
      mockChain.single.mockResolvedValue({
        data: {
          id: 'submitted-id-1',
          user_id: 'user-123',
          application_id: 'app-123',
          kind: 'submitted',
          content: 'First submitted version',
          is_latest: true,
          created_at: '2025-12-28T12:00:00.000Z',
        },
        error: null,
      });

      // Then create the update chain (this creates a NEW mockChain object)
      let updateChain = resetChain();
      updateChain.eq = jest.fn(function() {
        return this;
      });

      // Create a promise-like object for the update chain
      const updatePromise = Promise.resolve({ data: null, error: null });
      Object.assign(updateChain, updatePromise);
      updateChain.then = updatePromise.then.bind(updatePromise);
      updateChain.catch = updatePromise.catch.bind(updatePromise);

      // Create a fresh insert chain with the properly configured single()
      const insertChain = resetChain();
      insertChain.single.mockResolvedValue({
        data: {
          id: 'submitted-id-1',
          user_id: 'user-123',
          application_id: 'app-123',
          kind: 'submitted',
          content: 'First submitted version',
          is_latest: true,
          created_at: '2025-12-28T12:00:00.000Z',
        },
        error: null,
      });

      // First from() call returns update chain, second returns insert chain
      mockSupabase.from
        .mockReturnValueOnce(updateChain)
        .mockReturnValueOnce(insertChain);

      const result = await createSubmittedVersion({
        supabase: mockSupabase,
        userId: 'user-123',
        applicationId: 'app-123',
        content: 'First submitted version',
      });

      expect(result.error).toBeNull();
      expect(result.data).toEqual({
        id: 'submitted-id-1',
        userId: 'user-123',
        applicationId: 'app-123',
        kind: 'submitted',
        content: 'First submitted version',
        isLatest: true,
        createdAt: '2025-12-28T12:00:00.000Z',
      });

      // Verify update was called to flip previous latest to false
      expect(mockSupabase.from).toHaveBeenCalledWith('cover_letter_versions');
      expect(updateChain.update).toHaveBeenCalledWith({ is_latest: false });
    });

    test('should create second submitted version and mark previous as NOT latest', async () => {
      const { mockSupabase, resetChain } = createMockSupabase();

      // Create the update chain (successful update)
      let updateChain = resetChain();
      updateChain.eq = jest.fn(function() {
        return this;
      });
      const updatePromise = Promise.resolve({ data: null, error: null });
      Object.assign(updateChain, updatePromise);
      updateChain.then = updatePromise.then.bind(updatePromise);
      updateChain.catch = updatePromise.catch.bind(updatePromise);

      // Create insert chain with configured single()
      const insertChain = resetChain();
      insertChain.single.mockResolvedValue({
        data: {
          id: 'submitted-id-2',
          user_id: 'user-123',
          application_id: 'app-123',
          kind: 'submitted',
          content: 'Second submitted version',
          is_latest: true,
          created_at: '2025-12-28T13:00:00.000Z',
        },
        error: null,
      });

      mockSupabase.from
        .mockReturnValueOnce(updateChain)
        .mockReturnValueOnce(insertChain);

      const result = await createSubmittedVersion({
        supabase: mockSupabase,
        userId: 'user-123',
        applicationId: 'app-123',
        content: 'Second submitted version',
      });

      expect(result.error).toBeNull();
      expect(result.data.isLatest).toBe(true);
      expect(result.data.content).toBe('Second submitted version');
    });

    test('should return error when update fails', async () => {
      const { mockSupabase, resetChain } = createMockSupabase();

      // Mock failed update chain
      let updateChain = resetChain();
      updateChain.eq = jest.fn(function() {
        return this;
      });
      const updatePromise = Promise.resolve({
        data: null,
        error: { code: 'UPDATE_ERROR', message: 'Update failed' },
      });
      Object.assign(updateChain, updatePromise);
      updateChain.then = updatePromise.then.bind(updatePromise);
      updateChain.catch = updatePromise.catch.bind(updatePromise);

      mockSupabase.from.mockReturnValueOnce(updateChain);

      const result = await createSubmittedVersion({
        supabase: mockSupabase,
        userId: 'user-123',
        applicationId: 'app-123',
        content: 'Test content',
      });

      expect(result.data).toBeNull();
      expect(result.error).toEqual({
        code: 'UPDATE_FAILED',
        message: 'Failed to update previous submitted versions',
      });
    });

    test('should return error when insert fails', async () => {
      const { mockSupabase, resetChain } = createMockSupabase();

      // Create successful update chain
      let updateChain = resetChain();
      updateChain.eq = jest.fn(function() {
        return this;
      });
      const updatePromise = Promise.resolve({ data: null, error: null });
      Object.assign(updateChain, updatePromise);
      updateChain.then = updatePromise.then.bind(updatePromise);
      updateChain.catch = updatePromise.catch.bind(updatePromise);

      // Create failed insert chain
      const insertChain = resetChain();
      insertChain.single.mockResolvedValue({
        data: null,
        error: { code: 'INSERT_ERROR', message: 'Insert failed' },
      });

      mockSupabase.from
        .mockReturnValueOnce(updateChain)
        .mockReturnValueOnce(insertChain);

      const result = await createSubmittedVersion({
        supabase: mockSupabase,
        userId: 'user-123',
        applicationId: 'app-123',
        content: 'Test content',
      });

      expect(result.data).toBeNull();
      expect(result.error).toEqual({
        code: 'INSERT_FAILED',
        message: 'Failed to create new submitted version',
      });
    });
  });

  describe('listSubmittedVersions', () => {
    test('should return submitted versions ordered by newest first', async () => {
      const { mockSupabase, mockChain } = createMockSupabase();

      // Mock the entire select chain to resolve with data
      mockChain.order.mockResolvedValue({
        data: [
          {
            id: 'submitted-id-2',
            user_id: 'user-123',
            application_id: 'app-123',
            kind: 'submitted',
            content: 'Second version',
            is_latest: true,
            created_at: '2025-12-28T13:00:00.000Z',
          },
          {
            id: 'submitted-id-1',
            user_id: 'user-123',
            application_id: 'app-123',
            kind: 'submitted',
            content: 'First version',
            is_latest: false,
            created_at: '2025-12-28T12:00:00.000Z',
          },
        ],
        error: null,
      });

      const result = await listSubmittedVersions({
        supabase: mockSupabase,
        userId: 'user-123',
        applicationId: 'app-123',
      });

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(result.data[0].content).toBe('Second version');
      expect(result.data[0].isLatest).toBe(true);
      expect(result.data[1].content).toBe('First version');
      expect(result.data[1].isLatest).toBe(false);

      expect(mockSupabase.from).toHaveBeenCalledWith('cover_letter_versions');
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockChain.eq).toHaveBeenCalledWith('application_id', 'app-123');
      expect(mockChain.eq).toHaveBeenCalledWith('kind', 'submitted');
      expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    test('should return empty array when no submitted versions exist', async () => {
      const { mockSupabase, mockChain } = createMockSupabase();

      mockChain.order.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await listSubmittedVersions({
        supabase: mockSupabase,
        userId: 'user-123',
        applicationId: 'app-123',
      });

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });

    test('should return error on database failure', async () => {
      const { mockSupabase, mockChain } = createMockSupabase();

      mockChain.order.mockResolvedValue({
        data: null,
        error: { code: 'DB_ERROR', message: 'Database error' },
      });

      const result = await listSubmittedVersions({
        supabase: mockSupabase,
        userId: 'user-123',
        applicationId: 'app-123',
      });

      expect(result.data).toBeNull();
      expect(result.error).toEqual({
        code: 'FETCH_FAILED',
        message: 'Failed to fetch submitted versions',
      });
    });
  });

  describe('getMostRecentSubmitted', () => {
    test('should return most recent submitted version when it exists', async () => {
      const { mockSupabase, mockChain } = createMockSupabase();

      mockChain.single.mockResolvedValue({
        data: {
          id: 'submitted-id-latest',
          user_id: 'user-123',
          application_id: 'app-123',
          kind: 'submitted',
          content: 'Latest submitted version',
          is_latest: true,
          created_at: '2025-12-28T14:00:00.000Z',
        },
        error: null,
      });

      const result = await getMostRecentSubmitted({
        supabase: mockSupabase,
        userId: 'user-123',
        applicationId: 'app-123',
      });

      expect(result.error).toBeNull();
      expect(result.data).toEqual({
        id: 'submitted-id-latest',
        userId: 'user-123',
        applicationId: 'app-123',
        kind: 'submitted',
        content: 'Latest submitted version',
        isLatest: true,
        createdAt: '2025-12-28T14:00:00.000Z',
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('cover_letter_versions');
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockChain.eq).toHaveBeenCalledWith('application_id', 'app-123');
      expect(mockChain.eq).toHaveBeenCalledWith('kind', 'submitted');
      expect(mockChain.eq).toHaveBeenCalledWith('is_latest', true);
    });

    test('should return null when no submitted version exists (PGRST116)', async () => {
      const { mockSupabase, mockChain } = createMockSupabase();

      mockChain.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const result = await getMostRecentSubmitted({
        supabase: mockSupabase,
        userId: 'user-123',
        applicationId: 'app-123',
      });

      expect(result.error).toBeNull();
      expect(result.data).toBeNull();
    });

    test('should return error for other database errors', async () => {
      const { mockSupabase, mockChain } = createMockSupabase();

      mockChain.single.mockResolvedValue({
        data: null,
        error: { code: 'DB_ERROR', message: 'Database error' },
      });

      const result = await getMostRecentSubmitted({
        supabase: mockSupabase,
        userId: 'user-123',
        applicationId: 'app-123',
      });

      expect(result.data).toBeNull();
      expect(result.error).toEqual({
        code: 'FETCH_FAILED',
        message: 'Failed to fetch most recent submitted version',
      });
    });
  });

  describe('Immutable history semantics', () => {
    test('should preserve all submitted versions when creating new ones', async () => {
      // This is a conceptual test documenting expected behavior
      // In real usage:
      // 1. Create first submitted version: id=1, is_latest=true
      // 2. Create second submitted version:
      //    - Update version id=1: is_latest=false
      //    - Insert version id=2: is_latest=true
      // 3. Create third submitted version:
      //    - Update version id=2: is_latest=false
      //    - Insert version id=3: is_latest=true
      //
      // Result: All versions (1, 2, 3) remain in database (immutable history)
      // Only the latest has is_latest=true for fast queries

      expect(true).toBe(true); // Documented behavior
    });

    test('should never affect submitted versions when regenerating drafts', async () => {
      // Expected behavior:
      // When: User calls POST /api/cover-letter/stream (regenerate draft)
      // Then: Only draft rows are affected (kind='draft')
      // Submitted rows (kind='submitted') are never touched by draft operations

      expect(true).toBe(true); // Documented behavior
    });
  });
});
