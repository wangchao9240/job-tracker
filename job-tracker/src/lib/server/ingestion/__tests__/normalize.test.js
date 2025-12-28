/**
 * Unit tests for text normalization helpers
 * Tests text processing, HTML conversion, and edge cases
 */

import { normalizeText, normalizeOrNull, htmlToText, truncate } from "../normalize";

describe("normalize", () => {
  describe("normalizeText", () => {
    it("should trim leading and trailing whitespace", () => {
      expect(normalizeText("  hello  ")).toBe("hello");
    });

    it("should collapse multiple spaces to single space", () => {
      expect(normalizeText("hello    world")).toBe("hello world");
    });

    it("should collapse newlines and tabs to single space", () => {
      expect(normalizeText("hello\n\n\nworld")).toBe("hello world");
      expect(normalizeText("hello\t\t\tworld")).toBe("hello world");
    });

    it("should handle mixed whitespace", () => {
      expect(normalizeText("  hello \n\t  world  \n")).toBe("hello world");
    });

    it("should return empty string for null", () => {
      expect(normalizeText(null)).toBe("");
    });

    it("should return empty string for undefined", () => {
      expect(normalizeText(undefined)).toBe("");
    });

    it("should return empty string for non-string", () => {
      expect(normalizeText(123)).toBe("");
      expect(normalizeText({})).toBe("");
    });

    it("should handle empty string", () => {
      expect(normalizeText("")).toBe("");
    });

    it("should preserve single spaces", () => {
      expect(normalizeText("hello world")).toBe("hello world");
    });
  });

  describe("normalizeOrNull", () => {
    it("should return normalized text for valid input", () => {
      expect(normalizeOrNull("  hello  ")).toBe("hello");
    });

    it("should return null for empty string", () => {
      expect(normalizeOrNull("")).toBe(null);
    });

    it("should return null for whitespace-only string", () => {
      expect(normalizeOrNull("   ")).toBe(null);
      expect(normalizeOrNull("\n\t  ")).toBe(null);
    });

    it("should return null for null input", () => {
      expect(normalizeOrNull(null)).toBe(null);
    });

    it("should return null for undefined input", () => {
      expect(normalizeOrNull(undefined)).toBe(null);
    });

    it("should collapse whitespace and return result", () => {
      expect(normalizeOrNull("hello    world")).toBe("hello world");
    });
  });

  describe("htmlToText", () => {
    it("should remove script tags and content", () => {
      const html = "<p>Text</p><script>alert('xss')</script><p>More</p>";
      const result = htmlToText(html);
      expect(result).not.toContain("alert");
      expect(result).not.toContain("script");
    });

    it("should remove style tags and content", () => {
      const html = "<p>Text</p><style>.class { color: red; }</style><p>More</p>";
      const result = htmlToText(html);
      expect(result).not.toContain("color");
      expect(result).not.toContain("style");
    });

    it("should replace block elements with newlines", () => {
      const html = "<p>Para 1</p><p>Para 2</p>";
      const result = htmlToText(html);
      expect(result).toContain("Para 1");
      expect(result).toContain("Para 2");
    });

    it("should remove all HTML tags", () => {
      const html = "<div><span>Hello</span> <strong>World</strong></div>";
      const result = htmlToText(html);
      expect(result).toBe("Hello World");
    });

    it("should decode common HTML entities", () => {
      const html = "Hello&nbsp;World &amp; Friends &lt;test&gt; &quot;quote&quot; &#39;apostrophe&#39;";
      const result = htmlToText(html);
      expect(result).toContain("Hello World");
      expect(result).toContain("&");
      expect(result).toContain("<");
      expect(result).toContain(">");
      expect(result).toContain('"');
      expect(result).toContain("'");
    });

    it("should normalize whitespace after tag removal", () => {
      const html = "<p>  Hello  </p>  <p>  World  </p>";
      const result = htmlToText(html);
      expect(result).toBe("Hello World");
    });

    it("should handle empty HTML", () => {
      expect(htmlToText("")).toBe("");
    });

    it("should return empty string for null", () => {
      expect(htmlToText(null)).toBe("");
    });

    it("should return empty string for undefined", () => {
      expect(htmlToText(undefined)).toBe("");
    });

    it("should return empty string for non-string", () => {
      expect(htmlToText(123)).toBe("");
    });

    it("should handle nested tags", () => {
      const html = "<div><p><span>Nested</span> content</p></div>";
      const result = htmlToText(html);
      expect(result).toBe("Nested content");
    });

    it("should handle list items", () => {
      const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";
      const result = htmlToText(html);
      expect(result).toContain("Item 1");
      expect(result).toContain("Item 2");
    });

    it("should handle headings", () => {
      const html = "<h1>Title</h1><h2>Subtitle</h2><p>Content</p>";
      const result = htmlToText(html);
      expect(result).toContain("Title");
      expect(result).toContain("Subtitle");
      expect(result).toContain("Content");
    });
  });

  describe("truncate", () => {
    it("should not truncate text shorter than maxLength", () => {
      expect(truncate("Hello", 10)).toBe("Hello");
    });

    it("should truncate text longer than maxLength with ellipsis", () => {
      expect(truncate("Hello World", 8)).toBe("Hello...");
    });

    it("should truncate exactly at maxLength minus 3 for ellipsis", () => {
      const text = "1234567890";
      expect(truncate(text, 8)).toBe("12345...");
      expect(truncate(text, 8).length).toBe(8);
    });

    it("should handle empty string", () => {
      expect(truncate("", 10)).toBe("");
    });

    it("should return empty string for null", () => {
      expect(truncate(null, 10)).toBe("");
    });

    it("should return empty string for undefined", () => {
      expect(truncate(undefined, 10)).toBe("");
    });

    it("should return empty string for non-string", () => {
      expect(truncate(123, 10)).toBe("");
    });

    it("should handle text exactly at maxLength", () => {
      expect(truncate("12345", 5)).toBe("12345");
    });

    it("should handle very short maxLength", () => {
      expect(truncate("Hello", 4)).toBe("H...");
    });

    it("should handle unicode characters", () => {
      const text = "Hello 世界 World";
      const result = truncate(text, 10);
      expect(result.length).toBe(10);
      expect(result.endsWith("...")).toBe(true);
    });
  });
});
