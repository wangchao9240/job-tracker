/**
 * Unit tests for source detection
 * Tests URL parsing, source detection logic, and edge cases
 */

import { detectSource, validateUrl, JOB_SOURCES } from "../sourceDetect";

describe("sourceDetect", () => {
  describe("JOB_SOURCES constant", () => {
    it("should contain expected source types", () => {
      expect(JOB_SOURCES).toEqual(["seek", "linkedin", "company", "unknown"]);
    });
  });

  describe("detectSource", () => {
    describe("seek detection", () => {
      it("should detect seek.com.au URLs", () => {
        expect(detectSource("https://www.seek.com.au/job/123456")).toBe("seek");
      });

      it("should detect seek.com URLs", () => {
        expect(detectSource("https://www.seek.com/jobs/test")).toBe("seek");
      });

      it("should detect seek URLs without protocol", () => {
        expect(detectSource("www.seek.com.au/job/123")).toBe("seek");
      });

      it("should detect seek URLs case-insensitively", () => {
        expect(detectSource("https://WWW.SEEK.COM.AU/job/123")).toBe("seek");
      });
    });

    describe("linkedin detection", () => {
      it("should detect linkedin.com/jobs URLs", () => {
        expect(detectSource("https://www.linkedin.com/jobs/view/123456")).toBe("linkedin");
      });

      it("should detect linkedin jobs URLs without protocol", () => {
        expect(detectSource("linkedin.com/jobs/view/789")).toBe("linkedin");
      });

      it("should NOT detect linkedin URLs without /jobs path", () => {
        // LinkedIn profile URLs should be "company" not "linkedin"
        expect(detectSource("https://www.linkedin.com/in/johndoe")).toBe("company");
      });

      it("should detect linkedin URLs case-insensitively", () => {
        expect(detectSource("https://LINKEDIN.COM/JOBS/view/123")).toBe("linkedin");
      });
    });

    describe("company detection", () => {
      it("should detect company career page URLs", () => {
        expect(detectSource("https://careers.google.com/jobs/results")).toBe("company");
      });

      it("should detect any valid URL not matching known sources", () => {
        expect(detectSource("https://example.com/careers")).toBe("company");
      });

      it("should detect URLs without protocol as company", () => {
        expect(detectSource("careers.apple.com/us/")).toBe("company");
      });
    });

    describe("unknown detection", () => {
      it("should return unknown for null", () => {
        expect(detectSource(null)).toBe("unknown");
      });

      it("should return unknown for undefined", () => {
        expect(detectSource(undefined)).toBe("unknown");
      });

      it("should return unknown for empty string", () => {
        expect(detectSource("")).toBe("unknown");
      });

      it("should return unknown for non-string input", () => {
        expect(detectSource(123)).toBe("unknown");
        expect(detectSource({})).toBe("unknown");
        expect(detectSource([])).toBe("unknown");
      });

      it("should return unknown for malformed URLs", () => {
        expect(detectSource("not a url")).toBe("unknown");
        expect(detectSource("ht!tp://invalid")).toBe("unknown");
      });

      it("should return unknown for URLs with no hostname", () => {
        expect(detectSource("http://")).toBe("unknown");
      });
    });

    describe("edge cases", () => {
      it("should handle URLs with query parameters", () => {
        expect(detectSource("https://www.seek.com.au/job/123?source=email")).toBe("seek");
      });

      it("should handle URLs with fragments", () => {
        expect(detectSource("https://linkedin.com/jobs/view/123#apply")).toBe("linkedin");
      });

      it("should handle URLs with ports", () => {
        expect(detectSource("https://careers.example.com:8080/jobs")).toBe("company");
      });

      it("should handle international seek domains", () => {
        expect(detectSource("https://www.seek.co.nz/job/123")).toBe("seek");
      });

      it("should handle whitespace in URLs", () => {
        expect(detectSource("  https://www.seek.com.au/job/123  ")).toBe("unknown");
      });
    });
  });

  describe("validateUrl", () => {
    describe("valid URLs", () => {
      it("should validate and normalize URL with protocol", () => {
        const result = validateUrl("https://www.example.com");
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe("https://www.example.com/");
        expect(result.error).toBe(null);
      });

      it("should add protocol to URL without protocol", () => {
        const result = validateUrl("www.example.com");
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe("https://www.example.com/");
        expect(result.error).toBe(null);
      });

      it("should trim whitespace", () => {
        const result = validateUrl("  https://example.com  ");
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe("https://example.com/");
      });

      it("should preserve path and query", () => {
        const result = validateUrl("https://example.com/path?query=1");
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe("https://example.com/path?query=1");
      });
    });

    describe("invalid URLs", () => {
      it("should reject null", () => {
        const result = validateUrl(null);
        expect(result.valid).toBe(false);
        expect(result.normalized).toBe(null);
        expect(result.error).toBe("URL is required");
      });

      it("should reject undefined", () => {
        const result = validateUrl(undefined);
        expect(result.valid).toBe(false);
        expect(result.normalized).toBe(null);
        expect(result.error).toBe("URL is required");
      });

      it("should reject empty string", () => {
        const result = validateUrl("");
        expect(result.valid).toBe(false);
        expect(result.error).toBe("URL is required");
      });

      it("should reject whitespace-only string", () => {
        const result = validateUrl("   ");
        expect(result.valid).toBe(false);
        expect(result.error).toBe("URL is required");
      });

      it("should reject non-string input", () => {
        const result = validateUrl(123);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("URL is required");
      });

      it("should reject malformed URLs", () => {
        const result = validateUrl("not a url at all");
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Invalid URL format");
      });

      it("should reject URLs with no hostname", () => {
        const result = validateUrl("http://");
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Invalid URL");
      });
    });
  });
});
