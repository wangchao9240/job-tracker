/**
 * Unit tests for normalizeUrl, normalizeCompany, and normalizeRole
 * Tests URL canonicalization for duplicate detection with edge cases
 */

import { normalizeUrl, normalizeCompany, normalizeRole } from "../normalizeUrl";

describe("normalizeUrl", () => {
  describe("valid URLs", () => {
    it("should normalize a basic URL with https protocol", () => {
      expect(normalizeUrl("https://example.com/job")).toBe("https://example.com/job");
    });

    it("should add https protocol if missing", () => {
      expect(normalizeUrl("example.com/job")).toBe("https://example.com/job");
    });

    it("should normalize http to https for consistency", () => {
      expect(normalizeUrl("http://example.com/job")).toBe("https://example.com/job");
    });

    it("should lowercase the hostname", () => {
      expect(normalizeUrl("https://Example.COM/job")).toBe("https://example.com/job");
    });

    it("should remove trailing slash from pathname", () => {
      expect(normalizeUrl("https://example.com/job/")).toBe("https://example.com/job");
    });

    it("should keep trailing slash for root path", () => {
      expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
    });

    it("should remove fragment (#...)", () => {
      expect(normalizeUrl("https://example.com/job#section")).toBe("https://example.com/job");
    });

    it("should keep query parameters", () => {
      expect(normalizeUrl("https://example.com/job?id=123")).toBe(
        "https://example.com/job?id=123"
      );
    });

    it("should sort query parameters alphabetically", () => {
      expect(normalizeUrl("https://example.com/job?source=email&id=123")).toBe(
        "https://example.com/job?id=123&source=email"
      );
    });

    it("should handle multiple query parameters with special characters", () => {
      expect(normalizeUrl("https://example.com/job?q=senior+engineer&location=sydney")).toBe(
        "https://example.com/job?location=sydney&q=senior+engineer"
      );
    });

    it("should preserve non-standard ports", () => {
      expect(normalizeUrl("https://example.com:8080/job")).toBe(
        "https://example.com:8080/job"
      );
    });

    it("should remove www subdomain for consistency", () => {
      expect(normalizeUrl("https://www.example.com/job")).toBe("https://example.com/job");
    });

    it("should handle complex real-world URLs (Seek)", () => {
      expect(normalizeUrl("https://www.seek.com.au/job/12345?type=promoted")).toBe(
        "https://seek.com.au/job/12345?type=promoted"
      );
    });

    it("should handle complex real-world URLs (LinkedIn)", () => {
      expect(normalizeUrl("https://www.linkedin.com/jobs/view/3456789/?refId=abc")).toBe(
        "https://linkedin.com/jobs/view/3456789?refId=abc"
      );
    });
  });

  describe("edge cases and invalid inputs", () => {
    it("should return null for empty string", () => {
      expect(normalizeUrl("")).toBeNull();
    });

    it("should return null for whitespace-only string", () => {
      expect(normalizeUrl("   ")).toBeNull();
    });

    it("should return null for null input", () => {
      expect(normalizeUrl(null)).toBeNull();
    });

    it("should return null for undefined input", () => {
      expect(normalizeUrl(undefined)).toBeNull();
    });

    it("should return null for non-string input", () => {
      expect(normalizeUrl(12345)).toBeNull();
    });

    it("should return null for invalid URL (no hostname)", () => {
      expect(normalizeUrl("http://")).toBeNull();
    });

    it("should return null for completely malformed URL", () => {
      expect(normalizeUrl("not a url at all")).toBeNull();
    });

    it("should handle URLs with whitespace (trim)", () => {
      expect(normalizeUrl("  https://example.com/job  ")).toBe("https://example.com/job");
    });

    it("should handle URLs with multiple slashes in path", () => {
      expect(normalizeUrl("https://example.com//job//listing/")).toBe(
        "https://example.com//job//listing"
      );
    });

    it("should handle URLs with encoded characters", () => {
      expect(normalizeUrl("https://example.com/job%20listing")).toBe(
        "https://example.com/job%20listing"
      );
    });
  });

  describe("duplicate detection scenarios", () => {
    it("should treat http and https as same URL", () => {
      const url1 = normalizeUrl("http://example.com/job");
      const url2 = normalizeUrl("https://example.com/job");
      expect(url1).toBe(url2);
    });

    it("should treat URLs with/without trailing slash as same", () => {
      const url1 = normalizeUrl("https://example.com/job");
      const url2 = normalizeUrl("https://example.com/job/");
      expect(url1).toBe(url2);
    });

    it("should treat URLs with/without fragment as same", () => {
      const url1 = normalizeUrl("https://example.com/job");
      const url2 = normalizeUrl("https://example.com/job#section");
      expect(url1).toBe(url2);
    });

    it("should treat URLs with different query param order as same", () => {
      const url1 = normalizeUrl("https://example.com/job?id=123&source=email");
      const url2 = normalizeUrl("https://example.com/job?source=email&id=123");
      expect(url1).toBe(url2);
    });

    it("should treat www and non-www as same", () => {
      const url1 = normalizeUrl("https://www.example.com/job");
      const url2 = normalizeUrl("https://example.com/job");
      expect(url1).toBe(url2);
    });

    it("should treat different hostnames as different", () => {
      const url1 = normalizeUrl("https://example.com/job");
      const url2 = normalizeUrl("https://different.com/job");
      expect(url1).not.toBe(url2);
    });

    it("should treat different paths as different", () => {
      const url1 = normalizeUrl("https://example.com/job/123");
      const url2 = normalizeUrl("https://example.com/job/456");
      expect(url1).not.toBe(url2);
    });

    it("should treat different query params as different", () => {
      const url1 = normalizeUrl("https://example.com/job?id=123");
      const url2 = normalizeUrl("https://example.com/job?id=456");
      expect(url1).not.toBe(url2);
    });
  });
});

