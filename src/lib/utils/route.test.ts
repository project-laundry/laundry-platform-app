import { describe, it, expect } from 'vitest';
import {
  haversineKm,
  optimizeStops,
  computeLegKm,
  estimateRouteKm,
  buildGoogleMapsUrl,
  buildSingleDestinationUrl,
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
