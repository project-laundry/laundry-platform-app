/**
 * Postal code to city mapping for NooraCare service areas.
 * Used to derive city from customer's postal code during checkout.
 */

export const POSTAL_CODE_RANGES = {
  Oslo: [{ start: 1, end: 1299 }],
  Bergen: [
    { start: 5000, end: 5399 },
    { start: 5802, end: 5899 },
  ],
} as const;

export type SupportedCity = keyof typeof POSTAL_CODE_RANGES;

/**
 * Get city from postal code, or null if not in service area.
 * Handles Norwegian postal codes (4 digits, may have leading zeros).
 */
export function getCityFromPostalCode(postalCode: string): SupportedCity | null {
  const numericCode = parseInt(postalCode, 10);
  if (isNaN(numericCode)) return null;

  for (const [city, ranges] of Object.entries(POSTAL_CODE_RANGES)) {
    for (const range of ranges) {
      if (numericCode >= range.start && numericCode <= range.end) {
        return city as SupportedCity;
      }
    }
  }

  return null;
}

/**
 * Check if postal code is in any service area.
 */
export function isPostalCodeInServiceArea(postalCode: string): boolean {
  return getCityFromPostalCode(postalCode) !== null;
}

/**
 * Validate postal code format (exactly 4 digits).
 */
export function isValidPostalCodeFormat(postalCode: string): boolean {
  return /^\d{4}$/.test(postalCode);
}
