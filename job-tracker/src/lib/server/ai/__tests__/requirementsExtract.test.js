/**
 * Tests for requirementsExtract.js
 * Server-only AI extraction helper
 */

import { extractRequirements } from "../requirementsExtract.js";

// Mock environment variables
const originalEnv = process.env;

describe("extractRequirements", () => {
  beforeEach(() => {
    // Reset environment before each test
    process.env = {
      ...originalEnv,
      JOB_OPENAI_BASE_URL: "https://api.openai.com/v1",
      JOB_OPENAI_API_KEY: "test-api-key",
      JOB_OPENAI_MODEL: undefined, // Default to gpt-4o-mini
    };

    // Clear all mocks
    global.fetch = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("input validation", () => {
    it("should reject null input", async () => {
      await expect(extractRequirements(null)).rejects.toThrow("JD text is required");
      await expect(extractRequirements(null)).rejects.toMatchObject({ code: "INVALID_INPUT" });
    });

    it("should reject undefined input", async () => {
      await expect(extractRequirements(undefined)).rejects.toThrow("JD text is required");
      await expect(extractRequirements(undefined)).rejects.toMatchObject({ code: "INVALID_INPUT" });
    });

    it("should reject empty string", async () => {
      await expect(extractRequirements("")).rejects.toThrow("JD text is required");
      await expect(extractRequirements("")).rejects.toMatchObject({ code: "INVALID_INPUT" });
    });

    it("should reject non-string input", async () => {
      await expect(extractRequirements(123)).rejects.toThrow("JD text is required");
      await expect(extractRequirements({})).rejects.toThrow("JD text is required");
      await expect(extractRequirements([])).rejects.toThrow("JD text is required");
    });
  });

  describe("configuration validation", () => {
    it("should reject missing JOB_OPENAI_API_KEY", async () => {
      delete process.env.JOB_OPENAI_API_KEY;

      await expect(extractRequirements("Sample JD text")).rejects.toThrow("AI provider not configured");
      await expect(extractRequirements("Sample JD text")).rejects.toMatchObject({ code: "AI_NOT_CONFIGURED" });
    });
  });

  describe("successful extraction", () => {
    it("should extract responsibilities and requirements from valid response", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                responsibilities: ["Lead development team", "Manage projects"],
                requirements: ["5+ years experience", "TypeScript proficiency"],
              }),
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await extractRequirements("Sample JD text");

      expect(result).toEqual({
        responsibilities: ["Lead development team", "Manage projects"],
        requirements: ["5+ years experience", "TypeScript proficiency"],
      });
    });

    it("should use custom model from JOB_OPENAI_MODEL env var", async () => {
      process.env.JOB_OPENAI_MODEL = "gpt-4-turbo";

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                responsibilities: ["Task 1"],
                requirements: ["Skill 1"],
              }),
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await extractRequirements("Sample JD text");

      const fetchCall = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.model).toBe("gpt-4-turbo");
    });

    it("should filter out non-string items from arrays", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                responsibilities: ["Valid task", null, 123, "", "  ", "Another valid task"],
                requirements: ["Valid skill", undefined, {}, "  ", "Another valid skill"],
              }),
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await extractRequirements("Sample JD text");

      expect(result.responsibilities).toEqual(["Valid task", "Another valid task"]);
      expect(result.requirements).toEqual(["Valid skill", "Another valid skill"]);
    });

    it("should limit responsibilities to 15 items maximum", async () => {
      const responsibilities = Array.from({ length: 20 }, (_, i) => `Task ${i + 1}`);
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                responsibilities,
                requirements: ["Skill 1"],
              }),
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await extractRequirements("Sample JD text");

      expect(result.responsibilities).toHaveLength(15);
      expect(result.responsibilities[0]).toBe("Task 1");
      expect(result.responsibilities[14]).toBe("Task 15");
    });

    it("should limit requirements to 15 items maximum", async () => {
      const requirements = Array.from({ length: 25 }, (_, i) => `Skill ${i + 1}`);
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                responsibilities: ["Task 1"],
                requirements,
              }),
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await extractRequirements("Sample JD text");

      expect(result.requirements).toHaveLength(15);
      expect(result.requirements[0]).toBe("Skill 1");
      expect(result.requirements[14]).toBe("Skill 15");
    });

    it("should trim whitespace from extracted items", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                responsibilities: ["  Lead team  ", "\tManage projects\n"],
                requirements: ["  5+ years  ", "\nTypeScript\t"],
              }),
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await extractRequirements("Sample JD text");

      expect(result.responsibilities).toEqual(["Lead team", "Manage projects"]);
      expect(result.requirements).toEqual(["5+ years", "TypeScript"]);
    });
  });

  describe("input truncation", () => {
    it("should truncate input longer than MAX_INPUT_LENGTH", async () => {
      const longText = "a".repeat(60000); // Exceeds 50k limit

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                responsibilities: ["Task 1"],
                requirements: ["Skill 1"],
              }),
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await extractRequirements(longText);

      const fetchCall = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      const userPrompt = requestBody.messages[1].content;

      expect(userPrompt.length).toBe(50000); // Truncated to MAX_INPUT_LENGTH
    });

    it("should not truncate input under MAX_INPUT_LENGTH", async () => {
      const normalText = "a".repeat(1000);

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                responsibilities: ["Task 1"],
                requirements: ["Skill 1"],
              }),
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await extractRequirements(normalText);

      const fetchCall = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      const userPrompt = requestBody.messages[1].content;

      expect(userPrompt.length).toBe(1000);
    });
  });

  describe("error handling", () => {
    it("should handle non-ok HTTP response", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(extractRequirements("Sample JD text")).rejects.toThrow("AI provider request failed");
      await expect(extractRequirements("Sample JD text")).rejects.toMatchObject({ code: "AI_REQUEST_FAILED" });
    });

    it("should handle missing content in response", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: {} }],
        }),
      });

      await expect(extractRequirements("Sample JD text")).rejects.toThrow("AI response missing content");
      await expect(extractRequirements("Sample JD text")).rejects.toMatchObject({ code: "AI_RESPONSE_INVALID" });
    });

    it("should handle invalid JSON in response content", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: "Not valid JSON",
              },
            },
          ],
        }),
      });

      await expect(extractRequirements("Sample JD text")).rejects.toThrow("Failed to parse AI response");
      await expect(extractRequirements("Sample JD text")).rejects.toMatchObject({ code: "AI_RESPONSE_PARSE_ERROR" });
    });

    it("should handle missing responsibilities array", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  requirements: ["Skill 1"],
                }),
              },
            },
          ],
        }),
      });

      await expect(extractRequirements("Sample JD text")).rejects.toThrow("AI response has invalid structure");
      await expect(extractRequirements("Sample JD text")).rejects.toMatchObject({ code: "AI_RESPONSE_INVALID" });
    });

    it("should handle missing requirements array", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  responsibilities: ["Task 1"],
                }),
              },
            },
          ],
        }),
      });

      await expect(extractRequirements("Sample JD text")).rejects.toThrow("AI response has invalid structure");
      await expect(extractRequirements("Sample JD text")).rejects.toMatchObject({ code: "AI_RESPONSE_INVALID" });
    });

    it("should handle responsibilities not being an array", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  responsibilities: "Not an array",
                  requirements: ["Skill 1"],
                }),
              },
            },
          ],
        }),
      });

      await expect(extractRequirements("Sample JD text")).rejects.toThrow("AI response has invalid structure");
      await expect(extractRequirements("Sample JD text")).rejects.toMatchObject({ code: "AI_RESPONSE_INVALID" });
    });

    it("should handle timeout/abort", async () => {
      global.fetch = jest.fn().mockRejectedValue(new DOMException("Aborted", "AbortError"));

      await expect(extractRequirements("Sample JD text")).rejects.toThrow("AI request timed out");
      await expect(extractRequirements("Sample JD text")).rejects.toMatchObject({ code: "AI_TIMEOUT" });
    });

    it("should handle network errors", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

      await expect(extractRequirements("Sample JD text")).rejects.toThrow("AI extraction failed");
      await expect(extractRequirements("Sample JD text")).rejects.toMatchObject({ code: "AI_ERROR" });
    });
  });

  describe("API request format", () => {
    it("should send correct request format", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                responsibilities: ["Task 1"],
                requirements: ["Skill 1"],
              }),
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await extractRequirements("Sample JD text");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/chat/completions",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-api-key",
          },
          signal: expect.any(AbortSignal),
        })
      );

      const fetchCall = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody).toMatchObject({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: expect.stringContaining("Extract two distinct lists") },
          { role: "user", content: "Sample JD text" },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      });
    });
  });
});
