/**
 * Canonical geo utilities — ONE source of truth for all distance calculations.
 * Uses {lat, lng} internally. Convert to/from GeoJSON [lng, lat] only at edges.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const R_EARTH_M = 6_371_000;

/** Haversine distance in meters between two {lat, lng} points. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R_EARTH_M * Math.asin(Math.sqrt(h));
}

/** Returns true if lat/lng are within valid geographic range and not (0,0). */
export function isValidCoord(lat: number, lng: number): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (!isFinite(lat) || !isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  // Reject (0,0) — null island
  if (lat === 0 && lng === 0) return false;
  return true;
}

/** Returns true if the speed implied by moving distM in timeDeltaMs is plausible (<= maxMps). */
export function isReasonableSpeed(
  distM: number,
  timeDeltaMs: number,
  maxMps: number = 50,
): boolean {
  if (timeDeltaMs <= 0) return false;
  const mps = distM / (timeDeltaMs / 1000);
  return mps <= maxMps;
}

/**
 * Returns true if the distance is within the combined accuracy bubble.
 * When both devices' accuracy circles overlap, the distance is meaningless.
 * Minimum combined accuracy is 25m per spec.
 */
export function isAtLocation(
  distM: number,
  accuracyA: number,
  accuracyB: number,
  minCombined: number = 25,
): boolean {
  const combined = Math.max(accuracyA + accuracyB, minCombined);
  return distM <= combined;
}

/**
 * Compute a detour-adjusted distance from straight-line haversine.
 * Factor of ~1.35 approximates road winding in Indian cities.
 */
export function roadAdjustedDistanceM(straightLineM: number, factor: number = 1.35): number {
  return Math.round(straightLineM * factor);
}

/**
 * Compute ETA in minutes from distance in meters.
 * Uses provided speed or defaults to 15 km/h (urban India).
 */
export function etaMinutes(distanceM: number, speedKmh: number = 15): number {
  const speedMps = (speedKmh * 1000) / 3600;
  return Math.max(1, Math.round(distanceM / speedMps / 60));
}

/** Convert GeoJSON [lng, lat] to {lat, lng}. */
export function fromGeoJSON(coord: [number, number]): LatLng {
  return { lat: coord[1], lng: coord[0] };
}

/** Convert {lat, lng} to GeoJSON [lng, lat]. */
export function toGeoJSON(point: LatLng): [number, number] {
  return [point.lng, point.lat];
}

/**
 * Canonical ETA estimate function: Haversine distance x 1.35 (road detour factor) divided by SPEED_KMPH (default 18).
 * Kept behind this single function so a real road-routing provider can be swapped in later without touching dispatch logic.
 */
export function estimateEtaMinutes(
  helperLocation: LatLng,
  userLocation: LatLng,
  speedKmph: number = 18,
  detourFactor: number = 1.35,
): number {
  if (!isValidCoord(helperLocation.lat, helperLocation.lng) || !isValidCoord(userLocation.lat, userLocation.lng)) {
    return 1;
  }
  const straightLineM = haversineMeters(helperLocation, userLocation);
  const roadKm = (straightLineM / 1000) * detourFactor;
  const hours = roadKm / speedKmph;
  return Math.max(1, Math.round(hours * 60));
}
