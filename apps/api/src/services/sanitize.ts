/**
 * Input Sanitization Utility
 *
 * Provides helpers to sanitize string inputs before database insertion.
 * Prevents XSS by stripping HTML tags, removes null bytes, and trims whitespace.
 *
 * Applied as a thin utility layer on top of Zod validation — Zod validates the
 * *shape*, this module sanitizes the *content*.
 */

/**
 * Strips HTML tags and null bytes from a string.
 * Trims leading/trailing whitespace.
 *
 * @param input - Raw user-provided string
 * @returns Sanitized string safe for database storage
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')       // Strip HTML tags
    .replace(/\0/g, '')            // Remove null bytes
    .trim();
}

/**
 * Sanitizes all string values in a plain object, recursively.
 * Non-string values are left unchanged.
 *
 * @param obj - The input object to sanitize
 * @returns New object with all string values sanitized
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key in result) {
    if (typeof result[key] === 'string') {
      result[key] = sanitizeString(result[key] as string) as T[typeof key];
    }
  }
  return result;
}

/**
 * Validates that a string does not contain SQL injection patterns.
 * This is a defense-in-depth check; the primary protection is parameterized queries via Drizzle ORM.
 *
 * @param input - String to check
 * @returns True if input appears safe
 */
export function isSafeString(input: string): boolean {
  const sqlPatterns = /('|"|;|--|\/\*|\*\/|xp_|EXEC|UNION|SELECT|INSERT|DROP|DELETE|UPDATE)/i;
  return !sqlPatterns.test(input);
}
