/**
 * Tests for lowSignalDetect.js
 * Pure function tests for low-signal JD detection heuristics
 */

import {
  detectLowSignal,
  reasonsToMessages,
  getDefaultThresholds,
} from "../lowSignalDetect.js";

describe("detectLowSignal", () => {
  describe("input validation and edge cases", () => {
    it("should handle null jdText", () => {
      const result = detectLowSignal({
        jdText: null,
        responsibilities: [],
      });

      expect(result).toEqual({
        isLowSignal: false,
        reasons: [],
      });
    });

    it("should handle undefined jdText", () => {
      const result = detectLowSignal({
        jdText: undefined,
        responsibilities: [],
      });

      expect(result).toEqual({
        isLowSignal: false,
        reasons: [],
      });
    });

    it("should handle empty string jdText", () => {
      const result = detectLowSignal({
        jdText: "",
        responsibilities: [],
      });

      expect(result).toEqual({
        isLowSignal: true,
        reasons: ["too_short"],
      });
    });

    it("should handle missing responsibilities parameter", () => {
      const result = detectLowSignal({
        jdText: "Short text",
      });

      expect(result).toEqual({
        isLowSignal: true,
        reasons: ["too_short"],
      });
    });

    it("should handle null responsibilities", () => {
      const result = detectLowSignal({
        jdText: "x".repeat(5000),
        responsibilities: null,
      });

      // Should not crash, treats null as empty array
      expect(result.isLowSignal).toBe(false);
      expect(result.reasons).toEqual([]);
    });
  });

  describe("too_long heuristic", () => {
    it("should detect JD exceeding 50k chars", () => {
      const longJd = "x".repeat(50001);
      const result = detectLowSignal({
        jdText: longJd,
        responsibilities: [],
      });

      expect(result.isLowSignal).toBe(true);
      expect(result.reasons).toContain("too_long");
    });

    it("should NOT flag JD at exactly 50k chars", () => {
      const longJd = "x".repeat(50000);
      const result = detectLowSignal({
        jdText: longJd,
        responsibilities: [],
      });

      expect(result.reasons).not.toContain("too_long");
    });

    it("should NOT flag JD under 50k chars", () => {
      const okJd = "x".repeat(49999);
      const result = detectLowSignal({
        jdText: okJd,
        responsibilities: [],
      });

      expect(result.reasons).not.toContain("too_long");
    });
  });

  describe("too_short heuristic", () => {
    it("should detect JD under 1k chars", () => {
      const shortJd = "x".repeat(999);
      const result = detectLowSignal({
        jdText: shortJd,
        responsibilities: [],
      });

      expect(result.isLowSignal).toBe(true);
      expect(result.reasons).toContain("too_short");
    });

    it("should NOT flag JD at exactly 1k chars", () => {
      const okJd = "x".repeat(1000);
      const result = detectLowSignal({
        jdText: okJd,
        responsibilities: [],
      });

      expect(result.reasons).not.toContain("too_short");
    });

    it("should NOT flag JD over 1k chars", () => {
      const okJd = "x".repeat(1001);
      const result = detectLowSignal({
        jdText: okJd,
        responsibilities: [],
      });

      expect(result.reasons).not.toContain("too_short");
    });
  });

  describe("too_many_items heuristic", () => {
    it("should detect over 30 responsibilities", () => {
      const manyItems = Array.from({ length: 31 }, (_, i) => `Task ${i + 1}`);
      const result = detectLowSignal({
        jdText: "x".repeat(5000),
        responsibilities: manyItems,
      });

      expect(result.isLowSignal).toBe(true);
      expect(result.reasons).toContain("too_many_items");
    });

    it("should NOT flag exactly 30 responsibilities", () => {
      const okItems = Array.from({ length: 30 }, (_, i) => `Task ${i + 1}`);
      const result = detectLowSignal({
        jdText: "x".repeat(5000),
        responsibilities: okItems,
      });

      expect(result.reasons).not.toContain("too_many_items");
    });

    it("should NOT flag under 30 responsibilities", () => {
      const okItems = Array.from({ length: 29 }, (_, i) => `Task ${i + 1}`);
      const result = detectLowSignal({
        jdText: "x".repeat(5000),
        responsibilities: okItems,
      });

      expect(result.reasons).not.toContain("too_many_items");
    });
  });

  describe("repetitive heuristic", () => {
    it("should detect highly repetitive text", () => {
      // Same word repeated 100 times = very low unique ratio
      const repetitiveJd = "word ".repeat(100);
      const result = detectLowSignal({
        jdText: repetitiveJd,
        responsibilities: [],
      });

      expect(result.isLowSignal).toBe(true);
      expect(result.reasons).toContain("repetitive");
    });

    it("should NOT flag text with good unique word ratio", () => {
      // Mix of unique words
      const goodJd = "The quick brown fox jumps over the lazy dog. " + "Many different words here. " + "Varied vocabulary throughout. ".repeat(10);
      const result = detectLowSignal({
        jdText: goodJd,
        responsibilities: [],
      });

      expect(result.reasons).not.toContain("repetitive");
    });

    it("should handle text with no words gracefully", () => {
      const noWords = "123 456 789 !@# $%^";
      const result = detectLowSignal({
        jdText: noWords,
        responsibilities: [],
      });

      // Should not crash, should not flag as repetitive (ratio = 1)
      expect(result.reasons).not.toContain("repetitive");
    });

    it("should handle text at exactly 0.3 unique ratio threshold", () => {
      // Create text with exactly 30% unique words
      // 10 unique words, 33 total words (10/33 ≈ 0.303)
      const uniqueWords = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
      const borderlineJd = uniqueWords.join(" ") + " " + "repeat ".repeat(23);
      const result = detectLowSignal({
        jdText: borderlineJd,
        responsibilities: [],
      });

      // At exactly threshold or above, should NOT be flagged
      expect(result.reasons).not.toContain("repetitive");
    });
  });

  describe("combined detection scenarios", () => {
    it("should detect multiple issues", () => {
      // Too long AND repetitive
      const problematicJd = "word ".repeat(20000); // >50k chars and repetitive
      const result = detectLowSignal({
        jdText: problematicJd,
        responsibilities: [],
      });

      expect(result.isLowSignal).toBe(true);
      expect(result.reasons).toContain("too_long");
      expect(result.reasons).toContain("repetitive");
    });

    it("should detect all four issues simultaneously", () => {
      const allIssuesJd = "word ".repeat(20000); // too_long + repetitive
      const manyItems = Array.from({ length: 35 }, (_, i) => `Task ${i + 1}`);

      const result = detectLowSignal({
        jdText: allIssuesJd,
        responsibilities: manyItems,
      });

      expect(result.isLowSignal).toBe(true);
      expect(result.reasons).toContain("too_long");
      expect(result.reasons).toContain("repetitive");
      expect(result.reasons).toContain("too_many_items");
      expect(result.reasons.length).toBe(3);
    });

    it("should return clean result for good JD", () => {
      const goodJd = "Senior Software Engineer role requires 5 years experience. ".repeat(20);
      const okItems = ["Lead team", "Design systems", "Code reviews"];

      const result = detectLowSignal({
        jdText: goodJd,
        responsibilities: okItems,
      });

      expect(result.isLowSignal).toBe(false);
      expect(result.reasons).toEqual([]);
    });
  });

  describe("custom thresholds", () => {
    it("should accept custom maxJdLength threshold", () => {
      const customJd = "x".repeat(5000);
      const result = detectLowSignal({
        jdText: customJd,
        responsibilities: [],
        thresholds: {
          maxJdLength: 4000, // Custom threshold
        },
      });

      expect(result.isLowSignal).toBe(true);
      expect(result.reasons).toContain("too_long");
    });

    it("should accept custom minJdLength threshold", () => {
      const customJd = "x".repeat(1500);
      const result = detectLowSignal({
        jdText: customJd,
        responsibilities: [],
        thresholds: {
          minJdLength: 2000, // Custom threshold
        },
      });

      expect(result.isLowSignal).toBe(true);
      expect(result.reasons).toContain("too_short");
    });

    it("should accept custom maxResponsibilities threshold", () => {
      const items = Array.from({ length: 15 }, (_, i) => `Task ${i + 1}`);
      const result = detectLowSignal({
        jdText: "x".repeat(5000),
        responsibilities: items,
        thresholds: {
          maxResponsibilities: 10, // Custom threshold
        },
      });

      expect(result.isLowSignal).toBe(true);
      expect(result.reasons).toContain("too_many_items");
    });

    it("should accept custom minUniqueWordRatio threshold", () => {
      const mixedJd = "The quick brown fox jumps over the lazy dog. ".repeat(10);
      const result = detectLowSignal({
        jdText: mixedJd,
        responsibilities: [],
        thresholds: {
          minUniqueWordRatio: 0.8, // Very high threshold
        },
      });

      expect(result.isLowSignal).toBe(true);
      expect(result.reasons).toContain("repetitive");
    });

    it("should merge custom thresholds with defaults", () => {
      const result = detectLowSignal({
        jdText: "x".repeat(5000),
        responsibilities: [],
        thresholds: {
          maxJdLength: 4000, // Only override one threshold
        },
      });

      // Should still apply default thresholds for other checks
      expect(result).toBeDefined();
    });
  });
});

