/**
 * User-friendly messages for low-signal detection reasons
 * Shared utility for both client and server code
 */

/**
 * Convert reason codes to user-friendly messages
 * @param {string[]} reasons - Array of reason codes
 * @returns {string[]} User-friendly message array
 */
export function reasonsToMessages(reasons) {
  const messageMap = {
    too_long:
      "The job description is very long and may contain boilerplate or irrelevant content.",
    too_short:
      "The job description is quite short and may lack specific details.",
    too_many_items:
      "A large number of responsibilities were extracted, making it harder to focus.",
    repetitive:
      "The job description contains repetitive content which may reduce clarity.",
  };

  return reasons.map((reason) => messageMap[reason] || reason);
}
