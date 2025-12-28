/**
 * Application Status Utility
 * Shared by UI and server for status validation rules.
 */

/**
 * Available application statuses
 */
export const APPLICATION_STATUSES = [
  "draft",
  "applied",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
];

/**
 * Status labels for display
 */
export const STATUS_LABELS = {
  draft: "Draft",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

/**
 * Available application sources
 */
export const APPLICATION_SOURCES = [
  "unknown",
  "seek",
  "linkedin",
  "company",
];

/**
 * Source labels for display
 */
export const SOURCE_LABELS = {
  unknown: "Unknown",
  seek: "Seek",
  linkedin: "LinkedIn",
  company: "Company Website",
};

/**
 * Determines if the given status requires an applied date.
 * Only "draft" status does not require an applied date.
 * All other statuses (applied, interview, offer, rejected, withdrawn) require it.
 *
 * @param {string} status - The application status
 * @returns {boolean} - True if applied date is required
 */
export function requiresAppliedDate(status) {
  return status !== "draft";
}

/**
 * Validates if the status value is a valid application status.
 *
 * @param {string} status - The status to validate
 * @returns {boolean} - True if valid
 */
export function isValidStatus(status) {
  return APPLICATION_STATUSES.includes(status);
}
