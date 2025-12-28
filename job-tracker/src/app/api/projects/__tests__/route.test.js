/**
 * Integration tests for /api/projects route
 * Tests { data, error } envelope, auth, and validation
 */

import { NextResponse } from "next/server";
import { GET, POST } from "../route.js";

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
  createProject: jest.fn(),
  listProjects: jest.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { createProject, listProjects } from "@/lib/server/db/projectsRepo";

describe("GET /api/projects", () => {
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
  });

  describe("Authentication", () => {
    it("should return UNAUTHORIZED when no user session", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await GET();

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: null, error: { code: "UNAUTHORIZED" } },
        { status: 401 }
      );
      expect(listProjects).not.toHaveBeenCalled();
    });

    it("should return UNAUTHORIZED when auth error occurs", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Auth failed" },
      });

      await GET();

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: null, error: { code: "UNAUTHORIZED" } },
        { status: 401 }
      );
      expect(listProjects).not.toHaveBeenCalled();
    });
  });

  describe("Success envelope", () => {
    it("should return { data, error: null } envelope on success", async () => {
      const mockProjects = [
        {
          id: "project-1",
          userId: "user-123",
          name: "Project 1",
          description: "Description 1",
          role: "Developer",
          techStack: "React, Node",
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
        },
      ];

      listProjects.mockResolvedValue(mockProjects);

      await GET();

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: mockProjects, error: null },
        { status: 200 }
      );
    });

    it("should return empty array when user has no projects", async () => {
      listProjects.mockResolvedValue([]);

      await GET();

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: [], error: null },
        { status: 200 }
      );
    });
  });

  describe("Error handling", () => {
    it("should return FETCH_FAILED when listProjects throws", async () => {
      listProjects.mockRejectedValue(new Error("Database error"));

      await GET();

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: null, error: { code: "FETCH_FAILED" } },
        { status: 500 }
      );
    });
  });
});

describe("POST /api/projects", () => {
  let mockRequest;
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
  });

  describe("Authentication", () => {
    it("should return UNAUTHORIZED when no user session", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          name: "Test Project",
        }),
      };

      await POST(mockRequest);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: null, error: { code: "UNAUTHORIZED" } },
        { status: 401 }
      );
      expect(createProject).not.toHaveBeenCalled();
    });
  });

  describe("Request body validation", () => {
    it("should return INVALID_JSON when request body is invalid JSON", async () => {
      mockRequest = {
        json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
      };

      await POST(mockRequest);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: null, error: { code: "INVALID_JSON" } },
        { status: 400 }
      );
      expect(createProject).not.toHaveBeenCalled();
    });

    it("should return VALIDATION_FAILED when name is missing", async () => {
      mockRequest = {
        json: jest.fn().mockResolvedValue({
          description: "Description without name",
        }),
      };

      await POST(mockRequest);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: null,
          error: expect.objectContaining({
            code: "VALIDATION_FAILED",
          }),
        }),
        { status: 400 }
      );
      expect(createProject).not.toHaveBeenCalled();
    });

    it("should return VALIDATION_FAILED when name is empty string", async () => {
      mockRequest = {
        json: jest.fn().mockResolvedValue({
          name: "",
        }),
      };

      await POST(mockRequest);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: null,
          error: expect.objectContaining({
            code: "VALIDATION_FAILED",
          }),
        }),
        { status: 400 }
      );
      expect(createProject).not.toHaveBeenCalled();
    });

    it("should return VALIDATION_FAILED when name is not a string", async () => {
      mockRequest = {
        json: jest.fn().mockResolvedValue({
          name: 12345,
        }),
      };

      await POST(mockRequest);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: null,
          error: expect.objectContaining({
            code: "VALIDATION_FAILED",
          }),
        }),
        { status: 400 }
      );
      expect(createProject).not.toHaveBeenCalled();
    });
  });

  describe("Success envelope", () => {
    it("should return { data, error: null } envelope on success with 201 status", async () => {
      const mockCreated = {
        id: "project-123",
        userId: "user-123",
        name: "New Project",
        description: "Test description",
        role: null,
        techStack: null,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      };

      createProject.mockResolvedValue(mockCreated);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          name: "New Project",
          description: "Test description",
        }),
      };

      await POST(mockRequest);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: mockCreated, error: null },
        { status: 201 }
      );
    });

    it("should accept minimal valid project (name only)", async () => {
      const mockCreated = {
        id: "project-123",
        userId: "user-123",
        name: "Minimal Project",
        description: null,
        role: null,
        techStack: null,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      };

      createProject.mockResolvedValue(mockCreated);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          name: "Minimal Project",
        }),
      };

      await POST(mockRequest);

      expect(createProject).toHaveBeenCalledWith({
        supabase: mockSupabase,
        userId: "user-123",
        values: { name: "Minimal Project" },
      });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: mockCreated, error: null },
        { status: 201 }
      );
    });

    it("should accept all optional fields", async () => {
      const mockCreated = {
        id: "project-123",
        userId: "user-123",
        name: "Full Project",
        description: "Full description",
        role: "Senior Developer",
        techStack: "React, Node.js, PostgreSQL",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      };

      createProject.mockResolvedValue(mockCreated);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          name: "Full Project",
          description: "Full description",
          role: "Senior Developer",
          techStack: "React, Node.js, PostgreSQL",
        }),
      };

      await POST(mockRequest);

      expect(createProject).toHaveBeenCalledWith({
        supabase: mockSupabase,
        userId: "user-123",
        values: {
          name: "Full Project",
          description: "Full description",
          role: "Senior Developer",
          techStack: "React, Node.js, PostgreSQL",
        },
      });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: mockCreated, error: null },
        { status: 201 }
      );
    });
  });

  describe("Error handling", () => {
    it("should return CREATE_FAILED when createProject throws", async () => {
      createProject.mockRejectedValue(new Error("Database error"));

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          name: "Test Project",
        }),
      };

      await POST(mockRequest);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: null, error: { code: "CREATE_FAILED" } },
        { status: 500 }
      );
    });
  });
});