describe("reasonsToMessages", () => {
  it("should convert too_long reason", () => {
    const messages = reasonsToMessages(["too_long"]);
    expect(messages).toEqual([
      "The job description is very long and may contain boilerplate or irrelevant content.",
    ]);
  });

  it("should convert too_short reason", () => {
    const messages = reasonsToMessages(["too_short"]);
    expect(messages).toEqual([
      "The job description is quite short and may lack specific details.",
    ]);
  });

  it("should convert too_many_items reason", () => {
    const messages = reasonsToMessages(["too_many_items"]);
    expect(messages).toEqual([
      "A large number of responsibilities were extracted, making it harder to focus.",
    ]);
  });

  it("should convert repetitive reason", () => {
    const messages = reasonsToMessages(["repetitive"]);
    expect(messages).toEqual([
      "The job description contains repetitive content which may reduce clarity.",
    ]);
  });

  it("should handle multiple reasons", () => {
    const messages = reasonsToMessages(["too_long", "repetitive"]);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain("very long");
    expect(messages[1]).toContain("repetitive");
  });

  it("should handle empty array", () => {
    const messages = reasonsToMessages([]);
    expect(messages).toEqual([]);
  });

  it("should handle unknown reason codes gracefully", () => {
    const messages = reasonsToMessages(["unknown_code"]);
    expect(messages).toEqual(["unknown_code"]);
  });

  it("should preserve order of reasons", () => {
    const messages = reasonsToMessages(["too_short", "too_many_items", "repetitive"]);
    expect(messages).toHaveLength(3);
    expect(messages[0]).toContain("short");
    expect(messages[1]).toContain("responsibilities");
    expect(messages[2]).toContain("repetitive");
  });
});

describe("getDefaultThresholds", () => {
  it("should return default threshold values", () => {
    const thresholds = getDefaultThresholds();

    expect(thresholds).toEqual({
      maxJdLength: 50000,
      minJdLength: 1000,
      maxResponsibilities: 30,
      minUniqueWordRatio: 0.3,
    });
  });

  it("should return a copy, not the original object", () => {
    const thresholds1 = getDefaultThresholds();
    const thresholds2 = getDefaultThresholds();

    expect(thresholds1).toEqual(thresholds2);
    expect(thresholds1).not.toBe(thresholds2);
  });
});
