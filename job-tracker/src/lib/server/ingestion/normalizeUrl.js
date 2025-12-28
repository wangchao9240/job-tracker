/**
 * URL Normalization for Duplicate Detection
 * Server-only module for canonicalizing URLs for comparison.
 * DO NOT import this file in Client Components.
 */

/**
 * Normalize a URL for duplicate comparison
 * - Trims whitespace
 * - Adds protocol if missing
 * - Lower-cases the hostname
 * - Removes fragment (#...)
 * - Removes trailing slash from pathname
 * - Keeps query params (they often identify specific job postings)
 *
 * @param {string} url - The URL to normalize
 * @returns {string | null} Canonical URL string or null if invalid
 */
export function normalizeUrl(url) {
  if (!url || typeof url !== "string") {
    return null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  try {
    // Add protocol if missing
    const urlWithProtocol = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const parsed = new URL(urlWithProtocol);

    // Must have a valid hostname
    if (!parsed.hostname || parsed.hostname.length === 0) {
      return null;
    }

    // Build canonical URL:
    // - Always use https:// for consistency (http and https should match)
    // - Hostname (lowercase, remove www. subdomain)
    // - Port (if non-standard)
    // - Pathname (remove trailing slash unless it's just "/")
    // - Search params (sorted alphabetically for consistent comparison)
    // - No fragment

    // Normalize hostname: lowercase and remove www. subdomain
    let hostname = parsed.hostname.toLowerCase();
    if (hostname.startsWith("www.")) {
      hostname = hostname.slice(4);
    }

    let canonical = `https://${hostname}`;

    // Add port if non-standard
    if (parsed.port) {
      canonical += `:${parsed.port}`;
    }

    // Add pathname, removing trailing slash unless it's the root
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    canonical += pathname;

    // Sort query parameters alphabetically for consistent comparison
    if (parsed.search) {
      const params = new URLSearchParams(parsed.search);
      const sortedParams = new URLSearchParams(
        Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]))
      );
      const sortedSearch = sortedParams.toString();
      if (sortedSearch) {
        canonical += `?${sortedSearch}`;
      }
    }

    // No fragment - intentionally omitted

    return canonical;
  } catch {
    return null;
  }
}

/**
 * Normalize company name for comparison
 * - Trims whitespace
 * - Lower-cases
 * - Collapses multiple spaces
 *
 * @param {string} company - Company name
 * @returns {string | null} Normalized company name or null if empty
 */
export function normalizeCompany(company) {
  if (!company || typeof company !== "string") {
    return null;
  }

  const normalized = company.trim().toLowerCase().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

/**
 * Normalize role name for comparison
 * - Trims whitespace
 * - Lower-cases
 * - Collapses multiple spaces
 *
 * @param {string} role - Role name
 * @returns {string | null} Normalized role name or null if empty
 */
export function normalizeRole(role) {
  if (!role || typeof role !== "string") {
    return null;
  }

  const normalized = role.trim().toLowerCase().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}