describe("normalizeCompany", () => {
  describe("valid company names", () => {
    it("should normalize company name to lowercase", () => {
      expect(normalizeCompany("Atlassian")).toBe("atlassian");
    });

    it("should trim whitespace", () => {
      expect(normalizeCompany("  Atlassian  ")).toBe("atlassian");
    });

    it("should collapse multiple spaces", () => {
      expect(normalizeCompany("ABC   Company   Ltd")).toBe("abc company ltd");
    });

    it("should handle mixed case", () => {
      expect(normalizeCompany("AtLaSsIaN")).toBe("atlassian");
    });

    it("should handle company with special characters", () => {
      expect(normalizeCompany("AT&T Corporation")).toBe("at&t corporation");
    });
  });

  describe("edge cases and invalid inputs", () => {
    it("should return null for empty string", () => {
      expect(normalizeCompany("")).toBeNull();
    });

    it("should return null for whitespace-only string", () => {
      expect(normalizeCompany("   ")).toBeNull();
    });

    it("should return null for null input", () => {
      expect(normalizeCompany(null)).toBeNull();
    });

    it("should return null for undefined input", () => {
      expect(normalizeCompany(undefined)).toBeNull();
    });

    it("should return null for non-string input", () => {
      expect(normalizeCompany(12345)).toBeNull();
    });
  });

  describe("duplicate detection scenarios", () => {
    it("should treat different casing as same company", () => {
      const company1 = normalizeCompany("Atlassian");
      const company2 = normalizeCompany("ATLASSIAN");
      const company3 = normalizeCompany("atlassian");
      expect(company1).toBe(company2);
      expect(company2).toBe(company3);
    });

    it("should treat different whitespace as same company", () => {
      const company1 = normalizeCompany("ABC Company");
      const company2 = normalizeCompany("ABC  Company");
      const company3 = normalizeCompany("  ABC Company  ");
      expect(company1).toBe(company2);
      expect(company2).toBe(company3);
    });
  });
});

describe("normalizeRole", () => {
  describe("valid role names", () => {
    it("should normalize role to lowercase", () => {
      expect(normalizeRole("Senior Engineer")).toBe("senior engineer");
    });

    it("should trim whitespace", () => {
      expect(normalizeRole("  Senior Engineer  ")).toBe("senior engineer");
    });

    it("should collapse multiple spaces", () => {
      expect(normalizeRole("Senior   Software   Engineer")).toBe("senior software engineer");
    });

    it("should handle mixed case", () => {
      expect(normalizeRole("SeNiOr EnGiNeEr")).toBe("senior engineer");
    });
  });

  describe("edge cases and invalid inputs", () => {
    it("should return null for empty string", () => {
      expect(normalizeRole("")).toBeNull();
    });

    it("should return null for whitespace-only string", () => {
      expect(normalizeRole("   ")).toBeNull();
    });

    it("should return null for null input", () => {
      expect(normalizeRole(null)).toBeNull();
    });

    it("should return null for undefined input", () => {
      expect(normalizeRole(undefined)).toBeNull();
    });

    it("should return null for non-string input", () => {
      expect(normalizeRole(12345)).toBeNull();
    });
  });

  describe("duplicate detection scenarios", () => {
    it("should treat different casing as same role", () => {
      const role1 = normalizeRole("Senior Engineer");
      const role2 = normalizeRole("SENIOR ENGINEER");
      const role3 = normalizeRole("senior engineer");
      expect(role1).toBe(role2);
      expect(role2).toBe(role3);
    });

    it("should treat different whitespace as same role", () => {
      const role1 = normalizeRole("Senior Engineer");
      const role2 = normalizeRole("Senior  Engineer");
      const role3 = normalizeRole("  Senior Engineer  ");
      expect(role1).toBe(role2);
      expect(role2).toBe(role3);
    });
  });
});
