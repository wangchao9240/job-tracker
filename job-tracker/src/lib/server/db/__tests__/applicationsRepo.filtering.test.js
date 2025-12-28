/**
 * Unit tests for applicationsRepo filtering logic
 * Tests listApplications filter parameters
 */

import { listApplications } from "../applicationsRepo.js";

describe("applicationsRepo - listApplications filtering", () => {
  describe("status filter", () => {
    it("should filter by status", async () => {
      const mockData = [
        { id: "1", user_id: "user-id", company: "A", role: "Role", status: "draft" },
        { id: "2", user_id: "user-id", company: "B", role: "Role", status: "applied" },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockData.filter((d) => d.status === "applied"),
          error: null,
        }),
      };

      const result = await listApplications({
        supabase: mockSupabase,
        userId: "user-id",
        filters: { status: "applied" },
      });

      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-id");
      expect(mockSupabase.eq).toHaveBeenCalledWith("status", "applied");
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("applied");
    });

    it("should not filter when status is not provided", async () => {
      const mockData = [
        { id: "1", user_id: "user-id", company: "A", role: "Role", status: "draft" },
        { id: "2", user_id: "user-id", company: "B", role: "Role", status: "applied" },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      const result = await listApplications({
        supabase: mockSupabase,
        userId: "user-id",
        filters: {},
      });

      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-id");
      expect(mockSupabase.eq).not.toHaveBeenCalledWith("status", expect.anything());
      expect(result).toHaveLength(2);
    });
  });

  describe("source filter", () => {
    it("should filter by source", async () => {
      const mockData = [
        { id: "1", user_id: "user-id", company: "A", role: "Role", source: "seek" },
        { id: "2", user_id: "user-id", company: "B", role: "Role", source: "linkedin" },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockData.filter((d) => d.source === "seek"),
          error: null,
        }),
      };

      const result = await listApplications({
        supabase: mockSupabase,
        userId: "user-id",
        filters: { source: "seek" },
      });

      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-id");
      expect(mockSupabase.eq).toHaveBeenCalledWith("source", "seek");
      expect(result).toHaveLength(1);
      expect(result[0].source).toBe("seek");
    });

    it("should handle unknown source", async () => {
      const mockData = [
        { id: "1", user_id: "user-id", company: "A", role: "Role", source: "unknown" },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      const result = await listApplications({
        supabase: mockSupabase,
        userId: "user-id",
        filters: { source: "unknown" },
      });

      expect(result).toHaveLength(1);
      expect(result[0].source).toBe("unknown");
    });
  });

  describe("search query (q)", () => {
    it("should search by company name", async () => {
      const mockData = [
        { id: "1", user_id: "user-id", company: "Google", role: "SWE" },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      await listApplications({
        supabase: mockSupabase,
        userId: "user-id",
        filters: { q: "Google" },
      });

      expect(mockSupabase.or).toHaveBeenCalledWith("company.ilike.%Google%,role.ilike.%Google%");
    });

    it("should search by role name", async () => {
      const mockData = [
        { id: "1", user_id: "user-id", company: "Microsoft", role: "Engineer" },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      await listApplications({
        supabase: mockSupabase,
        userId: "user-id",
        filters: { q: "Engineer" },
      });

      expect(mockSupabase.or).toHaveBeenCalledWith("company.ilike.%Engineer%,role.ilike.%Engineer%");
    });

    it("should not search when q is empty string", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      await listApplications({
        supabase: mockSupabase,
        userId: "user-id",
        filters: { q: "" },
      });

      expect(mockSupabase.or).not.toHaveBeenCalled();
    });
  });

  describe("date range filter", () => {
    it("should filter by from date", async () => {
      const mockData = [
        { id: "1", user_id: "user-id", company: "A", role: "Role", applied_date: "2025-12-20" },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      await listApplications({
        supabase: mockSupabase,
        userId: "user-id",
        filters: { from: "2025-12-15" },
      });

      expect(mockSupabase.gte).toHaveBeenCalledWith("applied_date", "2025-12-15");
      expect(mockSupabase.not).toHaveBeenCalledWith("applied_date", "is", null);
    });

    it("should filter by to date", async () => {
      const mockData = [
        { id: "1", user_id: "user-id", company: "A", role: "Role", applied_date: "2025-12-20" },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      await listApplications({
        supabase: mockSupabase,
        userId: "user-id",
        filters: { to: "2025-12-25" },
      });

      expect(mockSupabase.lte).toHaveBeenCalledWith("applied_date", "2025-12-25");
      expect(mockSupabase.not).toHaveBeenCalledWith("applied_date", "is", null);
    });

    it("should filter by date range (from and to)", async () => {
      const mockData = [
        { id: "1", user_id: "user-id", company: "A", role: "Role", applied_date: "2025-12-20" },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      await listApplications({
        supabase: mockSupabase,
        userId: "user-id",
        filters: { from: "2025-12-15", to: "2025-12-25" },
      });

      expect(mockSupabase.gte).toHaveBeenCalledWith("applied_date", "2025-12-15");
      expect(mockSupabase.lte).toHaveBeenCalledWith("applied_date", "2025-12-25");
      expect(mockSupabase.not).toHaveBeenCalledWith("applied_date", "is", null);
    });

    it("should exclude null applied_date when date filter is active", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      await listApplications({
        supabase: mockSupabase,
        userId: "user-id",
        filters: { from: "2025-12-15" },
      });

      expect(mockSupabase.not).toHaveBeenCalledWith("applied_date", "is", null);
    });
  });

  describe("combined filters", () => {
    it("should apply multiple filters together", async () => {
      const mockData = [
        {
          id: "1",
          user_id: "user-id",
          company: "Google",
          role: "SWE",
          status: "applied",
          source: "linkedin",
          applied_date: "2025-12-20",
        },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      await listApplications({
        supabase: mockSupabase,
        userId: "user-id",
        filters: {
          status: "applied",
          source: "linkedin",
          q: "Google",
          from: "2025-12-15",
          to: "2025-12-25",
        },
      });

      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-id");
      expect(mockSupabase.eq).toHaveBeenCalledWith("status", "applied");
      expect(mockSupabase.eq).toHaveBeenCalledWith("source", "linkedin");
      expect(mockSupabase.or).toHaveBeenCalledWith("company.ilike.%Google%,role.ilike.%Google%");
      expect(mockSupabase.gte).toHaveBeenCalledWith("applied_date", "2025-12-15");
      expect(mockSupabase.lte).toHaveBeenCalledWith("applied_date", "2025-12-25");
    });
  });

  describe("error handling", () => {
    it("should throw on database error", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "DB_ERROR", message: "Query failed" },
        }),
      };

      await expect(
        listApplications({
          supabase: mockSupabase,
          userId: "user-id",
          filters: {},
        })
      ).rejects.toEqual({ code: "DB_ERROR", message: "Query failed" });
    });
  });
});
