/**
 * Text Normalization Helpers
 * Server-only module for normalizing extracted text.
 * DO NOT import this file in Client Components.
 */

/**
 * Trim and collapse whitespace
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
export function normalizeText(text) {
  if (!text || typeof text !== "string") {
    return "";
  }
  return text
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Normalize text and return null if empty
 * @param {string} text - Text to normalize
 * @returns {string | null} Normalized text or null if empty
 */
export function normalizeOrNull(text) {
  const normalized = normalizeText(text);
  return normalized.length > 0 ? normalized : null;
}

/**
 * Extract text content from HTML (improved)
 * @param {string} html - HTML content
 * @returns {string} Plain text content
 */
export function htmlToText(html) {
  if (!html || typeof html !== "string") {
    return "";
  }

  return html
    // Remove script and style tags with content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    // Replace list items with bullet prefix and newline
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/li>/gi, "")
    // Replace block elements with double newlines (preserve paragraphs)
    .replace(/<\/(p|div|h[1-6]|article|section)>/gi, "\n\n")
    .replace(/<(p|div|h[1-6]|article|section)[^>]*>/gi, "")
    // Replace br and tr with single newline
    .replace(/<br[^>]*>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    // Remove remaining HTML tags
    .replace(/<[^>]+>/g, "")
    // Decode common HTML entities (basic set)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    // Decode additional common entities
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&bull;/gi, "•")
    .replace(/&hellip;/gi, "...")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
    .replace(/&middot;/gi, "·")
    .replace(/&deg;/gi, "°")
    .replace(/&copy;/gi, "©")
    .replace(/&reg;/gi, "®")
    .replace(/&trade;/gi, "™")
    // Decode numeric entities (e.g., &#8217;)
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    // Collapse multiple consecutive spaces but preserve newlines
    .replace(/ +/g, " ")
    // Collapse 3+ newlines to 2 newlines (preserve paragraph breaks)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Truncate text to max length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncate(text, maxLength) {
  if (!text || typeof text !== "string") {
    return "";
  }
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + "...";
}
