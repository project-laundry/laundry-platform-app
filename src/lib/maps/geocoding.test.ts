import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { geocodeAddress, validateAddress } from './geocoding';

const ADDRESS = {
  street: 'Storgata 12',
  postal_code: '5003',
  city: 'Bergen',
  country: 'Norway',
};

describe('geocodeAddress', () => {
  const originalKey = process.env.GOOGLE_MAPS_API_KEY;

  beforeEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = originalKey;
    vi.restoreAllMocks();
  });

  it('returns coordinates from a successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'OK',
          results: [{ geometry: { location: { lat: 60.39299, lng: 5.32415 } } }],
        }),
      })
    );

    const result = await geocodeAddress(ADDRESS);

    expect(result).toEqual({ latitude: 60.39299, longitude: 5.32415 });
  });

  it('omits the service-area city from the query (postal code resolves the poststed)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: [{ geometry: { location: { lat: 60.29, lng: 5.34 } } }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    // 5238 is "Rådal" but we store the service area "Bergen" — it must not leak into the query.
    await geocodeAddress({ street: 'Steintrælia 16', postal_code: '5238', city: 'Bergen', country: 'Norway' });

    const requestedUrl = fetchMock.mock.calls[0][0] as string;
    const query = decodeURIComponent(requestedUrl);
    expect(query).toContain('Steintrælia 16, 5238, Norway');
    expect(query).not.toContain('Bergen');
  });

  it('returns null when the API key is not configured', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await geocodeAddress(ADDRESS);

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null when the address cannot be resolved (ZERO_RESULTS)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ZERO_RESULTS', results: [] }),
      })
    );

    const result = await geocodeAddress(ADDRESS);

    expect(result).toBeNull();
  });

  it('returns null on a non-OK HTTP response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    );

    const result = await geocodeAddress(ADDRESS);

    expect(result).toBeNull();
  });

  it('returns null when the request throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const result = await geocodeAddress(ADDRESS);

    expect(result).toBeNull();
  });
});

describe('validateAddress', () => {
  const originalKey = process.env.GOOGLE_MAPS_API_KEY;

  beforeEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = originalKey;
    vi.restoreAllMocks();
  });

  const mockResponse = (body: unknown) =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => body }));

  it('accepts a precise (ROOFTOP) address and returns coordinates', async () => {
    mockResponse({
      status: 'OK',
      results: [
        {
          partial_match: false,
          geometry: { location: { lat: 60.39299, lng: 5.32415 }, location_type: 'ROOFTOP' },
        },
      ],
    });

    const result = await validateAddress(ADDRESS);

    expect(result.valid).toBe(true);
    expect(result.coordinates).toEqual({ latitude: 60.39299, longitude: 5.32415 });
  });

  it('rejects an address with no results (not_found)', async () => {
    mockResponse({ status: 'ZERO_RESULTS', results: [] });

    const result = await validateAddress(ADDRESS);

    expect(result).toEqual({ valid: false, reason: 'not_found' });
  });

  it('rejects an APPROXIMATE match as imprecise', async () => {
    mockResponse({
      status: 'OK',
      results: [
        {
          partial_match: false,
          geometry: { location: { lat: 60.39, lng: 5.32 }, location_type: 'APPROXIMATE' },
        },
      ],
    });

    const result = await validateAddress(ADDRESS);

    expect(result).toEqual({ valid: false, reason: 'imprecise' });
  });

  it('rejects a partial_match as imprecise', async () => {
    mockResponse({
      status: 'OK',
      results: [
        {
          partial_match: true,
          geometry: { location: { lat: 60.39, lng: 5.32 }, location_type: 'ROOFTOP' },
        },
      ],
    });

    const result = await validateAddress(ADDRESS);

    expect(result).toEqual({ valid: false, reason: 'imprecise' });
  });

  it('fails open (skipped) when the API key is not configured', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await validateAddress(ADDRESS);

    expect(result).toEqual({ valid: true, skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails open (skipped) on a transient request error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const result = await validateAddress(ADDRESS);

    expect(result).toEqual({ valid: true, skipped: true });
  });
});
