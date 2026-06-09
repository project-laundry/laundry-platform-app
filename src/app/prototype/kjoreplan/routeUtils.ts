// ─────────────────────────────────────────────────────────────────────────────
// Route helpers — PURE functions, no React, no I/O.
//
// These are written to survive into the real cleaner dashboard unchanged. Only
// the data source (mockData.ts) gets swapped for a DB query. `optimizeRoute` is a
// nearest-neighbour heuristic standing in for the Google Routes API; the
// `buildGoogleMapsUrl` deep link is already production-real (no API key needed).
// ─────────────────────────────────────────────────────────────────────────────

export interface Coord {
  latitude: number;
  longitude: number;
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

/**
 * Order the stops into a route using a nearest-neighbour heuristic, starting
 * from `start`. Good enough to demo an "optimized" route; the real version can
 * swap this for the Google Routes API (waypoint optimization) for true optima.
 */
export function optimizeRoute<T extends Coord>(start: Coord, stops: T[]): T[] {
  const remaining = [...stops];
  const ordered: T[] = [];
  let current: Coord = start;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i]);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIndex = i;
      }
    }
    const [next] = remaining.splice(nearestIndex, 1);
    ordered.push(next);
    current = next;
  }

  return ordered;
}

export interface RouteEstimate {
  km: number;
  minutes: number;
}

/**
 * Rough total distance + drive time for the ordered route. Assumes ~28 km/h
 * average urban speed plus ~4 min dwell per stop. Mock-grade — replaced by the
 * Routes API's real duration/distance in production.
 */
export function estimateRoute(start: Coord, ordered: Coord[]): RouteEstimate {
  let km = 0;
  let prev: Coord = start;
  for (const stop of ordered) {
    km += haversineKm(prev, stop);
    prev = stop;
  }
  const driveMinutes = (km / 28) * 60;
  const dwellMinutes = ordered.length * 4;
  return { km, minutes: Math.round(driveMinutes + dwellMinutes) };
}

const AVG_SPEED_KMH = 28; // rough urban average
const DWELL_MINUTES = 4; // time spent at each stop

export interface StopSchedule {
  legKm: number; // distance from the previous point (start or prior stop)
  arrivalMinutes: number; // estimated arrival as minutes-of-day
}

/**
 * Planned arrival time + leg distance for each stop, in route order. This is the
 * day's plan based on the optimized order — a realistic schedule, not a live ETA.
 */
export function computeSchedule(
  start: Coord,
  ordered: Coord[],
  startMinutes: number
): StopSchedule[] {
  const schedule: StopSchedule[] = [];
  let prev: Coord = start;
  let clock = startMinutes;

  for (const stop of ordered) {
    const legKm = haversineKm(prev, stop);
    clock += (legKm / AVG_SPEED_KMH) * 60;
    schedule.push({ legKm, arrivalMinutes: Math.round(clock) });
    clock += DWELL_MINUTES;
    prev = stop;
  }

  return schedule;
}

/** Format minutes-of-day as HH:MM (24h, Norwegian style). */
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.round(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

const coordParam = (c: Coord) => `${c.latitude},${c.longitude}`;

// Google Maps' directions URL supports at most 9 intermediate waypoints between
// origin and destination. A single day's route stays well under that; the real
// version should split into multiple links (or batch) if a route ever exceeds it.
const MAX_WAYPOINTS = 9;

/**
 * Build a Google Maps directions deep link for the full multi-stop route.
 * Opens the Google Maps app on mobile (web on desktop) with origin, ordered
 * waypoints, and destination preloaded. This is REAL — works from the prototype.
 */
export function buildGoogleMapsUrl(start: Coord, ordered: Coord[]): string {
  const params = new URLSearchParams({
    api: '1',
    travelmode: 'driving',
    origin: coordParam(start),
  });

  if (ordered.length > 0) {
    const destination = ordered[ordered.length - 1];
    const waypoints = ordered.slice(0, -1).slice(0, MAX_WAYPOINTS);
    params.set('destination', coordParam(destination));
    if (waypoints.length > 0) {
      params.set('waypoints', waypoints.map(coordParam).join('|'));
    }
  } else {
    params.set('destination', coordParam(start));
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
