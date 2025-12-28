/**
 * Tests for rule-based mapping proposal algorithm
 * These tests document expected behavior for non-AI, keyword-based matching
 */

import { proposeMapping } from "../proposeRuleBased.js";

describe("proposeMapping", () => {
  describe("keyword overlap scoring", () => {
    test("should match items with overlapping keywords", () => {
      const items = [
        {
          kind: "responsibility",
          text: "Build React components for frontend dashboard",
        },
      ];

      const bullets = [
        {
          id: "bullet-1",
          text: "Developed React dashboard with real-time data visualization",
          title: "Frontend Dashboard",
          tags: ["react", "frontend"],
          impact: "Improved user engagement by 40%",
        },
        {
          id: "bullet-2",
          text: "Built backend API with Node.js and Express",
          title: "API Development",
          tags: ["backend", "nodejs"],
          impact: null,
        },
      ];

      const result = proposeMapping({ items, bullets });

      expect(result).toHaveLength(1);
      expect(result[0].kind).toBe("responsibility");
      expect(result[0].text).toBe(items[0].text);
      expect(result[0].suggestedBulletIds).toContain("bullet-1");
      expect(result[0].suggestedBulletIds).not.toContain("bullet-2");
      expect(result[0].scoreByBulletId["bullet-1"]).toBeGreaterThan(0);
    });

    test("should return top N bullets when multiple match", () => {
      const items = [
        {
          kind: "requirement",
          text: "Experience with React, TypeScript, and testing",
        },
      ];

      const bullets = [
        {
          id: "bullet-1",
          text: "Built React application with TypeScript and Jest testing",
          title: null,
          tags: ["react", "typescript", "testing"],
          impact: null,
        },
        {
          id: "bullet-2",
          text: "Developed React components with comprehensive test coverage",
          title: null,
          tags: ["react", "testing"],
          impact: null,
        },
        {
          id: "bullet-3",
          text: "Implemented TypeScript interfaces and types",
          title: null,
          tags: ["typescript"],
          impact: null,
        },
        {
          id: "bullet-4",
          text: "Worked on Python backend services",
          title: null,
          tags: ["python", "backend"],
          impact: null,
        },
      ];

      const result = proposeMapping({ items, bullets });

      expect(result).toHaveLength(1);
      expect(result[0].suggestedBulletIds.length).toBeLessThanOrEqual(3);
      expect(result[0].suggestedBulletIds).toContain("bullet-1"); // Highest overlap
      expect(result[0].suggestedBulletIds).not.toContain("bullet-4"); // No overlap
    });

    test("should give bonus for exact tag matches", () => {
      const items = [
        {
          kind: "requirement",
          text: "Experience with react and frontend development",
        },
      ];

      const bullets = [
        {
          id: "bullet-1",
          text: "Worked on application development and deployment",
          title: null,
          tags: ["react", "frontend"],
          impact: null,
        },
        {
          id: "bullet-2",
          text: "Built react frontend application with modern development practices",
          title: null,
          tags: [],
          impact: null,
        },
      ];

      const result = proposeMapping({ items, bullets });

      expect(result).toHaveLength(1);
      // bullet-1 should score higher due to tag bonus despite bullet-2 having more text overlap
      expect(result[0].scoreByBulletId["bullet-1"]).toBeGreaterThan(
        result[0].scoreByBulletId["bullet-2"]
      );
    });

    test("should return empty suggestedBulletIds when no match exceeds threshold", () => {
      const items = [
        {
          kind: "requirement",
          text: "Experience with quantum computing and blockchain",
        },
      ];

      const bullets = [
        {
          id: "bullet-1",
          text: "Built React dashboard application",
          title: null,
          tags: ["react", "frontend"],
          impact: null,
        },
      ];

      const result = proposeMapping({ items, bullets });

      expect(result).toHaveLength(1);
      expect(result[0].suggestedBulletIds).toEqual([]);
      expect(result[0].scoreByBulletId).toEqual({});
    });
  });

  describe("text normalization", () => {
    test("should be case-insensitive", () => {
      const items = [
        {
          kind: "requirement",
          text: "REACT and JAVASCRIPT experience",
        },
      ];

      const bullets = [
        {
          id: "bullet-1",
          text: "react and javascript development",
          title: null,
          tags: null,
          impact: null,
        },
      ];

      const result = proposeMapping({ items, bullets });

      expect(result[0].suggestedBulletIds).toContain("bullet-1");
    });

    test("should handle punctuation", () => {
      const items = [
        {
          kind: "requirement",
          text: "Node.js, Express, and REST APIs",
        },
      ];

      const bullets = [
        {
          id: "bullet-1",
          text: "Built REST APIs using Node.js and Express framework",
          title: null,
          tags: null,
          impact: null,
        },
      ];

      const result = proposeMapping({ items, bullets });

      expect(result[0].suggestedBulletIds).toContain("bullet-1");
    });
  });

  describe("stopword filtering", () => {
    test("should ignore common stopwords in scoring", () => {
      const items = [
        {
          kind: "requirement",
          text: "The candidate should have experience with the React library",
        },
      ];

      const bullets = [
        {
          id: "bullet-1",
          text: "Experience with React",
          title: null,
          tags: null,
          impact: null,
        },
        {
          id: "bullet-2",
          text: "The library is a candidate for the project",
          title: null,
          tags: null,
          impact: null,
        },
      ];

      const result = proposeMapping({ items, bullets });

      // bullet-1 should score higher despite bullet-2 having more words
      // because stopwords are filtered
      expect(result[0].scoreByBulletId["bullet-1"]).toBeGreaterThan(
        result[0].scoreByBulletId["bullet-2"] || 0
      );
    });
  });

  describe("edge cases", () => {
    test("should handle empty items array", () => {
      const items = [];
      const bullets = [
        {
          id: "bullet-1",
          text: "Some experience",
          title: null,
          tags: null,
          impact: null,
        },
      ];

      const result = proposeMapping({ items, bullets });

      expect(result).toEqual([]);
    });

    test("should handle empty bullets array", () => {
      const items = [
        {
          kind: "requirement",
          text: "React experience",
        },
      ];
      const bullets = [];

      const result = proposeMapping({ items, bullets });

      expect(result).toHaveLength(1);
      expect(result[0].suggestedBulletIds).toEqual([]);
    });

    test("should handle null/undefined fields gracefully", () => {
      const items = [
        {
          kind: "requirement",
          text: "React development",
        },
      ];

      const bullets = [
        {
          id: "bullet-1",
          text: "React component development",
          title: null,
          tags: null,
          impact: null,
        },
      ];

      const result = proposeMapping({ items, bullets });

      expect(result).toHaveLength(1);
      expect(result[0].suggestedBulletIds).toContain("bullet-1");
    });
  });

  describe("multiple items", () => {
    test("should generate proposals for all items", () => {
      const items = [
        { kind: "responsibility", text: "React development" },
        { kind: "requirement", text: "Python backend" },
        { kind: "requirement", text: "DevOps and CI/CD" },
      ];

      const bullets = [
        {
          id: "bullet-1",
          text: "Built React components",
          title: null,
          tags: ["react"],
          impact: null,
        },
        {
          id: "bullet-2",
          text: "Developed Python API services",
          title: null,
          tags: ["python", "backend"],
          impact: null,
        },
      ];

      const result = proposeMapping({ items, bullets });

      expect(result).toHaveLength(3);
      expect(result[0].kind).toBe("responsibility");
      expect(result[1].kind).toBe("requirement");
      expect(result[2].kind).toBe("requirement");
      expect(result[2].text).toBe("DevOps and CI/CD");
      expect(result[2].suggestedBulletIds).toEqual([]); // No match
    });
  });

  describe("itemKey generation", () => {
    test("should generate unique keys for each item", () => {
      const items = [
        { kind: "responsibility", text: "First responsibility" },
        { kind: "requirement", text: "First requirement" },
        { kind: "requirement", text: "Second requirement" },
      ];

      const bullets = [];

      const result = proposeMapping({ items, bullets });

      const keys = result.map((r) => r.itemKey);
      expect(new Set(keys).size).toBe(3); // All unique
      expect(keys[0]).toMatch(/^responsibility-\d+$/);
      expect(keys[1]).toMatch(/^requirement-\d+$/);
      expect(keys[2]).toMatch(/^requirement-\d+$/);
    });
  });
});
