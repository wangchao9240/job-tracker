/**
 * Integration tests for /api/projects/[id] route
 * Tests { data, error } envelope, auth, and validation for GET/PATCH/DELETE
 */

import { NextResponse } from "next/server";
import { GET, PATCH, DELETE } from "../route.js";

// Mock dependencies
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({ body, status: init?.status || 200 })),
  },
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/server/db/projectsRepo", () => ({
  getProjectById: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getProjectById, updateProject, deleteProject } from "@/lib/server/db/projectsRepo";

describe("GET /api/projects/[id]", () => {
  let mockParams;
  let mockSupabase;
  let mockUser;

  beforeEach(() => {
    jest.clearAllMocks();
    NextResponse.json.mockClear();

    mockUser = { id: "user-123" };
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    };

    createClient.mockResolvedValue(mockSupabase);
    mockParams = Promise.resolve({ id: "project-123" });
  });

  describe("Authentication", () => {
    it("should return UNAUTHORIZED when no user session", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await GET({}, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: null, error: { code: "UNAUTHORIZED" } },
        { status: 401 }
      );
      expect(getProjectById).not.toHaveBeenCalled();
    });
  });

  describe("Success envelope", () => {
    it("should return { data, error: null } envelope on success", async () => {
      const mockProject = {
        id: "project-123",
        userId: "user-123",
        name: "Test Project",
        description: "Test description",
        role: "Developer",
        techStack: "React",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      };

      getProjectById.mockResolvedValue(mockProject);

      await GET({}, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: mockProject, error: null },
        { status: 200 }
      );
    });
  });

  describe("Not found handling", () => {
    it("should return NOT_FOUND when project does not exist", async () => {
      getProjectById.mockResolvedValue(null);

      await GET({}, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: null, error: { code: "NOT_FOUND" } },
        { status: 404 }
      );
    });

    it("should return NOT_FOUND when user does not own project (data isolation)", async () => {
      // getProjectById returns null when project not owned by user
      getProjectById.mockResolvedValue(null);

      await GET({}, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: null, error: { code: "NOT_FOUND" } },
        { status: 404 }
      );
    });
  });

  describe("Error handling", () => {
    it("should return FETCH_FAILED when getProjectById throws", async () => {
      getProjectById.mockRejectedValue(new Error("Database error"));

      await GET({}, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: null, error: { code: "FETCH_FAILED" } },
        { status: 500 }
      );
    });
  });
});

