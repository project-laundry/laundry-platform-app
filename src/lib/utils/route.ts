// Route helpers for the driver dashboard and the cleaner's pickup round —
// PURE functions, no React, no I/O.
// Extended with:
//  - stops that may lack coordinates (geocoding can fail; they are deferred)
//  - precedence constraints (a cleaner drop-off can't precede its pickups)

export interface Coord {
  latitude: number;
  longitude: number;
}

export interface RoutableStop {
  id: string;
  latitude: number | null;
  longitude: number | null;
  // Stop ids that must come earlier in the route. Ids not present in the stop
  // set are treated as already satisfied.
  dependsOn: string[];
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two coordinates, in kilometres. */
export function haversineKm(a: Coord, b: Coord): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

const hasCoords = (s: { latitude: number | null; longitude: number | null }): boolean =>
  s.latitude !== null && s.longitude !== null;

/**
 * Order stops with a nearest-neighbour heuristic from `start`, honouring
 * `dependsOn` (a stop only becomes eligible once its prerequisites are
 * placed). Stops without coordinates are deferred until no located stop is
 * eligible, then emitted in input order.
 */
export function optimizeStops<T extends RoutableStop>(start: Coord, stops: T[]): T[] {
  const allIds = new Set(stops.map((s) => s.id));
  const remaining = [...stops];
  const ordered: T[] = [];
  const placed = new Set<string>();
  let current: Coord = start;

  while (remaining.length > 0) {
    const eligible = remaining.filter((s) =>
      s.dependsOn.every((dep) => placed.has(dep) || !allIds.has(dep))
    );
    // Guard against a malformed dependency cycle stalling the loop (cannot
    // happen with pickup→dropoff / collect→delivery deps, but never hang).
    const pool = eligible.length > 0 ? eligible : remaining;

    const located = pool.filter(hasCoords);
    let next: T = pool[0];
    if (located.length > 0) {
      let best = Infinity;
      for (const s of located) {
        const d = haversineKm(current, { latitude: s.latitude!, longitude: s.longitude! });
        if (d < best) {
          best = d;
          next = s;
        }
      }
    }

    remaining.splice(remaining.indexOf(next), 1);
    ordered.push(next);
    placed.add(next.id);
    if (hasCoords(next)) {
      current = { latitude: next.latitude!, longitude: next.longitude! };
    }
  }

  return ordered;
}

/**
 * Distance of each leg in km, in route order. `null` for stops without
 * coordinates; the previous located point carries over past them.
 */
export function computeLegKm(
  start: Coord,
  ordered: Array<{ latitude: number | null; longitude: number | null }>
): Array<number | null> {
  const legs: Array<number | null> = [];
  let prev: Coord = start;
  for (const stop of ordered) {
    if (!hasCoords(stop)) {
      legs.push(null);
      continue;
    }
    const coord = { latitude: stop.latitude!, longitude: stop.longitude! };
    legs.push(haversineKm(prev, coord));
    prev = coord;
  }
  return legs;
}

/** Rough total route distance in km (stops without coordinates are skipped). */
export function estimateRouteKm(
  start: Coord,
  ordered: Array<{ latitude: number | null; longitude: number | null }>
): number {
  let km = 0;
  let prev: Coord = start;
  for (const stop of ordered) {
    if (!hasCoords(stop)) continue;
    const coord = { latitude: stop.latitude!, longitude: stop.longitude! };
    km += haversineKm(prev, coord);
    prev = coord;
  }
  return km;
}

const coordParam = (c: Coord) => `${c.latitude},${c.longitude}`;

// Google Maps' directions URL supports at most 9 intermediate waypoints
// between origin and destination.
const MAX_WAYPOINTS = 9;

/**
 * Google Maps directions deep link for the located stops of the route
 * (origin, ordered waypoints, destination). Returns null when no stop has
 * coordinates.
 */
export function buildGoogleMapsUrl(
  start: Coord,
  ordered: Array<{ latitude: number | null; longitude: number | null }>
): string | null {
  const located: Coord[] = ordered
    .filter(hasCoords)
    .map((s) => ({ latitude: s.latitude!, longitude: s.longitude! }));
  if (located.length === 0) return null;

  const params = new URLSearchParams({
    api: '1',
    travelmode: 'driving',
    origin: coordParam(start),
  });
  const destination = located[located.length - 1];
  const waypoints = located.slice(0, -1).slice(0, MAX_WAYPOINTS);
  params.set('destination', coordParam(destination));
  if (waypoints.length > 0) {
    params.set('waypoints', waypoints.map(coordParam).join('|'));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Single-destination Google Maps link for navigating to one stop. */
export function buildSingleDestinationUrl(dest: Coord): string {
  const params = new URLSearchParams({
    api: '1',
    travelmode: 'driving',
    destination: coordParam(dest),
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

// Above this many located stops the exhaustive search (n! orders) is replaced
// by nearest-neighbour. 8 stops = 40 320 orders, instant.
const MAX_EXHAUSTIVE_STOPS = 8;

/**
 * Order stops for the shortest round trip that starts and ends at `home`
 * (straight-line distance — a good proxy inside one city, not road distance).
 * Exact up to MAX_EXHAUSTIVE_STOPS located stops, nearest-neighbour beyond.
 * Stops without coordinates come last, in input order.
 */
export function optimizeRoundTrip<
  T extends { latitude: number | null; longitude: number | null },
>(home: Coord, stops: T[]): T[] {
  const located = stops.filter(hasCoords);
  const unlocated = stops.filter((s) => !hasCoords(s));
  const coordOf = (s: T): Coord => ({ latitude: s.latitude!, longitude: s.longitude! });

  if (located.length > MAX_EXHAUSTIVE_STOPS) {
    const byId = optimizeStops(
      home,
      located.map((s, i) => ({ id: String(i), latitude: s.latitude, longitude: s.longitude, dependsOn: [] }))
    );
    return [...byId.map((s) => located[Number(s.id)]), ...unlocated];
  }

  let best: T[] = located;
  let bestKm = Infinity;
  const visit = (route: T[], rest: T[], km: number, at: Coord) => {
    if (km >= bestKm) return;
    if (rest.length === 0) {
      const total = km + haversineKm(at, home);
      if (total < bestKm) {
        bestKm = total;
        best = route;
      }
      return;
    }
    for (const next of rest) {
      const coord = coordOf(next);
      visit([...route, next], rest.filter((s) => s !== next), km + haversineKm(at, coord), coord);
    }
  };
  visit([], located, 0, home);

  return [...best, ...unlocated];
}

/**
 * Google Maps directions deep link for a round trip: `home` → each stop in the
 * given order → `home`. Every place is a "lat,lng" pair or a street address —
 * Google resolves both. Only the first MAX_WAYPOINTS stops fit in one link.
 * Returns null without stops.
 */
export function buildRoundTripUrl(home: string, stops: string[]): string | null {
  if (stops.length === 0) return null;
  const params = new URLSearchParams({
    api: '1',
    travelmode: 'driving',
    origin: home,
    destination: home,
    waypoints: stops.slice(0, MAX_WAYPOINTS).join('|'),
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Most stops one Google Maps directions link can carry. */
export const MAX_ROUTE_STOPS = MAX_WAYPOINTS;
