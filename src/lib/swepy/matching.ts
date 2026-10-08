/* ── Pure matching module ──
 * No UI, no storage, no side effects. Fully unit-testable.
 */

import { CONFIG } from "./config";
import type { OnlineHelper, LatLng } from "./types";

const R_EARTH_M = 6_371_000;

/** Haversine distance in meters between two lat/lng points. */
export function haversine(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R_EARTH_M * Math.asin(Math.sqrt(h));
}

/** Pick helpers within `radiusM` meters of `center`. Returns sorted by distance. */
export function pickHelpersInRadius(
  helpers: OnlineHelper[],
  center: LatLng,
  radiusM: number,
): (OnlineHelper & { distance_m: number })[] {
  return helpers
    .map(h => ({ ...h, distance_m: haversine(center, { lat: h.lat, lng: h.lng }) }))
    .filter(h => h.distance_m <= radiusM)
    .sort((a, b) => a.distance_m - b.distance_m);
}

/** Compute ETA in minutes from straight-line distance in meters. */
export function computeEta(distanceM: number): number {
  const roadKm = (distanceM / 1000) * CONFIG.ETA_ROAD_FACTOR;
  const hours = roadKm / CONFIG.ETA_SPEED_KMH;
  return Math.max(1, Math.round(hours * 60));
}

/** Generate a random numeric OTP of CONFIG.OTP_LENGTH digits. */
export function generateOtp(): string {
  const min = Math.pow(10, CONFIG.OTP_LENGTH - 1);
  const max = Math.pow(10, CONFIG.OTP_LENGTH) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

/** Format distance for display. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Format ETA for display. */
export function formatEta(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  return `${minutes} min`;
}
