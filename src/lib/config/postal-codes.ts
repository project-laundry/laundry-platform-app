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
 * The cities that are open for new orders and new cleaners. The first version
 * launches in Bergen only: Oslo is built (ranges above, cleaner matching, the
 * 'Bergen' | 'Oslo' types) but not offered, so an Oslo postal code is answered
 * as "outside the service area" everywhere — order flow, address edits,
 * cleaner onboarding and settings. To open Oslo, add it here; every check and
 * every "vi er i …" sentence follows (serviceAreaText).
 */
export const OFFERED_CITIES: readonly SupportedCity[] = ['Bergen'];

/** The offered cities as running text: 'Bergen', 'Bergen og Oslo', 'Bergen eller Oslo'. */
export function serviceAreaText(joiner: 'og' | 'eller' = 'og'): string {
  if (OFFERED_CITIES.length <= 1) return OFFERED_CITIES.join('');
  return `${OFFERED_CITIES.slice(0, -1).join(', ')} ${joiner} ${OFFERED_CITIES[OFFERED_CITIES.length - 1]}`;
}

/**
 * Get city from postal code, or null if not in an offered service area.
 * Handles Norwegian postal codes (4 digits, may have leading zeros).
 */
export function getCityFromPostalCode(postalCode: string): SupportedCity | null {
  const numericCode = parseInt(postalCode, 10);
  if (isNaN(numericCode)) return null;

  for (const city of OFFERED_CITIES) {
    for (const range of POSTAL_CODE_RANGES[city]) {
      if (numericCode >= range.start && numericCode <= range.end) {
        return city;
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
