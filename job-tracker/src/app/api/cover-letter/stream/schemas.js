/**
 * Validation schemas for cover letter generation API
 */

import { z } from 'zod';

/**
 * Constraints schema for iterative cover letter generation
 *
 * Validates and normalizes user-provided constraints:
 * - Trims whitespace from all string inputs
 * - Filters out empty keywords after trimming
 * - Enforces length limits (tone ≤ 40, emphasis ≤ 200, keywords ≤ 40 chars each)
 * - Caps keyword arrays at 20 items each
 */
export const constraintsSchema = z.object({
  tone: z.string().trim().max(40).optional().nullable(),
  emphasis: z.string().trim().max(200).optional().nullable(),
  keywordsInclude: z.array(z.string().trim().max(40)).max(20).optional().default([]),
  keywordsAvoid: z.array(z.string().trim().max(40)).max(20).optional().default([]),
}).transform((data) => ({
  ...data,
  // Filter out empty strings from keyword arrays (after trimming)
  keywordsInclude: (data.keywordsInclude || []).filter(k => k.length > 0),
  keywordsAvoid: (data.keywordsAvoid || []).filter(k => k.length > 0),
}));
