/**
 * Tests for cover letter generation constraints validation
 */

import { constraintsSchema } from '../schemas';

describe('Constraints validation', () => {
  describe('Valid constraints', () => {
    test('should accept valid constraints with all fields', () => {
      const input = {
        tone: 'professional',
        emphasis: 'Focus on leadership experience',
        keywordsInclude: ['innovation', 'collaboration'],
        keywordsAvoid: ['junior', 'entry-level'],
      };

      const result = constraintsSchema.safeParse(input);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(input);
    });

    test('should accept empty constraints object', () => {
      const input = {};

      const result = constraintsSchema.safeParse(input);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        keywordsInclude: [],
        keywordsAvoid: [],
      });
    });

    test('should accept constraints with only some fields', () => {
      const input = {
        tone: 'friendly',
      };

      const result = constraintsSchema.safeParse(input);
      expect(result.success).toBe(true);
      expect(result.data.tone).toBe('friendly');
      expect(result.data.keywordsInclude).toEqual([]);
      expect(result.data.keywordsAvoid).toEqual([]);
    });
  });

  describe('String trimming', () => {
    test('should trim whitespace from tone', () => {
      const input = {
        tone: '  professional  ',
      };

      const result = constraintsSchema.safeParse(input);
      expect(result.success).toBe(true);
      expect(result.data.tone).toBe('professional');
    });

    test('should trim whitespace from emphasis', () => {
      const input = {
        emphasis: '  Focus on leadership  ',
      };

      const result = constraintsSchema.safeParse(input);
      expect(result.success).toBe(true);
      expect(result.data.emphasis).toBe('Focus on leadership');
    });

    test('should trim whitespace from keywords', () => {
      const input = {
        keywordsInclude: ['  innovation  ', '  collaboration  '],
      };

      const result = constraintsSchema.safeParse(input);
      expect(result.success).toBe(true);
      expect(result.data.keywordsInclude).toEqual(['innovation', 'collaboration']);
    });
  });

  describe('Empty string filtering', () => {
    test('should filter out empty strings from keywordsInclude', () => {
      const input = {
        keywordsInclude: ['innovation', '', 'collaboration', '   '],
      };

      const result = constraintsSchema.safeParse(input);
      expect(result.success).toBe(true);
      // After trim, empty strings become empty, then filtered out
      expect(result.data.keywordsInclude).toEqual(['innovation', 'collaboration']);
    });

    test('should filter out empty strings from keywordsAvoid', () => {
      const input = {
        keywordsAvoid: ['junior', '', '   ', 'entry-level'],
      };

      const result = constraintsSchema.safeParse(input);
      expect(result.success).toBe(true);
      expect(result.data.keywordsAvoid).toEqual(['junior', 'entry-level']);
    });
  });

  describe('Length limits', () => {
    test('should reject tone longer than 40 characters', () => {
      const input = {
        tone: 'a'.repeat(41),
      };

      const result = constraintsSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('should reject emphasis longer than 200 characters', () => {
      const input = {
        emphasis: 'a'.repeat(201),
      };

      const result = constraintsSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('should reject keyword longer than 40 characters', () => {
      const input = {
        keywordsInclude: ['a'.repeat(41)],
      };

      const result = constraintsSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('should reject more than 20 keywordsInclude', () => {
      const input = {
        keywordsInclude: Array(21).fill('keyword'),
      };

      const result = constraintsSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('should reject more than 20 keywordsAvoid', () => {
      const input = {
        keywordsAvoid: Array(21).fill('keyword'),
      };

      const result = constraintsSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Null handling', () => {
    test('should accept null for tone', () => {
      const input = {
        tone: null,
      };

      const result = constraintsSchema.safeParse(input);
      expect(result.success).toBe(true);
      expect(result.data.tone).toBeNull();
    });

    test('should accept null for emphasis', () => {
      const input = {
        emphasis: null,
      };

      const result = constraintsSchema.safeParse(input);
      expect(result.success).toBe(true);
      expect(result.data.emphasis).toBeNull();
    });
  });
});
