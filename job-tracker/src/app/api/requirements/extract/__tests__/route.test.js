/**
 * Tests for POST /api/requirements/extract
 */

import { POST } from "../route.js";
import { createClient } from "@/lib/supabase/server";
import { getApplicationById, updateApplication } from "@/lib/server/db/applicationsRepo";
import { extractRequirements } from "@/lib/server/ai/requirementsExtract";

// Mock dependencies
jest.mock("@/lib/supabase/server");
jest.mock("@/lib/server/db/applicationsRepo");
jest.mock("@/lib/server/ai/requirementsExtract");

describe("POST /api/requirements/extract", () => {
  let mockSupabase;
  let mockRequest;

  beforeEach(() => {
    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
    };
    createClient.mockResolvedValue(mockSupabase);

    // Setup mock request
    mockRequest = {
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe("authentication", () => {
    it("should return 401 UNAUTHORIZED when no user session", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      mockRequest.json.mockResolvedValue({ applicationId: "test-id" });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        data: null,
        error: { code: "UNAUTHORIZED" },
      });
    });

    it("should return 401 UNAUTHORIZED when auth error", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Auth failed"),
      });

      mockRequest.json.mockResolvedValue({ applicationId: "test-id" });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        data: null,
        error: { code: "UNAUTHORIZED" },
      });
    });
  });

  describe("request validation", () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });
    });

    it("should return 400 INVALID_JSON when request body is not JSON", async () => {
      mockRequest.json.mockRejectedValue(new Error("Invalid JSON"));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        data: null,
        error: { code: "INVALID_JSON" },
      });
    });

    it("should return 400 VALIDATION_FAILED when applicationId is missing", async () => {
      mockRequest.json.mockResolvedValue({});

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("VALIDATION_FAILED");
      expect(data.data).toBeNull();
    });

    it("should return 400 VALIDATION_FAILED when applicationId is not a valid UUID", async () => {
      mockRequest.json.mockResolvedValue({ applicationId: "not-a-uuid" });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("VALIDATION_FAILED");
      expect(data.data).toBeNull();
    });
  });

  describe("application lookup", () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });
    });

    it("should return 404 NOT_FOUND when application does not exist", async () => {
      mockRequest.json.mockResolvedValue({
        applicationId: "00000000-0000-0000-0000-000000000001",
      });

      getApplicationById.mockResolvedValue(null);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({
        data: null,
        error: { code: "NOT_FOUND" },
      });
    });

    it("should return 404 NOT_FOUND when application belongs to different user (RLS)", async () => {
      mockRequest.json.mockResolvedValue({
        applicationId: "00000000-0000-0000-0000-000000000001",
      });

      // RLS blocks the query, returns null
      getApplicationById.mockResolvedValue(null);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({
        data: null,
        error: { code: "NOT_FOUND" },
      });
    });
  });

  describe("JD snapshot validation", () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });
    });

    it("should return 400 JD_SNAPSHOT_REQUIRED when jdSnapshot is missing", async () => {
      mockRequest.json.mockResolvedValue({
        applicationId: "00000000-0000-0000-0000-000000000001",
      });

      getApplicationById.mockResolvedValue({
        id: "00000000-0000-0000-0000-000000000001",
        company: "Test Co",
        role: "Engineer",
        jdSnapshot: null,
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        data: null,
        error: { code: "JD_SNAPSHOT_REQUIRED" },
      });
    });

    it("should return 400 JD_SNAPSHOT_REQUIRED when jdSnapshot is empty string", async () => {
      mockRequest.json.mockResolvedValue({
        applicationId: "00000000-0000-0000-0000-000000000001",
      });

      getApplicationById.mockResolvedValue({
        id: "00000000-0000-0000-0000-000000000001",
        company: "Test Co",
        role: "Engineer",
        jdSnapshot: "",
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        data: null,
        error: { code: "JD_SNAPSHOT_REQUIRED" },
      });
    });

    it("should return 400 JD_SNAPSHOT_REQUIRED when jdSnapshot is only whitespace", async () => {
      mockRequest.json.mockResolvedValue({
        applicationId: "00000000-0000-0000-0000-000000000001",
      });

      getApplicationById.mockResolvedValue({
        id: "00000000-0000-0000-0000-000000000001",
        company: "Test Co",
        role: "Engineer",
        jdSnapshot: "   \n\t  ",
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        data: null,
        error: { code: "JD_SNAPSHOT_REQUIRED" },
      });
    });
  });

  describe("successful extraction", () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });
    });

    it("should return 200 with extracted data on success", async () => {
      const applicationId = "00000000-0000-0000-0000-000000000001";

      mockRequest.json.mockResolvedValue({ applicationId });

      getApplicationById.mockResolvedValue({
        id: applicationId,
        company: "Test Co",
        role: "Engineer",
        jdSnapshot: "Sample job description text",
      });

      extractRequirements.mockResolvedValue({
        responsibilities: ["Lead development", "Manage projects"],
        requirements: ["5+ years experience", "TypeScript"],
      });

      updateApplication.mockResolvedValue({
        id: applicationId,
        company: "Test Co",
        role: "Engineer",
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.error).toBeNull();
      expect(data.data).toMatchObject({
        applicationId,
        responsibilities: ["Lead development", "Manage projects"],
        requirements: ["5+ years experience", "TypeScript"],
        extractedAt: expect.any(String),
      });
    });

    it("should persist extracted data to application", async () => {
      const applicationId = "00000000-0000-0000-0000-000000000001";

      mockRequest.json.mockResolvedValue({ applicationId });

      getApplicationById.mockResolvedValue({
        id: applicationId,
        company: "Test Co",
        role: "Engineer",
        jdSnapshot: "Sample job description text",
      });

      extractRequirements.mockResolvedValue({
        responsibilities: ["Task 1"],
        requirements: ["Skill 1"],
      });

      updateApplication.mockResolvedValue({
        id: applicationId,
        company: "Test Co",
        role: "Engineer",
      });

      await POST(mockRequest);

      expect(updateApplication).toHaveBeenCalledWith({
        supabase: mockSupabase,
        userId: "user-123",
        id: applicationId,
        patch: {
          extractedRequirements: {
            responsibilities: ["Task 1"],
            requirements: ["Skill 1"],
            extractedAt: expect.any(String),
          },
        },
      });
    });

    it("should use ISO-8601 format for extractedAt timestamp", async () => {
      const applicationId = "00000000-0000-0000-0000-000000000001";

      mockRequest.json.mockResolvedValue({ applicationId });

      getApplicationById.mockResolvedValue({
        id: applicationId,
        jdSnapshot: "Sample job description text",
      });

      extractRequirements.mockResolvedValue({
        responsibilities: ["Task 1"],
        requirements: ["Skill 1"],
      });

      updateApplication.mockResolvedValue({ id: applicationId });

      const response = await POST(mockRequest);
      const data = await response.json();

      // ISO-8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
      expect(data.data.extractedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe("AI extraction errors", () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      getApplicationById.mockResolvedValue({
        id: "00000000-0000-0000-0000-000000000001",
        jdSnapshot: "Sample job description text",
      });
    });

    it("should return 500 AI_NOT_CONFIGURED when AI is not configured", async () => {
      mockRequest.json.mockResolvedValue({
        applicationId: "00000000-0000-0000-0000-000000000001",
      });

      const error = new Error("AI provider not configured");
      error.code = "AI_NOT_CONFIGURED";
      extractRequirements.mockRejectedValue(error);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        data: null,
        error: {
          code: "AI_NOT_CONFIGURED",
          message: "AI extraction is not configured",
        },
      });
    });

    it("should return 500 EXTRACTION_FAILED for generic AI errors", async () => {
      mockRequest.json.mockResolvedValue({
        applicationId: "00000000-0000-0000-0000-000000000001",
      });

      const error = new Error("AI timeout");
      error.code = "AI_TIMEOUT";
      extractRequirements.mockRejectedValue(error);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe("EXTRACTION_FAILED");
      expect(data.error.message).toContain("Failed to extract requirements");
      expect(data.data).toBeNull();
    });

    it("should not persist data when AI extraction fails", async () => {
      mockRequest.json.mockResolvedValue({
        applicationId: "00000000-0000-0000-0000-000000000001",
      });

      extractRequirements.mockRejectedValue(new Error("AI failed"));

      await POST(mockRequest);

      expect(updateApplication).not.toHaveBeenCalled();
    });
  });

  describe("update errors", () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      getApplicationById.mockResolvedValue({
        id: "00000000-0000-0000-0000-000000000001",
        jdSnapshot: "Sample job description text",
      });

      extractRequirements.mockResolvedValue({
        responsibilities: ["Task 1"],
        requirements: ["Skill 1"],
      });
    });

    it("should return 500 UPDATE_FAILED when update returns null", async () => {
      mockRequest.json.mockResolvedValue({
        applicationId: "00000000-0000-0000-0000-000000000001",
      });

      updateApplication.mockResolvedValue(null);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        data: null,
        error: { code: "UPDATE_FAILED" },
      });
    });
  });

  describe("error envelope consistency", () => {
    it("should always use { data, error } envelope format", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      mockRequest.json.mockResolvedValue({
        applicationId: "00000000-0000-0000-0000-000000000001",
      });

      getApplicationById.mockResolvedValue({
        id: "00000000-0000-0000-0000-000000000001",
        jdSnapshot: "Sample job description text",
      });

      extractRequirements.mockResolvedValue({
        responsibilities: ["Task 1"],
        requirements: ["Skill 1"],
      });

      updateApplication.mockResolvedValue({
        id: "00000000-0000-0000-0000-000000000001",
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(data).toHaveProperty("data");
      expect(data).toHaveProperty("error");
      expect(data.error).toBeNull();
      expect(data.data).not.toBeNull();
    });

    it("should return SERVER_ERROR with envelope on unexpected errors", async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error("Unexpected error"));

      mockRequest.json.mockResolvedValue({
        applicationId: "00000000-0000-0000-0000-000000000001",
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        data: null,
        error: { code: "SERVER_ERROR" },
      });
    });
  });
});
