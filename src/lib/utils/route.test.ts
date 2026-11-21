import { describe, it, expect } from 'vitest';
import {
  haversineKm,
  optimizeStops,
  computeLegKm,
  estimateRouteKm,
  buildGoogleMapsUrl,
  buildSingleDestinationUrl,
  optimizeRoundTrip,
  buildRoundTripUrl,
  MAX_ROUTE_STOPS,
  type Coord,
  type RoutableStop,
} from './route';

const START: Coord = { latitude: 60.0, longitude: 5.0 };

function stop(
  id: string,
  latitude: number | null,
  longitude: number | null,
  dependsOn: string[] = []
): RoutableStop {
  return { id, latitude, longitude, dependsOn };
}

describe('haversineKm', () => {
  it('is zero for identical points', () => {
    expect(haversineKm(START, START)).toBe(0);
  });

  it('is ~111 km per degree of latitude', () => {
    const oneDegNorth: Coord = { latitude: 61.0, longitude: 5.0 };
    const km = haversineKm(START, oneDegNorth);
    expect(km).toBeGreaterThan(110);
    expect(km).toBeLessThan(112);
  });
});

describe('optimizeStops', () => {
  it('orders unconstrained stops by proximity', () => {
    const far = stop('far', 60.5, 5.0);
    const near = stop('near', 60.05, 5.0);
    const mid = stop('mid', 60.2, 5.0);

    const ordered = optimizeStops(START, [far, near, mid]);
    expect(ordered.map((s) => s.id)).toEqual(['near', 'mid', 'far']);
  });

  it('never places a stop before its dependency, even when it is nearer', () => {
    // dropoff is closest to start but depends on the far pickup
    const dropoff = stop('dropoff', 60.01, 5.0, ['pickup']);
    const pickup = stop('pickup', 60.4, 5.0);

    const ordered = optimizeStops(START, [dropoff, pickup]);
    expect(ordered.map((s) => s.id)).toEqual(['pickup', 'dropoff']);
  });

  it('treats dependencies outside the stop set as satisfied', () => {
    const delivery = stop('delivery', 60.05, 5.0, ['collect:gone']);
    const ordered = optimizeStops(START, [delivery]);
    expect(ordered.map((s) => s.id)).toEqual(['delivery']);
  });

  it('defers stops without coordinates until no located stop is eligible', () => {
    const located = stop('located', 60.3, 5.0);
    const coordless = stop('coordless', null, null);

    const ordered = optimizeStops(START, [coordless, located]);
    expect(ordered.map((s) => s.id)).toEqual(['located', 'coordless']);
  });

  it('returns every stop exactly once', () => {
    const stops = [
      stop('a', 60.1, 5.0),
      stop('b', null, null),
      stop('c', 60.2, 5.1, ['a']),
      stop('d', 60.05, 5.2, ['b']),
    ];
    const ordered = optimizeStops(START, stops);
    expect(ordered.map((s) => s.id).sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('computeLegKm / estimateRouteKm', () => {
  it('returns null legs for coordless stops and skips them in the total', () => {
    const ordered = [stop('a', 60.1, 5.0), stop('b', null, null), stop('c', 60.2, 5.0)];
    const legs = computeLegKm(START, ordered);

    expect(legs).toHaveLength(3);
    expect(legs[0]).not.toBeNull();
    expect(legs[1]).toBeNull();
    // Leg to c is measured from a (the previous located point)
    expect(legs[2]).toBeCloseTo(haversineKm({ latitude: 60.1, longitude: 5.0 }, { latitude: 60.2, longitude: 5.0 }), 5);

    const total = estimateRouteKm(START, ordered);
    expect(total).toBeCloseTo((legs[0] ?? 0) + (legs[2] ?? 0), 5);
  });
});

describe('buildGoogleMapsUrl', () => {
  it('returns null when no stop has coordinates', () => {
    expect(buildGoogleMapsUrl(START, [stop('a', null, null)])).toBeNull();
  });

  it('builds origin, waypoints and destination from located stops only', () => {
    const url = buildGoogleMapsUrl(START, [
      stop('a', 60.1, 5.1),
      stop('b', null, null),
      stop('c', 60.2, 5.2),
    ]);
    expect(url).not.toBeNull();
    const params = new URL(url!).searchParams;
    expect(params.get('origin')).toBe('60,5');
    expect(params.get('destination')).toBe('60.2,5.2');
    expect(params.get('waypoints')).toBe('60.1,5.1');
  });

  it('caps intermediate waypoints at 9', () => {
    const many = Array.from({ length: 15 }, (_, i) => stop(`s${i}`, 60 + i * 0.01, 5.0));
    const url = buildGoogleMapsUrl(START, many);
    const waypoints = new URL(url!).searchParams.get('waypoints')!;
    expect(waypoints.split('|')).toHaveLength(9);
  });
});

describe('buildSingleDestinationUrl', () => {
  it('links to the destination', () => {
    const url = buildSingleDestinationUrl({ latitude: 60.39, longitude: 5.32 });
    expect(new URL(url).searchParams.get('destination')).toBe('60.39,5.32');
  });
});

describe('optimizeRoundTrip', () => {
  const home = { latitude: 59.9, longitude: 10.7 };
  const stop = (id: string, latitude: number | null, longitude: number | null) => ({
    id,
    latitude,
    longitude,
  });

  it('visits stops along a line in order instead of zig-zagging', () => {
    const stops = [stop('far', 59.9, 10.9), stop('near', 59.9, 10.75), stop('mid', 59.9, 10.8)];
    const ids = optimizeRoundTrip(home, stops).map((s) => s.id);
    // Out-and-back along a line: either direction has the same length.
    expect([['near', 'mid', 'far'], ['far', 'mid', 'near']]).toContainEqual(ids);
  });

  it('beats nearest-neighbour when the closest stop is a detour', () => {
    // Nearest-neighbour from home goes east first (a), then must cross back
    // west for b and c; the shortest loop sweeps one side then the other.
    const stops = [stop('a', 59.9, 10.71), stop('b', 59.9, 10.68), stop('c', 59.9, 10.6)];
    const ordered = optimizeRoundTrip(home, stops);
    const loopKm = (route: typeof stops) =>
      estimateRouteKm(home, [...route, { latitude: home.latitude, longitude: home.longitude }]);
    for (const other of [
      [stops[0], stops[1], stops[2]],
      [stops[0], stops[2], stops[1]],
      [stops[1], stops[0], stops[2]],
    ]) {
      expect(loopKm(ordered)).toBeLessThanOrEqual(loopKm(other) + 1e-9);
    }
  });

  it('puts stops without coordinates last, in input order', () => {
    const stops = [stop('x', null, null), stop('a', 59.9, 10.8), stop('y', null, null)];
    expect(optimizeRoundTrip(home, stops).map((s) => s.id)).toEqual(['a', 'x', 'y']);
  });

  it('falls back to nearest-neighbour above the exhaustive limit and keeps every stop', () => {
    const stops = Array.from({ length: 10 }, (_, i) => stop(String(i), 59.9, 10.7 + (10 - i) * 0.01));
    const ids = optimizeRoundTrip(home, stops).map((s) => s.id);
    expect(ids).toEqual(['9', '8', '7', '6', '5', '4', '3', '2', '1', '0']);
  });

  it('returns an empty list for no stops', () => {
    expect(optimizeRoundTrip(home, [])).toEqual([]);
  });
});

describe('buildRoundTripUrl', () => {
  it('starts and ends at home with the stops as waypoints, in order', () => {
    const url = new URL(buildRoundTripUrl('59.9,10.7', ['59.91,10.71', 'Storgata 22, 0184 Oslo'])!);
    expect(url.searchParams.get('origin')).toBe('59.9,10.7');
    expect(url.searchParams.get('destination')).toBe('59.9,10.7');
    expect(url.searchParams.get('waypoints')).toBe('59.91,10.71|Storgata 22, 0184 Oslo');
  });

  it('carries at most MAX_ROUTE_STOPS stops', () => {
    const stops = Array.from({ length: 12 }, (_, i) => `59.9,10.${i}`);
    const url = new URL(buildRoundTripUrl('home', stops)!);
    expect(url.searchParams.get('waypoints')!.split('|')).toHaveLength(MAX_ROUTE_STOPS);
  });

  it('returns null without stops', () => {
    expect(buildRoundTripUrl('home', [])).toBeNull();
  });
});
