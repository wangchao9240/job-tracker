/**
 * Source Detection
 * Server-only module for detecting job posting source from URL.
 * DO NOT import this file in Client Components.
 */

/**
 * Supported job sources
 */
export const JOB_SOURCES = ["seek", "linkedin", "company", "unknown"];

/**
 * Detect job source from URL
 * @param {string} url - The job URL to analyze
 * @returns {string} One of: seek, linkedin, company, unknown
 */
export function detectSource(url) {
  if (!url || typeof url !== "string") {
    return "unknown";
  }

  let parsedUrl;
  try {
    // Handle URLs without protocol
    const urlWithProtocol = url.startsWith("http") ? url : `https://${url}`;
    parsedUrl = new URL(urlWithProtocol);
  } catch {
    return "unknown";
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Seek detection: seek.com.au or any seek.com.* domain
  if (hostname.includes("seek.com")) {
    return "seek";
  }

  // LinkedIn detection: linkedin.com/jobs
  if (hostname.includes("linkedin.com") && parsedUrl.pathname.includes("/jobs")) {
    return "linkedin";
  }

  // Valid URL with a host but not a known job board -> company career page
  if (hostname && hostname.length > 0) {
    return "company";
  }

  return "unknown";
}

/**
 * Validate and normalize a URL
 * @param {string} url - The URL to validate
 * @returns {{ valid: boolean, normalized: string | null, error: string | null }}
 */
export function validateUrl(url) {
  if (!url || typeof url !== "string") {
    return { valid: false, normalized: null, error: "URL is required" };
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return { valid: false, normalized: null, error: "URL is required" };
  }

  try {
    // Add protocol if missing
    const urlWithProtocol = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const parsed = new URL(urlWithProtocol);

    // Must have a valid hostname
    if (!parsed.hostname || parsed.hostname.length === 0) {
      return { valid: false, normalized: null, error: "Invalid URL" };
    }

    return { valid: true, normalized: parsed.href, error: null };
  } catch {
    return { valid: false, normalized: null, error: "Invalid URL format" };
  }
}
