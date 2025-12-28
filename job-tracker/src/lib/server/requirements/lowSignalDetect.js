/**
 * Low-Signal JD Detection Helper
 *
 * Pure, deterministic helper to detect when a JD is "low-signal"
 * (overly generic, too long, noisy, etc.) and advise user to select
 * key responsibilities for focus.
 *
 * This is advisory only - never blocks extraction or progress.
 */

import { reasonsToMessages } from "@/lib/utils/lowSignalMessages.js";

// Detection thresholds (configurable via parameters or future config)
const DEFAULT_THRESHOLDS = {
  // JD length thresholds (characters)
  maxJdLength: 50000, // Very long JDs may contain boilerplate
  minJdLength: 1000, // Very short JDs lack detail
  // Extraction result thresholds
  maxResponsibilities: 30, // Too many items = noisy
  // Repetition threshold (unique words / total words ratio)
  minUniqueWordRatio: 0.3, // Below this = too repetitive
};

/**
 * Calculate unique word ratio as a measure of repetitiveness
 * @param {string} text - Text to analyze
 * @returns {number} Ratio of unique words to total words (0-1)
 */
function calculateUniqueWordRatio(text) {
  if (!text || typeof text !== "string") {
    return 1; // Default to non-repetitive
  }

  // Extract words (alphanumeric sequences, case-insensitive)
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];

  if (words.length === 0) {
    return 1;
  }

  const uniqueWords = new Set(words);
  return uniqueWords.size / words.length;
}

/**
 * Detect if a JD is "low-signal" based on deterministic heuristics
 *
 * @param {Object} params - Detection parameters
 * @param {string} params.jdText - The JD snapshot text
 * @param {string[]} params.responsibilities - Extracted responsibilities array
 * @param {Object} [params.thresholds] - Optional custom thresholds
 * @returns {{ isLowSignal: boolean, reasons: string[] }} Detection result
 */
export function detectLowSignal({
  jdText,
  responsibilities = [],
  thresholds = {},
}) {
  const config = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const reasons = [];

  // Check JD length - too long
  if (jdText && jdText.length > config.maxJdLength) {
    reasons.push("too_long");
  }

  // Check JD length - too short
  if (jdText && jdText.length < config.minJdLength) {
    reasons.push("too_short");
  }

  // Check for too many responsibilities
  if (responsibilities.length > config.maxResponsibilities) {
    reasons.push("too_many_items");
  }

  // Check for repetitive content
  if (jdText) {
    const uniqueRatio = calculateUniqueWordRatio(jdText);
    if (uniqueRatio < config.minUniqueWordRatio) {
      reasons.push("repetitive");
    }
  }

  return {
    isLowSignal: reasons.length > 0,
    reasons,
  };
}

// Re-export reasonsToMessages from shared utils for convenience
export { reasonsToMessages } from "@/lib/utils/lowSignalMessages.js";

/**
 * Get default thresholds (for testing/documentation)
 * @returns {Object} Default threshold values
 */
export function getDefaultThresholds() {
  return { ...DEFAULT_THRESHOLDS };
}
