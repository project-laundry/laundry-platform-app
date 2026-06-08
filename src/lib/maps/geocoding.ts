// Google Maps Geocoding (server-side only)
//
// Converts a text address into latitude/longitude using the Google Geocoding API.
// Geocoding happens once at the source (checkout, address edit, cleaner onboarding)
// and the coordinates are stored on the order/cleaner rows. The cleaner route
// optimization (Phase 2) reads those coordinates without geocoding again.
//
// The same endpoint also backs address validation (validateAddress), which gates
// the customer address step so typo'd / non-existent streets can't enter the system.

import { getGoogleMapsApiKey } from './config';

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface AddressInput {
  street: string;
  postal_code: string;
  city: string;
  country: string;
}

/** Shape of the fields we read from a Geocoding API result. */
interface GeocodeResult {
  partial_match?: boolean;
  geometry?: {
    location?: { lat: number; lng: number };
    location_type?: string;
  };
}

interface GeocodeResponse {
  status: string;
  results?: GeocodeResult[];
}

/**
 * Format a structured address into a single query string for the Geocoding API.
 *
 * The `city` we store is the service area ("Bergen"/"Oslo") used for cleaner
 * matching, not the real postal place (poststed) — e.g. postal code 5238 is
 * "Rådal", not "Bergen". Feeding that service-area city to Google contradicts
 * the postal code and degrades results (wrong coordinates, false partial_match
 * rejections). For Norwegian addresses, street + postal code + country is
 * unambiguous, so we deliberately omit the city here.
 */
function formatAddress(address: AddressInput): string {
  return [address.street, address.postal_code, address.country]
    .filter(Boolean)
    .join(', ');
}

/**
 * Call the Geocoding API for an address.
 * @returns the parsed response, `'unconfigured'` when no API key is set,
 *          or `null` on an empty address / HTTP / network error.
 */
async function callGeocodingApi(
  address: AddressInput
): Promise<GeocodeResponse | 'unconfigured' | null> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    console.warn('[Geocoding] GOOGLE_MAPS_API_KEY not configured, skipping geocoding');
    return 'unconfigured';
  }

  const formatted = formatAddress(address);
  if (!formatted) {
    return null;
  }

  const url = `${GEOCODE_URL}?address=${encodeURIComponent(formatted)}&key=${apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[Geocoding] HTTP ${response.status} for "${formatted}"`);
      return null;
    }

    return (await response.json()) as GeocodeResponse;
  } catch (error) {
    console.error(`[Geocoding] Request failed for "${formatted}":`, error);
    return null;
  }
}

/**
 * Geocode a structured address into coordinates.
 *
 * Never throws: returns null when Maps is not configured, the address can't be
 * resolved, or the request fails. Callers should treat null as "save the address
 * without coordinates" and degrade gracefully.
 */
export async function geocodeAddress(address: AddressInput): Promise<Coordinates | null> {
  const response = await callGeocodingApi(address);

  if (response === 'unconfigured' || response === null) {
    return null;
  }

  if (response.status !== 'OK' || !response.results?.length) {
    console.warn(`[Geocoding] No result for "${formatAddress(address)}" (status: ${response.status})`);
    return null;
  }

  const location = response.results[0].geometry?.location;
  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    console.warn(`[Geocoding] Missing location in result for "${formatAddress(address)}"`);
    return null;
  }

  return { latitude: location.lat, longitude: location.lng };
}

export type AddressValidationReason = 'not_found' | 'imprecise';

export interface AddressValidationResult {
  valid: boolean;
  /** Why validation failed (only set when valid is false). */
  reason?: AddressValidationReason;
  /** Coordinates of the validated address (set when valid and located). */
  coordinates?: Coordinates;
  /** True when validation was skipped (no API key / transient error) and the address was allowed through. */
  skipped?: boolean;
}

/**
 * Validate that a user-typed address resolves to a precise, real location.
 *
 * Fails open: if Maps is unconfigured or the request errors, returns
 * `{ valid: true, skipped: true }` so a missing key or transient outage never
 * blocks a customer. Only definitive negative signals from Google block:
 *   - ZERO_RESULTS / no results            -> not_found
 *   - partial_match or APPROXIMATE result  -> imprecise (street couldn't be pinned)
 */
export async function validateAddress(address: AddressInput): Promise<AddressValidationResult> {
  const response = await callGeocodingApi(address);

  // Fail open on misconfiguration or transient errors.
  if (response === 'unconfigured' || response === null) {
    return { valid: true, skipped: true };
  }

  if (response.status === 'ZERO_RESULTS' || !response.results?.length) {
    return { valid: false, reason: 'not_found' };
  }

  if (response.status !== 'OK') {
    // Unexpected status (e.g. OVER_QUERY_LIMIT, REQUEST_DENIED) — fail open.
    console.warn(`[Geocoding] Unexpected validation status "${response.status}" for "${formatAddress(address)}"`);
    return { valid: true, skipped: true };
  }

  const top = response.results[0];
  const locationType = top.geometry?.location_type;

  // partial_match or an APPROXIMATE match means Google fell back to a broader
  // area rather than the exact street — treat as not precise enough for pickup.
  if (top.partial_match || locationType === 'APPROXIMATE') {
    return { valid: false, reason: 'imprecise' };
  }

  const location = top.geometry?.location;
  const coordinates =
    location && typeof location.lat === 'number' && typeof location.lng === 'number'
      ? { latitude: location.lat, longitude: location.lng }
      : undefined;

  return { valid: true, coordinates };
}
