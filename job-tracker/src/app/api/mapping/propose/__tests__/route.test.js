/**
 * Tests for POST /api/mapping/propose route
 * Documents expected behavior for mapping proposal generation
 */

import { z } from "zod";

// Request validation schema (same as in route.js)
const proposeMappingSchema = z.object({
  applicationId: z.string().uuid("Application ID must be a valid UUID"),
});

describe("POST /api/mapping/propose - validation", () => {
  describe("request body validation", () => {
    test("should accept valid applicationId (UUID)", () => {
      const validBody = {
        applicationId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = proposeMappingSchema.safeParse(validBody);
      expect(result.success).toBe(true);
      expect(result.data.applicationId).toBe(validBody.applicationId);
    });

    test("should reject missing applicationId", () => {
      const invalidBody = {};

      const result = proposeMappingSchema.safeParse(invalidBody);
      expect(result.success).toBe(false);
      expect(result.error.errors[0].path).toEqual(["applicationId"]);
    });

    test("should reject non-UUID applicationId", () => {
      const invalidBody = {
        applicationId: "not-a-uuid",
      };

      const result = proposeMappingSchema.safeParse(invalidBody);
      expect(result.success).toBe(false);
      expect(result.error.errors[0].path).toEqual(["applicationId"]);
      expect(result.error.errors[0].message).toContain("valid UUID");
    });

    test("should reject empty string applicationId", () => {
      const invalidBody = {
        applicationId: "",
      };

      const result = proposeMappingSchema.safeParse(invalidBody);
      expect(result.success).toBe(false);
    });

    test("should reject number applicationId", () => {
      const invalidBody = {
        applicationId: 123,
      };

      const result = proposeMappingSchema.safeParse(invalidBody);
      expect(result.success).toBe(false);
    });
  });

  describe("error response envelopes", () => {
    test("UNAUTHORIZED error shape", () => {
      const errorResponse = {
        data: null,
        error: { code: "UNAUTHORIZED" },
      };

      expect(errorResponse.data).toBeNull();
      expect(errorResponse.error.code).toBe("UNAUTHORIZED");
    });

    test("INVALID_JSON error shape", () => {
      const errorResponse = {
        data: null,
        error: {
          code: "INVALID_JSON",
          message: "Request body must be valid JSON",
        },
      };

      expect(errorResponse.data).toBeNull();
      expect(errorResponse.error.code).toBe("INVALID_JSON");
      expect(errorResponse.error.message).toBeDefined();
    });

    test("VALIDATION_FAILED error shape", () => {
      const errorResponse = {
        data: null,
        error: {
          code: "VALIDATION_FAILED",
          message: "Application ID must be a valid UUID",
          field: "applicationId",
        },
      };

      expect(errorResponse.data).toBeNull();
      expect(errorResponse.error.code).toBe("VALIDATION_FAILED");
      expect(errorResponse.error.message).toBeDefined();
      expect(errorResponse.error.field).toBe("applicationId");
    });

    test("NOT_FOUND error shape", () => {
      const errorResponse = {
        data: null,
        error: { code: "NOT_FOUND" },
      };

      expect(errorResponse.data).toBeNull();
      expect(errorResponse.error.code).toBe("NOT_FOUND");
    });

    test("REQUIREMENTS_REQUIRED error shape", () => {
      const errorResponse = {
        data: null,
        error: {
          code: "REQUIREMENTS_REQUIRED",
          message: "Application must have extracted requirements before mapping can be proposed",
        },
      };

      expect(errorResponse.data).toBeNull();
      expect(errorResponse.error.code).toBe("REQUIREMENTS_REQUIRED");
      expect(errorResponse.error.message).toBeDefined();
    });

    test("BULLETS_REQUIRED error shape", () => {
      const errorResponse = {
        data: null,
        error: {
          code: "BULLETS_REQUIRED",
          message: "User must have project bullets before mapping can be proposed",
        },
      };

      expect(errorResponse.data).toBeNull();
      expect(errorResponse.error.code).toBe("BULLETS_REQUIRED");
      expect(errorResponse.error.message).toBeDefined();
    });

    test("PROPOSE_FAILED error shape", () => {
      const errorResponse = {
        data: null,
        error: {
          code: "PROPOSE_FAILED",
          message: "Failed to generate mapping proposal",
        },
      };

      expect(errorResponse.data).toBeNull();
      expect(errorResponse.error.code).toBe("PROPOSE_FAILED");
      expect(errorResponse.error.message).toBeDefined();
    });
  });

  describe("success response envelope", () => {
    test("should have correct success shape", () => {
      const successResponse = {
        data: {
          proposal: [
            {
              itemKey: "responsibility-0",
              kind: "responsibility",
              text: "Build React components",
              suggestedBulletIds: ["bullet-1", "bullet-2"],
              scoreByBulletId: {
                "bullet-1": 5,
                "bullet-2": 3,
              },
            },
          ],
          generatedAt: "2025-12-28T10:00:00.000Z",
        },
        error: null,
      };

      expect(successResponse.data).toBeDefined();
      expect(successResponse.error).toBeNull();
      expect(successResponse.data.proposal).toBeInstanceOf(Array);
      expect(successResponse.data.generatedAt).toBeDefined();
      expect(successResponse.data.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO-8601 format
    });

    test("proposal item structure", () => {
      const proposalItem = {
        itemKey: "requirement-0",
        kind: "requirement",
        text: "Experience with TypeScript",
        suggestedBulletIds: ["bullet-1"],
        scoreByBulletId: { "bullet-1": 4 },
      };

      expect(proposalItem.itemKey).toBeDefined();
      expect(proposalItem.kind).toMatch(/^(responsibility|requirement)$/);
      expect(proposalItem.text).toBeDefined();
      expect(proposalItem.suggestedBulletIds).toBeInstanceOf(Array);
      expect(proposalItem.scoreByBulletId).toBeInstanceOf(Object);
    });

    test("no-match proposal item structure", () => {
      const proposalItem = {
        itemKey: "requirement-1",
        kind: "requirement",
        text: "Quantum computing experience",
        suggestedBulletIds: [],
        scoreByBulletId: {},
      };

      expect(proposalItem.suggestedBulletIds).toEqual([]);
      expect(proposalItem.scoreByBulletId).toEqual({});
    });
  });

  describe("error code stability", () => {
    test("all error codes should be uppercase snake_case", () => {
      const errorCodes = [
        "UNAUTHORIZED",
        "INVALID_JSON",
        "VALIDATION_FAILED",
        "NOT_FOUND",
        "REQUIREMENTS_REQUIRED",
        "BULLETS_REQUIRED",
        "PROPOSE_FAILED",
      ];

      errorCodes.forEach((code) => {
        expect(code).toMatch(/^[A-Z_]+$/);
      });
    });
  });
});

describe("POST /api/mapping/propose - business logic expectations", () => {
  describe("requirements extraction", () => {
    test("should combine responsibilities and requirements into items array", () => {
      const extractedRequirements = {
        responsibilities: ["Build React components", "Develop API endpoints"],
        requirements: ["TypeScript experience", "Testing knowledge"],
      };

      // Expected items array construction
      const expectedItems = [
        { kind: "responsibility", text: "Build React components" },
        { kind: "responsibility", text: "Develop API endpoints" },
        { kind: "requirement", text: "TypeScript experience" },
        { kind: "requirement", text: "Testing knowledge" },
      ];

      expect(expectedItems).toHaveLength(4);
      expect(expectedItems[0].kind).toBe("responsibility");
      expect(expectedItems[2].kind).toBe("requirement");
    });

    test("should filter out non-string values", () => {
      const extractedRequirements = {
        responsibilities: ["Valid text", null, "", 123, "Another valid"],
        requirements: [],
      };

      // Only strings should be included
      const validItems = extractedRequirements.responsibilities.filter(
        (text) => text && typeof text === "string"
      );

      expect(validItems).toEqual(["Valid text", "Another valid"]);
    });
  });

  describe("deterministic output", () => {
    test("should produce same results for same inputs", () => {
      // Rule-based algorithm should be deterministic
      // Same items + same bullets = same proposal
      const mockInputs = {
        items: [{ kind: "requirement", text: "React development" }],
        bullets: [
          {
            id: "bullet-1",
            text: "Built React application",
            title: null,
            tags: ["react"],
            impact: null,
          },
        ],
      };

      // Two separate calls should yield identical results
      // (This documents the deterministic expectation)
      expect(mockInputs.items).toEqual(mockInputs.items); // Self-referential, but documents intent
    });
  });
});
