/**
 * Unit tests for projectsRepo
 * Tests snake_case ↔ camelCase mapping and repository methods
 */

import {
  createProject,
  getProjectById,
  listProjects,
  updateProject,
  deleteProject,
} from "../projectsRepo.js";

describe("projectsRepo", () => {
  describe("createProject", () => {
    it("should convert camelCase input to snake_case for DB", async () => {
      const mockDbRecord = {
        id: "project-123",
        user_id: "user-123",
        name: "E-commerce Platform",
        description: "A full-stack e-commerce solution",
        role: "Frontend Developer",
        tech_stack: "React, Node.js, PostgreSQL",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDbRecord,
          error: null,
        }),
      };

      const result = await createProject({
        supabase: mockSupabase,
        userId: "user-123",
        values: {
          name: "E-commerce Platform",
          description: "A full-stack e-commerce solution",
          role: "Frontend Developer",
          techStack: "React, Node.js, PostgreSQL",
        },
      });

      expect(mockSupabase.insert).toHaveBeenCalledWith({
        user_id: "user-123",
        name: "E-commerce Platform",
        description: "A full-stack e-commerce solution",
        role: "Frontend Developer",
        tech_stack: "React, Node.js, PostgreSQL",
      });

      expect(result).toEqual({
        id: "project-123",
        userId: "user-123",
        name: "E-commerce Platform",
        description: "A full-stack e-commerce solution",
        role: "Frontend Developer",
        techStack: "React, Node.js, PostgreSQL",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      });
    });

    it("should handle minimal project with only name", async () => {
      const mockDbRecord = {
        id: "project-123",
        user_id: "user-123",
        name: "Minimal Project",
        description: null,
        role: null,
        tech_stack: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDbRecord,
          error: null,
        }),
      };

      const result = await createProject({
        supabase: mockSupabase,
        userId: "user-123",
        values: {
          name: "Minimal Project",
        },
      });

      expect(mockSupabase.insert).toHaveBeenCalledWith({
        user_id: "user-123",
        name: "Minimal Project",
      });

      expect(result).toEqual({
        id: "project-123",
        userId: "user-123",
        name: "Minimal Project",
        description: null,
        role: null,
        techStack: null,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      });
    });

    it("should throw error when DB insert fails", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Insert failed", code: "23505" },
        }),
      };

      await expect(
        createProject({
          supabase: mockSupabase,
          userId: "user-123",
          values: { name: "Test Project" },
        })
      ).rejects.toMatchObject({
        message: "Insert failed",
        code: "23505",
      });
    });
  });

  describe("getProjectById", () => {
    it("should convert DB record (snake_case) to API format (camelCase)", async () => {
      const mockDbRecord = {
        id: "project-123",
        user_id: "user-123",
        name: "Test Project",
        description: "Test description",
        role: "Developer",
        tech_stack: "React",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-02T00:00:00Z",
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

      const result = await getProjectById({
        supabase: mockSupabase,
        userId: "user-123",
        id: "project-123",
      });

      expect(mockSupabase.eq).toHaveBeenCalledWith("id", "project-123");
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-123");

      expect(result).toEqual({
        id: "project-123",
        userId: "user-123",
        name: "Test Project",
        description: "Test description",
        role: "Developer",
        techStack: "React",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-02T00:00:00Z",
      });
    });

    it("should return null when project not found (PGRST116)", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "No rows returned" },
        }),
      };

      const result = await getProjectById({
        supabase: mockSupabase,
        userId: "user-123",
        id: "nonexistent",
      });

      expect(result).toBeNull();
    });

    it("should return null when user does not own project (enforced by RLS + eq check)", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "No rows returned" },
        }),
      };

      const result = await getProjectById({
        supabase: mockSupabase,
        userId: "user-123",
        id: "project-owned-by-other-user",
      });

      expect(result).toBeNull();
    });

    it("should throw error for non-PGRST116 errors", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "42P01", message: "Table does not exist" },
        }),
      };

      await expect(
        getProjectById({
          supabase: mockSupabase,
          userId: "user-123",
          id: "project-123",
        })
      ).rejects.toMatchObject({
        code: "42P01",
        message: "Table does not exist",
      });
    });
  });

  describe("listProjects", () => {
    it("should return array of projects in camelCase", async () => {
      const mockDbRecords = [
        {
          id: "project-1",
          user_id: "user-123",
          name: "Project 1",
          description: "Description 1",
          role: "Developer",
          tech_stack: "React",
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
        {
          id: "project-2",
          user_id: "user-123",
          name: "Project 2",
          description: null,
          role: null,
          tech_stack: null,
          created_at: "2025-01-02T00:00:00Z",
          updated_at: "2025-01-02T00:00:00Z",
        },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockDbRecords,
          error: null,
        }),
      };

      const result = await listProjects({
        supabase: mockSupabase,
        userId: "user-123",
      });

      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-123");
      expect(mockSupabase.order).toHaveBeenCalledWith("updated_at", { ascending: false });

      expect(result).toEqual([
        {
          id: "project-1",
          userId: "user-123",
          name: "Project 1",
          description: "Description 1",
          role: "Developer",
          techStack: "React",
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
        },
        {
          id: "project-2",
          userId: "user-123",
          name: "Project 2",
          description: null,
          role: null,
          techStack: null,
          createdAt: "2025-01-02T00:00:00Z",
          updatedAt: "2025-01-02T00:00:00Z",
        },
      ]);
    });

    it("should return empty array when user has no projects", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const result = await listProjects({
        supabase: mockSupabase,
        userId: "user-123",
      });

      expect(result).toEqual([]);
    });

    it("should return empty array when data is null", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      const result = await listProjects({
        supabase: mockSupabase,
        userId: "user-123",
      });

      expect(result).toEqual([]);
    });

    it("should throw error when query fails", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Query failed" },
        }),
      };

      await expect(
        listProjects({
          supabase: mockSupabase,
          userId: "user-123",
        })
      ).rejects.toMatchObject({
        message: "Query failed",
      });
    });
  });

  describe("updateProject", () => {
    it("should convert camelCase patch to snake_case for DB", async () => {
      const mockDbRecord = {
        id: "project-123",
        user_id: "user-123",
        name: "Updated Project",
        description: "Updated description",
        role: "Senior Developer",
        tech_stack: "React, Node.js",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-02T00:00:00Z",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDbRecord,
          error: null,
        }),
      };

      const result = await updateProject({
        supabase: mockSupabase,
        userId: "user-123",
        id: "project-123",
        patch: {
          name: "Updated Project",
          description: "Updated description",
          techStack: "React, Node.js",
        },
      });

      expect(mockSupabase.update).toHaveBeenCalledWith({
        name: "Updated Project",
        description: "Updated description",
        tech_stack: "React, Node.js",
      });

      expect(mockSupabase.eq).toHaveBeenCalledWith("id", "project-123");
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-123");

      expect(result).toEqual({
        id: "project-123",
        userId: "user-123",
        name: "Updated Project",
        description: "Updated description",
        role: "Senior Developer",
        techStack: "React, Node.js",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-02T00:00:00Z",
      });
    });

    it("should handle partial updates", async () => {
      const mockDbRecord = {
        id: "project-123",
        user_id: "user-123",
        name: "Updated Name",
        description: "Old description",
        role: "Developer",
        tech_stack: "React",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-02T00:00:00Z",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDbRecord,
          error: null,
        }),
      };

      const result = await updateProject({
        supabase: mockSupabase,
        userId: "user-123",
        id: "project-123",
        patch: {
          name: "Updated Name",
        },
      });

      expect(mockSupabase.update).toHaveBeenCalledWith({
        name: "Updated Name",
      });

      expect(result).toEqual({
        id: "project-123",
        userId: "user-123",
        name: "Updated Name",
        description: "Old description",
        role: "Developer",
        techStack: "React",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-02T00:00:00Z",
      });
    });

    it("should return null when project not found (PGRST116)", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "No rows returned" },
        }),
      };

      const result = await updateProject({
        supabase: mockSupabase,
        userId: "user-123",
        id: "nonexistent",
        patch: { name: "Updated" },
      });

      expect(result).toBeNull();
    });

    it("should return null when user does not own project (enforced by RLS + eq check)", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "No rows returned" },
        }),
      };

      const result = await updateProject({
        supabase: mockSupabase,
        userId: "user-123",
        id: "project-owned-by-other-user",
        patch: { name: "Updated" },
      });

      expect(result).toBeNull();
    });

    it("should throw error for non-PGRST116 errors", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "23505", message: "Duplicate key" },
        }),
      };

      await expect(
        updateProject({
          supabase: mockSupabase,
          userId: "user-123",
          id: "project-123",
          patch: { name: "Updated" },
        })
      ).rejects.toMatchObject({
        code: "23505",
        message: "Duplicate key",
      });
    });
  });

  describe("deleteProject", () => {
    it("should return true when project is successfully deleted", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null,
          count: 1,
        }),
      };

      const result = await deleteProject({
        supabase: mockSupabase,
        userId: "user-123",
        id: "project-123",
      });

      expect(mockSupabase.delete).toHaveBeenCalledWith({ count: "exact" });
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", "project-123");
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-123");

      expect(result).toBe(true);
    });

    it("should return false when project not found", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null,
          count: 0,
        }),
      };

      const result = await deleteProject({
        supabase: mockSupabase,
        userId: "user-123",
        id: "nonexistent",
      });

      expect(result).toBe(false);
    });

    it("should return false when user does not own project (enforced by RLS + eq check)", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null,
          count: 0,
        }),
      };

      const result = await deleteProject({
        supabase: mockSupabase,
        userId: "user-123",
        id: "project-owned-by-other-user",
      });

      expect(result).toBe(false);
    });

    it("should throw error when delete fails", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: "Delete failed" },
          count: null,
        }),
      };

      await expect(
        deleteProject({
          supabase: mockSupabase,
          userId: "user-123",
          id: "project-123",
        })
      ).rejects.toMatchObject({
        message: "Delete failed",
      });
    });
  });
});
