/**
 * Unit tests for generationPreferencesRepo
 * Tests snake_case ↔ camelCase mapping and repository methods
 */

import {
  getGenerationPreferences,
  upsertGenerationPreferences,
} from "../generationPreferencesRepo.js";

describe("generationPreferencesRepo", () => {
  describe("getGenerationPreferences", () => {
    it("should return null when no preferences found", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" }, // No rows error
        }),
      };

      const result = await getGenerationPreferences({
        supabase: mockSupabase,
        userId: "test-user-id",
      });

      expect(result).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith("generation_preferences");
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "test-user-id");
    });

    it("should convert snake_case DB record to camelCase", async () => {
      const mockDbRecord = {
        user_id: "test-user-id",
        tone: "enthusiastic",
        emphasis: ["achievements", "technical_depth"],
        keywords_include: ["innovation", "problem-solving"],
        keywords_avoid: ["synergy"],
        created_at: "2025-12-27T00:00:00Z",
        updated_at: "2025-12-27T01:00:00Z",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDbRecord,
          error: null,
        }),
      };

      const result = await getGenerationPreferences({
        supabase: mockSupabase,
        userId: "test-user-id",
      });

      expect(result).toEqual({
        userId: "test-user-id",
        tone: "enthusiastic",
        emphasis: ["achievements", "technical_depth"],
        keywordsInclude: ["innovation", "problem-solving"],
        keywordsAvoid: ["synergy"],
        createdAt: "2025-12-27T00:00:00Z",
        updatedAt: "2025-12-27T01:00:00Z",
      });
    });

    it("should throw on non-PGRST116 errors", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "DB_ERROR", message: "Database error" },
        }),
      };

      await expect(
        getGenerationPreferences({
          supabase: mockSupabase,
          userId: "test-user-id",
        })
      ).rejects.toEqual({ code: "DB_ERROR", message: "Database error" });
    });
  });

  describe("upsertGenerationPreferences", () => {
    it("should convert camelCase input to snake_case for DB", async () => {
      const mockDbRecord = {
        user_id: "test-user-id",
        tone: "casual",
        emphasis: ["soft_skills"],
        keywords_include: ["teamwork"],
        keywords_avoid: ["leverage"],
        created_at: "2025-12-27T00:00:00Z",
        updated_at: "2025-12-27T01:00:00Z",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDbRecord,
          error: null,
        }),
      };

      const result = await upsertGenerationPreferences({
        supabase: mockSupabase,
        userId: "test-user-id",
        values: {
          tone: "casual",
          emphasis: ["soft_skills"],
          keywordsInclude: ["teamwork"],
          keywordsAvoid: ["leverage"],
        },
      });

      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        {
          user_id: "test-user-id",
          tone: "casual",
          emphasis: ["soft_skills"],
          keywords_include: ["teamwork"],
          keywords_avoid: ["leverage"],
        },
        { onConflict: "user_id" }
      );

      expect(result).toEqual({
        userId: "test-user-id",
        tone: "casual",
        emphasis: ["soft_skills"],
        keywordsInclude: ["teamwork"],
        keywordsAvoid: ["leverage"],
        createdAt: "2025-12-27T00:00:00Z",
        updatedAt: "2025-12-27T01:00:00Z",
      });
    });

    it("should handle partial updates (only provided fields)", async () => {
      const mockDbRecord = {
        user_id: "test-user-id",
        tone: "professional",
        emphasis: ["leadership"],
        keywords_include: [],
        keywords_avoid: [],
        created_at: "2025-12-27T00:00:00Z",
        updated_at: "2025-12-27T02:00:00Z",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDbRecord,
          error: null,
        }),
      };

      await upsertGenerationPreferences({
        supabase: mockSupabase,
        userId: "test-user-id",
        values: {
          emphasis: ["leadership"],
        },
      });

      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        {
          user_id: "test-user-id",
          emphasis: ["leadership"],
        },
        { onConflict: "user_id" }
      );
    });

    it("should throw on database error", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "DB_ERROR", message: "Insert failed" },
        }),
      };

      await expect(
        upsertGenerationPreferences({
          supabase: mockSupabase,
          userId: "test-user-id",
          values: { tone: "casual" },
        })
      ).rejects.toEqual({ code: "DB_ERROR", message: "Insert failed" });
    });
  });
});
