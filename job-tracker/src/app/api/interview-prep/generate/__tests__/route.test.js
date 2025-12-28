/**
 * Tests for POST /api/interview-prep/generate
 */

import { POST } from "../route";
import { createClient } from "@/lib/supabase/server";
import { getApplicationById } from "@/lib/server/db/applicationsRepo";
import { generateInterviewPrep } from "@/lib/server/ai/interviewPrepGenerate";

// Mock dependencies
jest.mock("@/lib/supabase/server");
jest.mock("@/lib/server/db/applicationsRepo");
jest.mock("@/lib/server/ai/interviewPrepGenerate");

describe("POST /api/interview-prep/generate", () => {
  let mockSupabase;
  let mockRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(),
            })),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
    };
    createClient.mockResolvedValue(mockSupabase);

    // Mock request
    mockRequest = {
      json: jest.fn(),
    };
  });

  describe("Authentication", () => {
    it("should return UNAUTHORIZED when no user session", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.error.code).toBe("UNAUTHORIZED");
    });

    it("should return UNAUTHORIZED when auth error", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Auth failed"),
      });

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Input Validation", () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });
    });

    it("should return INVALID_JSON when request body is not valid JSON", async () => {
      mockRequest.json.mockRejectedValue(new Error("Invalid JSON"));

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error.code).toBe("INVALID_JSON");
    });

    it("should return VALIDATION_FAILED for invalid applicationId", async () => {
      mockRequest.json.mockResolvedValue({
        applicationId: "not-a-uuid",
      });

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error.code).toBe("VALIDATION_FAILED");
    });

    it("should return VALIDATION_FAILED for company context exceeding max length", async () => {
      mockRequest.json.mockResolvedValue({
        applicationId: "123e4567-e89b-12d3-a456-426614174000",
        companyContextNotes: "x".repeat(10001),
      });

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error.code).toBe("VALIDATION_FAILED");
    });

    it("should accept valid request with applicationId only", async () => {
      const mockApp = {
        id: "app-123",
        company: "Test Corp",
        role: "Engineer",
        extractedRequirements: {
          responsibilities: ["Lead team"],
          requirements: ["5+ years"],
        },
      };

      mockRequest.json.mockResolvedValue({
        applicationId: "123e4567-e89b-12d3-a456-426614174000",
      });
      getApplicationById.mockResolvedValue(mockApp);
      generateInterviewPrep.mockResolvedValue({
        questions: [],
        keyThemes: [],
        companyResearchTips: [],
        questionsToAsk: [],
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(200);
    });

    it("should accept valid request with company context notes", async () => {
      const mockApp = {
        id: "app-123",
        company: "Test Corp",
        role: "Engineer",
        extractedRequirements: {
          responsibilities: ["Lead team"],
          requirements: ["5+ years"],
        },
      };

      mockRequest.json.mockResolvedValue({
        applicationId: "123e4567-e89b-12d3-a456-426614174000",
        companyContextNotes: "Fast-growing startup",
      });
      getApplicationById.mockResolvedValue(mockApp);
      generateInterviewPrep.mockResolvedValue({
        questions: [],
        keyThemes: [],
        companyResearchTips: [],
        questionsToAsk: [],
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(200);
    });
  });

  describe("Application Access", () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });
      mockRequest.json.mockResolvedValue({
        applicationId: "123e4567-e89b-12d3-a456-426614174000",
      });
    });

    it("should return NOT_FOUND when application does not exist", async () => {
      getApplicationById.mockResolvedValue(null);

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.error.code).toBe("NOT_FOUND");
    });

    it("should return NOT_FOUND when application is not owned by user", async () => {
      // getApplicationById enforces ownership via userId filter
      getApplicationById.mockResolvedValue(null);

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.error.code).toBe("NOT_FOUND");
    });
  });

  describe("Requirements Validation", () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });
      mockRequest.json.mockResolvedValue({
        applicationId: "123e4567-e89b-12d3-a456-426614174000",
      });
    });

    it("should return REQUIREMENTS_REQUIRED when extractedRequirements is null", async () => {
      getApplicationById.mockResolvedValue({
        id: "app-123",
        company: "Test Corp",
        role: "Engineer",
        extractedRequirements: null,
      });

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error.code).toBe("REQUIREMENTS_REQUIRED");
    });

    it("should return REQUIREMENTS_REQUIRED when both arrays are empty", async () => {
      getApplicationById.mockResolvedValue({
        id: "app-123",
        company: "Test Corp",
        role: "Engineer",
        extractedRequirements: {
          responsibilities: [],
          requirements: [],
        },
      });

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error.code).toBe("REQUIREMENTS_REQUIRED");
    });

    it("should accept application with only responsibilities", async () => {
      const mockApp = {
        id: "app-123",
        company: "Test Corp",
        role: "Engineer",
        extractedRequirements: {
          responsibilities: ["Lead team"],
          requirements: [],
        },
      };

      getApplicationById.mockResolvedValue(mockApp);
      generateInterviewPrep.mockResolvedValue({
        questions: [],
        keyThemes: [],
        companyResearchTips: [],
        questionsToAsk: [],
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(200);
    });

    it("should accept application with only requirements", async () => {
      const mockApp = {
        id: "app-123",
        company: "Test Corp",
        role: "Engineer",
        extractedRequirements: {
          responsibilities: [],
          requirements: ["5+ years"],
        },
      };

      getApplicationById.mockResolvedValue(mockApp);
      generateInterviewPrep.mockResolvedValue({
        questions: [],
        keyThemes: [],
        companyResearchTips: [],
        questionsToAsk: [],
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(200);
    });
  });

  describe("AI Generation", () => {
    const mockApp = {
      id: "app-123",
      company: "Test Corp",
      role: "Engineer",
      extractedRequirements: {
        responsibilities: ["Lead team", "Design systems"],
        requirements: ["5+ years", "TypeScript"],
        focusResponsibilities: ["Lead team"],
      },
    };

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });
      mockRequest.json.mockResolvedValue({
        applicationId: "123e4567-e89b-12d3-a456-426614174000",
        companyContextNotes: "Fast-growing startup",
      });
      getApplicationById.mockResolvedValue(mockApp);
    });

    it("should call generateInterviewPrep with correct parameters", async () => {
      const mockPack = {
        questions: [
          {
            question: "How do you lead teams?",
            category: "behavioral",
            talkingPoints: ["Point 1", "Point 2"],
            exampleAnswer: "Example",
          },
        ],
        keyThemes: ["Leadership"],
        companyResearchTips: ["Research tip"],
        questionsToAsk: ["What is the team structure?"],
        generatedAt: "2025-01-01T00:00:00.000Z",
        model: "gpt-4o-mini",
      };

      generateInterviewPrep.mockResolvedValue(mockPack);

      await POST(mockRequest);

      expect(generateInterviewPrep).toHaveBeenCalledWith({
        company: "Test Corp",
        role: "Engineer",
        responsibilities: ["Lead team", "Design systems"],
        requirements: ["5+ years", "TypeScript"],
        focusResponsibilities: ["Lead team"],
        companyContext: "Fast-growing startup",
      });
    });

    it("should return AI_NOT_CONFIGURED when AI is not configured", async () => {
      const error = new Error("AI not configured");
      error.code = "AI_NOT_CONFIGURED";
      generateInterviewPrep.mockRejectedValue(error);

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error.code).toBe("AI_NOT_CONFIGURED");
    });

    it("should return GENERATION_FAILED for other AI errors", async () => {
      const error = new Error("Request failed");
      error.code = "AI_REQUEST_FAILED";
      generateInterviewPrep.mockRejectedValue(error);

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error.code).toBe("GENERATION_FAILED");
    });

    it("should return generated pack on success", async () => {
      const mockPack = {
        questions: [
          {
            question: "How do you lead teams?",
            category: "behavioral",
            talkingPoints: ["Point 1", "Point 2"],
            exampleAnswer: "Example",
          },
        ],
        keyThemes: ["Leadership"],
        companyResearchTips: ["Research tip"],
        questionsToAsk: ["What is the team structure?"],
        generatedAt: "2025-01-01T00:00:00.000Z",
        model: "gpt-4o-mini",
      };

      generateInterviewPrep.mockResolvedValue(mockPack);

      // Mock successful update
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: { ...mockApp, interview_prep_pack: mockPack },
        error: null,
      });

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.pack).toEqual(mockPack);
      expect(result.data.applicationId).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(result.error).toBeNull();
    });
  });
});
