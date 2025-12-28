/**
 * Jest tests for coverLetterVersionsRepo
 * Verifies latest draft semantics and basic fetch behavior.
 */

import { createDraftVersion, getLatestDraft, getLatestDraftOrPreview } from "../coverLetterVersionsRepo";

function createUpdateChain({ error = null } = {}) {
  const chain = {
    update: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    in: jest.fn(() => chain),
    then: (resolve, reject) => Promise.resolve({ data: null, error }).then(resolve, reject),
  };
  return chain;
}

function createInsertChain({ data = null, error = null } = {}) {
  const chain = {
    insert: jest.fn(() => chain),
    select: jest.fn(() => chain),
    single: jest.fn(async () => ({ data, error })),
  };
  return chain;
}

function createSelectSingleChain({ data = null, error = null } = {}) {
  const chain = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    in: jest.fn(() => chain),
    single: jest.fn(async () => ({ data, error })),
  };
  return chain;
}

describe("coverLetterVersionsRepo", () => {
  describe("createDraftVersion", () => {
    test("marks previous draft/preview not latest then inserts new draft", async () => {
      const updateChain = createUpdateChain({ error: null });
      const insertChain = createInsertChain({
        data: {
          id: "new-draft-id",
          user_id: "user-123",
          application_id: "app-123",
          kind: "draft",
          content: "New draft content",
          is_latest: true,
          created_at: "2025-12-28T10:00:00.000Z",
        },
        error: null,
      });

      const supabase = {
        from: jest.fn().mockReturnValueOnce(updateChain).mockReturnValueOnce(insertChain),
      };

      const result = await createDraftVersion({
        supabase,
        userId: "user-123",
        applicationId: "app-123",
        content: "New draft content",
      });

      expect(result.error).toBeNull();
      expect(result.data).toEqual({
        id: "new-draft-id",
        userId: "user-123",
        applicationId: "app-123",
        kind: "draft",
        content: "New draft content",
        isLatest: true,
        createdAt: "2025-12-28T10:00:00.000Z",
      });

      expect(supabase.from).toHaveBeenNthCalledWith(1, "cover_letter_versions");
      expect(updateChain.update).toHaveBeenCalledWith({ is_latest: false });
      expect(updateChain.in).toHaveBeenCalledWith("kind", ["draft", "preview"]);

      expect(supabase.from).toHaveBeenNthCalledWith(2, "cover_letter_versions");
      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          application_id: "app-123",
          kind: "draft",
          is_latest: true,
        })
      );
    });

    test("returns UPDATE_FAILED when update step fails", async () => {
      const updateChain = createUpdateChain({ error: { code: "UPDATE_ERROR", message: "Update failed" } });
      const supabase = {
        from: jest.fn().mockReturnValue(updateChain),
      };

      const result = await createDraftVersion({
        supabase,
        userId: "user-123",
        applicationId: "app-123",
        content: "New draft content",
      });

      expect(result.data).toBeNull();
      expect(result.error).toMatchObject({
        code: "UPDATE_FAILED",
        message: "Failed to update previous draft versions",
      });
      expect(result.error.details).toMatchObject({
        dbCode: "UPDATE_ERROR",
        dbMessage: "Update failed",
      });
    });

    test("returns INSERT_FAILED when insert step fails", async () => {
      const updateChain = createUpdateChain({ error: null });
      const insertChain = createInsertChain({
        data: null,
        error: { code: "INSERT_ERROR", message: "Insert failed" },
      });

      const supabase = {
        from: jest.fn().mockReturnValueOnce(updateChain).mockReturnValueOnce(insertChain),
      };

      const result = await createDraftVersion({
        supabase,
        userId: "user-123",
        applicationId: "app-123",
        content: "New draft content",
      });

      expect(result.data).toBeNull();
      expect(result.error).toMatchObject({
        code: "INSERT_FAILED",
        message: "Failed to create new draft version",
      });
      expect(result.error.details).toMatchObject({
        dbCode: "INSERT_ERROR",
        dbMessage: "Insert failed",
      });
    });
  });

  describe("getLatestDraft", () => {
    test("returns latest draft when it exists", async () => {
      const chain = createSelectSingleChain({
        data: {
          id: "draft-id",
          user_id: "user-123",
          application_id: "app-123",
          kind: "draft",
          content: "Latest draft content",
          is_latest: true,
          created_at: "2025-12-28T10:00:00.000Z",
        },
        error: null,
      });
      const supabase = { from: jest.fn(() => chain) };

      const result = await getLatestDraft({
        supabase,
        userId: "user-123",
        applicationId: "app-123",
      });

      expect(result.error).toBeNull();
      expect(result.data.kind).toBe("draft");
      expect(chain.eq).toHaveBeenCalledWith("kind", "draft");
    });
  });

  describe("getLatestDraftOrPreview", () => {
    test("returns preview when preview is latest", async () => {
      const chain = createSelectSingleChain({
        data: {
          id: "preview-id",
          user_id: "user-123",
          application_id: "app-123",
          kind: "preview",
          content: "Preview content",
          is_latest: true,
          created_at: "2025-12-28T10:00:00.000Z",
        },
        error: null,
      });
      const supabase = { from: jest.fn(() => chain) };

      const result = await getLatestDraftOrPreview({
        supabase,
        userId: "user-123",
        applicationId: "app-123",
      });

      expect(result.error).toBeNull();
      expect(result.data.kind).toBe("preview");
      expect(chain.in).toHaveBeenCalledWith("kind", ["draft", "preview"]);
    });
  });
});
