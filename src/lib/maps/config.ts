// Google Maps configuration and validation

/**
 * Get the Google Maps API key (used for Geocoding and, later, Routes).
 * @returns the key, or null if not configured
 */
export function getGoogleMapsApiKey(): string | null {
  return process.env.GOOGLE_MAPS_API_KEY || null;
}

/**
 * Check if Google Maps is configured.
 * @returns true if the API key is set
 */
export function isMapsConfigured(): boolean {
  return Boolean(getGoogleMapsApiKey());
}
