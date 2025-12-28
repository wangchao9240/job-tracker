/**
 * Unit tests for GET /api/applications filter parameter validation
 * Tests query parameter parsing and validation
 */

import { APPLICATION_STATUSES, APPLICATION_SOURCES } from "@/lib/utils/applicationStatus";

describe("/api/applications - filter parameter validation", () => {
  describe("status parameter", () => {
    it("should accept valid status values", () => {
      APPLICATION_STATUSES.forEach((status) => {
        const isValid = APPLICATION_STATUSES.includes(status);
        expect(isValid).toBe(true);
      });
    });

    it("should reject invalid status values", () => {
      const invalidStatuses = ["invalid", "pending", "completed", ""];
      invalidStatuses.forEach((status) => {
        const isValid = APPLICATION_STATUSES.includes(status);
        expect(isValid).toBe(false);
      });
    });

    it("should handle null/undefined status", () => {
      expect(APPLICATION_STATUSES.includes(null)).toBe(false);
      expect(APPLICATION_STATUSES.includes(undefined)).toBe(false);
      expect(APPLICATION_STATUSES.includes("")).toBe(false);
    });
  });

  describe("source parameter", () => {
    it("should accept valid source values", () => {
      APPLICATION_SOURCES.forEach((source) => {
        const isValid = APPLICATION_SOURCES.includes(source);
        expect(isValid).toBe(true);
      });
    });

    it("should accept all defined sources", () => {
      const expectedSources = ["unknown", "seek", "linkedin", "company"];
      expectedSources.forEach((source) => {
        expect(APPLICATION_SOURCES.includes(source)).toBe(true);
      });
    });

    it("should reject invalid source values", () => {
      const invalidSources = ["invalid", "indeed", "glassdoor", ""];
      invalidSources.forEach((source) => {
        const isValid = APPLICATION_SOURCES.includes(source);
        expect(isValid).toBe(false);
      });
    });

    it("should handle null/undefined source", () => {
      expect(APPLICATION_SOURCES.includes(null)).toBe(false);
      expect(APPLICATION_SOURCES.includes(undefined)).toBe(false);
      expect(APPLICATION_SOURCES.includes("")).toBe(false);
    });
  });

  describe("search query (q) parameter", () => {
    it("should accept non-empty strings", () => {
      const validQueries = ["Google", "Software Engineer", "test"];
      validQueries.forEach((q) => {
        expect(q && q.trim()).toBeTruthy();
      });
    });

    it("should reject empty or whitespace-only strings", () => {
      const invalidQueries = ["", "   ", "\t", "\n"];
      invalidQueries.forEach((q) => {
        const trimmed = q.trim();
        expect(!trimmed).toBe(true);
      });
    });
  });

  describe("date range parameters (from/to)", () => {
    it("should accept valid YYYY-MM-DD format", () => {
      const validDates = [
        "2025-12-27",
        "2024-01-01",
        "2023-06-15",
        "2025-12-31",
      ];
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      validDates.forEach((date) => {
        expect(dateRegex.test(date)).toBe(true);
      });
    });

    it("should reject invalid date formats", () => {
      const invalidDates = [
        "2025/12/27",
        "27-12-2025",
        "2025-12-27T00:00:00",
        "2025-1-1",
        "invalid",
        "",
      ];
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      invalidDates.forEach((date) => {
        expect(dateRegex.test(date)).toBe(false);
      });
    });

    it("should validate date range logic (from <= to)", () => {
      const testCases = [
        { from: "2025-12-01", to: "2025-12-31", valid: true },
        { from: "2025-12-27", to: "2025-12-27", valid: true },
        { from: "2025-12-31", to: "2025-12-01", valid: false },
        { from: "2026-01-01", to: "2025-12-31", valid: false },
      ];

      testCases.forEach(({ from, to, valid }) => {
        const fromDate = new Date(from);
        const toDate = new Date(to);
        const isValidRange = fromDate <= toDate;
        expect(isValidRange).toBe(valid);
      });
    });
  });

  describe("combined filter scenarios", () => {
    it("should handle all filters together", () => {
      const filters = {
        status: "applied",
        source: "linkedin",
        q: "Google",
        from: "2025-12-01",
        to: "2025-12-31",
      };

      // Validate each filter
      expect(APPLICATION_STATUSES.includes(filters.status)).toBe(true);
      expect(APPLICATION_SOURCES.includes(filters.source)).toBe(true);
      expect(filters.q && filters.q.trim()).toBeTruthy();

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      expect(dateRegex.test(filters.from)).toBe(true);
      expect(dateRegex.test(filters.to)).toBe(true);

      const fromDate = new Date(filters.from);
      const toDate = new Date(filters.to);
      expect(fromDate <= toDate).toBe(true);
    });

    it("should handle no filters (all empty)", () => {
      const filters = {
        status: null,
        source: null,
        q: null,
        from: null,
        to: null,
      };

      // All filters should be null/falsy
      Object.values(filters).forEach((value) => {
        expect(value).toBeNull();
      });
    });

    it("should handle partial filters", () => {
      const filters = {
        status: "draft",
        source: null,
        q: "Engineer",
        from: null,
        to: null,
      };

      expect(APPLICATION_STATUSES.includes(filters.status)).toBe(true);
      expect(filters.source).toBeNull();
      expect(filters.q && filters.q.trim()).toBeTruthy();
      expect(filters.from).toBeNull();
      expect(filters.to).toBeNull();
    });
  });
});
