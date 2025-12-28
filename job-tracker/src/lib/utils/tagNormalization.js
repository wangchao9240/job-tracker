/**
 * Tag Normalization Utilities
 * Normalizes tags for consistent storage and filtering
 */

const MAX_TAG_LENGTH = 30;
const MAX_TAGS_PER_BULLET = 20;

/**
 * Normalizes an array of tags according to business rules:
 * - Trims whitespace
 * - Converts to lowercase
 * - Removes empty tags
 * - Deduplicates
 * - Limits tag length
 * - Limits total number of tags
 *
 * @param {string[]|null|undefined} tags - Array of tag strings
 * @returns {string[]|null} Normalized tag array or null
 */
export function normalizeTags(tags) {
  if (!tags || !Array.isArray(tags)) {
    return null;
  }

  const normalized = tags
    .map((tag) => {
      if (typeof tag !== "string") return null;

      // Trim and lowercase
      const trimmed = tag.trim().toLowerCase();

      // Skip empty tags
      if (!trimmed) return null;

      // Limit tag length
      return trimmed.slice(0, MAX_TAG_LENGTH);
    })
    .filter((tag) => tag !== null); // Remove nulls

  // Deduplicate using Set
  const unique = [...new Set(normalized)];

  // Limit total number of tags
  const limited = unique.slice(0, MAX_TAGS_PER_BULLET);

  // Return null if no valid tags remain
  return limited.length > 0 ? limited : null;
}

/**
 * Validates individual tag string (for error messages)
 *
 * @param {string} tag - Tag string to validate
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validateTag(tag) {
  if (typeof tag !== "string") {
    return { valid: false, error: "Tag must be a string" };
  }

  const trimmed = tag.trim();

  if (!trimmed) {
    return { valid: false, error: "Tag cannot be empty" };
  }

  if (trimmed.length > MAX_TAG_LENGTH) {
    return { valid: false, error: `Tag cannot exceed ${MAX_TAG_LENGTH} characters` };
  }

  return { valid: true };
}
