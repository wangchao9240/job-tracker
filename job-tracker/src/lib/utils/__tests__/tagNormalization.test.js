/**
 * Tests for tag normalization utilities
 */

import { normalizeTags, validateTag } from "../tagNormalization";

describe("tagNormalization", () => {
  describe("normalizeTags", () => {
    test("should trim and lowercase tags", () => {
      const input = ["  Frontend  ", "REACT", "JavaScript"];
      const expected = ["frontend", "react", "javascript"];

      const result = normalizeTags(input);
      expect(result).toEqual(expected);
    });

    test("should remove empty tags", () => {
      const input = ["valid", "  ", "", "another"];
      const expected = ["valid", "another"];

      const result = normalizeTags(input);
      expect(result).toEqual(expected);
    });

    test("should deduplicate tags", () => {
      const input = ["react", "React", "REACT", "nodejs"];
      const expected = ["react", "nodejs"];

      const result = normalizeTags(input);
      expect(result).toEqual(expected);
    });

    test("should drop tags exceeding 30 characters", () => {
      const longTag = "a".repeat(50);
      const input = [longTag, "short"];
      const expected = ["short"];

      const result = normalizeTags(input);
      expect(result).toEqual(expected);
    });

    test("should limit total tags to 20", () => {
      const input = Array.from({ length: 25 }, (_, i) => `tag${i}`);
      const result = normalizeTags(input);

      expect(result.length).toBe(20);
      expect(result).toContain("tag0");
      expect(result).toContain("tag19");
      expect(result).not.toContain("tag20");
    });

    test("should return null for empty array", () => {
      const result = normalizeTags([]);
      expect(result).toBeNull();
    });

    test("should return null for null input", () => {
      const result = normalizeTags(null);
      expect(result).toBeNull();
    });

    test("should return null for undefined input", () => {
      const result = normalizeTags(undefined);
      expect(result).toBeNull();
    });

    test("should skip non-string values", () => {
      const input = ["valid", 123, null, "another", undefined];
      const expected = ["valid", "another"];

      const result = normalizeTags(input);
      expect(result).toEqual(expected);
    });

    test("should handle tags with special characters", () => {
      const input = ["front-end", "node.js", "c++"];
      const expected = ["front-end", "node.js", "c++"];

      const result = normalizeTags(input);
      expect(result).toEqual(expected);
    });
  });

  describe("validateTag", () => {
    test("should validate a normal tag", () => {
      const result = validateTag("frontend");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test("should reject non-string values", () => {
      const result = validateTag(123);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Tag must be a string");
    });

    test("should reject empty string", () => {
      const result = validateTag("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Tag cannot be empty");
    });

    test("should reject whitespace-only string", () => {
      const result = validateTag("   ");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Tag cannot be empty");
    });

    test("should reject tags exceeding 30 characters", () => {
      const longTag = "a".repeat(31);
      const result = validateTag(longTag);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Tag cannot exceed 30 characters");
    });

    test("should accept tag exactly 30 characters", () => {
      const tag = "a".repeat(30);
      const result = validateTag(tag);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});