describe("PATCH /api/projects/[id]", () => {
  let mockRequest;
  let mockParams;
  let mockSupabase;
  let mockUser;

  beforeEach(() => {
    jest.clearAllMocks();
    NextResponse.json.mockClear();

    mockUser = { id: "user-123" };
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    };

    createClient.mockResolvedValue(mockSupabase);
    mockParams = Promise.resolve({ id: "project-123" });
  });

  describe("Authentication", () => {
    it("should return UNAUTHORIZED when no user session", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          name: "Updated Project",
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: null, error: { code: "UNAUTHORIZED" } },
        { status: 401 }
      );
      expect(updateProject).not.toHaveBeenCalled();
    });
  });

  describe("Request body validation", () => {
    it("should return INVALID_JSON when request body is invalid JSON", async () => {
      mockRequest = {
        json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: null, error: { code: "INVALID_JSON" } },
        { status: 400 }
      );
      expect(updateProject).not.toHaveBeenCalled();
    });

    it("should return VALIDATION_FAILED when name is empty string", async () => {
      mockRequest = {
        json: jest.fn().mockResolvedValue({
          name: "",
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: null,
          error: expect.objectContaining({
            code: "VALIDATION_FAILED",
          }),
        }),
        { status: 400 }
      );
      expect(updateProject).not.toHaveBeenCalled();
    });

    it("should accept partial update with only name", async () => {
      const mockUpdated = {
        id: "project-123",
        userId: "user-123",
        name: "Updated Name",
        description: "Old description",
        role: "Developer",
        techStack: "React",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-02T00:00:00Z",
      };

      updateProject.mockResolvedValue(mockUpdated);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          name: "Updated Name",
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(updateProject).toHaveBeenCalledWith({
        supabase: mockSupabase,
        userId: "user-123",
        id: "project-123",
        patch: { name: "Updated Name" },
      });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: mockUpdated, error: null },
        { status: 200 }
      );
    });

    it("should accept partial update with multiple fields", async () => {
      const mockUpdated = {
        id: "project-123",
        userId: "user-123",
        name: "Updated Project",
        description: "Updated description",
        role: "Senior Developer",
        techStack: "React, Node.js",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-02T00:00:00Z",
      };

      updateProject.mockResolvedValue(mockUpdated);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          description: "Updated description",
          role: "Senior Developer",
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(updateProject).toHaveBeenCalledWith({
        supabase: mockSupabase,
        userId: "user-123",
        id: "project-123",
        patch: {
          description: "Updated description",
          role: "Senior Developer",
        },
      });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: mockUpdated, error: null },
        { status: 200 }
      );
    });

    it("should accept null values for optional fields", async () => {
      const mockUpdated = {
        id: "project-123",
        userId: "user-123",
        name: "Project Name",
        description: null,
        role: null,
        techStack: null,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-02T00:00:00Z",
      };

      updateProject.mockResolvedValue(mockUpdated);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          description: null,
          role: null,
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(updateProject).toHaveBeenCalledWith({
        supabase: mockSupabase,
        userId: "user-123",
        id: "project-123",
        patch: {
          description: null,
          role: null,
        },
      });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: mockUpdated, error: null },
        { status: 200 }
      );
    });
  });

  describe("Success envelope", () => {
    it("should return { data, error: null } envelope on success", async () => {
      const mockUpdated = {
        id: "project-123",
        userId: "user-123",
        name: "Updated Project",
        description: "Updated description",
        role: "Developer",
        techStack: "React",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-02T00:00:00Z",
      };

      updateProject.mockResolvedValue(mockUpdated);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          name: "Updated Project",
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: mockUpdated, error: null },
        { status: 200 }
      );
    });
  });

  describe("Not found handling", () => {
    it("should return NOT_FOUND when project does not exist", async () => {
      updateProject.mockResolvedValue(null);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          name: "Updated Project",
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: null, error: { code: "NOT_FOUND" } },
        { status: 404 }
      );
    });

    it("should return NOT_FOUND when user does not own project (data isolation)", async () => {
      // updateProject returns null when project not owned by user
      updateProject.mockResolvedValue(null);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          name: "Updated Project",
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: null, error: { code: "NOT_FOUND" } },
        { status: 404 }
      );
    });
  });

  describe("Error handling", () => {
    it("should return UPDATE_FAILED when updateProject throws", async () => {
      updateProject.mockRejectedValue(new Error("Database error"));

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          name: "Updated Project",
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: null, error: { code: "UPDATE_FAILED" } },
        { status: 500 }
      );
    });
  });
});

describe("DELETE /api/projects/[id]", () => {
  let mockParams;
  let mockSupabase;
  let mockUser;

  beforeEach(() => {
    jest.clearAllMocks();
    NextResponse.json.mockClear();

    mockUser = { id: "user-123" };
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    };

    createClient.mockResolvedValue(mockSupabase);
    mockParams = Promise.resolve({ id: "project-123" });
  });

  describe("Authentication", () => {
    it("should return UNAUTHORIZED when no user session", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await DELETE({}, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: null, error: { code: "UNAUTHORIZED" } },
        { status: 401 }
      );
      expect(deleteProject).not.toHaveBeenCalled();
    });
  });

  describe("Success envelope", () => {
    it("should return { data: { success: true }, error: null } envelope on success", async () => {
      deleteProject.mockResolvedValue(true);

      await DELETE({}, { params: mockParams });

      expect(deleteProject).toHaveBeenCalledWith({
        supabase: mockSupabase,
        userId: "user-123",
        id: "project-123",
      });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: { success: true }, error: null },
        { status: 200 }
      );
    });
  });

  describe("Not found handling", () => {
    it("should return NOT_FOUND when project does not exist", async () => {
      deleteProject.mockResolvedValue(false);

      await DELETE({}, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: null, error: { code: "NOT_FOUND" } },
        { status: 404 }
      );
    });

    it("should return NOT_FOUND when user does not own project (data isolation)", async () => {
      // deleteProject returns false when project not owned by user
      deleteProject.mockResolvedValue(false);

      await DELETE({}, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: null, error: { code: "NOT_FOUND" } },
        { status: 404 }
      );
    });
  });

  describe("Error handling", () => {
    it("should return DELETE_FAILED when deleteProject throws", async () => {
      deleteProject.mockRejectedValue(new Error("Database error"));

      await DELETE({}, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: null, error: { code: "DELETE_FAILED" } },
        { status: 500 }
      );
    });
  });
});
