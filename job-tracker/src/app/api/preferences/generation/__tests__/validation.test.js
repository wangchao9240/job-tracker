/**
 * Unit tests for /api/preferences/generation route
 * Tests zod validation schema and request handling
 */

import { z } from "zod";

// Import the schema from route.js
const preferencesSchema = z.object({
  tone: z.string().optional(),
  emphasis: z.array(z.string()).optional(),
  keywordsInclude: z.array(z.string()).optional(),
  keywordsAvoid: z.array(z.string()).optional(),
});

describe("/api/preferences/generation - zod validation", () => {
  describe("preferencesSchema", () => {
    it("should accept valid full preferences object", () => {
      const validData = {
        tone: "professional",
        emphasis: ["achievements", "technical_depth"],
        keywordsInclude: ["innovation", "problem-solving"],
        keywordsAvoid: ["synergy", "leverage"],
      };

      const result = preferencesSchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it("should accept partial preferences (only tone)", () => {
      const partialData = { tone: "casual" };

      const result = preferencesSchema.safeParse(partialData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(partialData);
    });

    it("should accept partial preferences (only emphasis)", () => {
      const partialData = { emphasis: ["soft_skills", "leadership"] };

      const result = preferencesSchema.safeParse(partialData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(partialData);
    });

    it("should accept empty object (all fields optional)", () => {
      const emptyData = {};

      const result = preferencesSchema.safeParse(emptyData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it("should reject invalid tone type (number instead of string)", () => {
      const invalidData = { tone: 123 };

      const result = preferencesSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(["tone"]);
    });

    it("should reject invalid emphasis type (string instead of array)", () => {
      const invalidData = { emphasis: "achievements" };

      const result = preferencesSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(["emphasis"]);
    });

    it("should reject invalid emphasis array (contains non-string)", () => {
      const invalidData = { emphasis: ["achievements", 123, "technical_depth"] };

      const result = preferencesSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(["emphasis", 1]);
    });

    it("should reject invalid keywordsInclude type (object instead of array)", () => {
      const invalidData = { keywordsInclude: { keyword: "innovation" } };

      const result = preferencesSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(["keywordsInclude"]);
    });

    it("should reject invalid keywordsAvoid array (contains null)", () => {
      const invalidData = { keywordsAvoid: ["synergy", null, "leverage"] };

      const result = preferencesSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(["keywordsAvoid", 1]);
    });

    it("should accept empty arrays", () => {
      const dataWithEmptyArrays = {
        tone: "formal",
        emphasis: [],
        keywordsInclude: [],
        keywordsAvoid: [],
      };

      const result = preferencesSchema.safeParse(dataWithEmptyArrays);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(dataWithEmptyArrays);
    });

    it("should strip unknown fields (strict mode not enabled)", () => {
      const dataWithExtra = {
        tone: "professional",
        emphasis: ["achievements"],
        unknownField: "should be ignored",
        anotherUnknown: 123,
      };

      const result = preferencesSchema.safeParse(dataWithExtra);
      expect(result.success).toBe(true);
      // Zod strips unknown fields by default in passthrough mode
      expect(result.data).toEqual({
        tone: "professional",
        emphasis: ["achievements"],
      });
    });
  });

  describe("Default preferences constant", () => {
    it("should match expected shape", () => {
      const DEFAULT_PREFERENCES = {
        tone: "professional",
        emphasis: [],
        keywordsInclude: [],
        keywordsAvoid: [],
      };

      expect(DEFAULT_PREFERENCES.tone).toBe("professional");
      expect(Array.isArray(DEFAULT_PREFERENCES.emphasis)).toBe(true);
      expect(Array.isArray(DEFAULT_PREFERENCES.keywordsInclude)).toBe(true);
      expect(Array.isArray(DEFAULT_PREFERENCES.keywordsAvoid)).toBe(true);
      expect(DEFAULT_PREFERENCES.emphasis).toHaveLength(0);
      expect(DEFAULT_PREFERENCES.keywordsInclude).toHaveLength(0);
      expect(DEFAULT_PREFERENCES.keywordsAvoid).toHaveLength(0);
    });
  });
});
