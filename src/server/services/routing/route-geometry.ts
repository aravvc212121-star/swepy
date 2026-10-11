import { GeoCoordinates } from "./routing.types";
import { haversineDistanceMeters } from "./straight-line.provider";

/** Compute minimum distance from a point to a line segment in meters */
export function distanceToSegmentMeters(
  p: GeoCoordinates,
  a: GeoCoordinates,
  b: GeoCoordinates
): number {
  const dAB = haversineDistanceMeters(a, b);
  if (dAB < 1e-6) return haversineDistanceMeters(p, a);

  // Project p onto line segment AB in flat approximation (valid for short distances)
  const dAP = haversineDistanceMeters(a, p);
  const dBP = haversineDistanceMeters(b, p);

  // Cosine rule or simple projection
  const cosA = (dAP * dAP + dAB * dAB - dBP * dBP) / (2 * dAP * dAB);
  if (cosA <= 0) return dAP;
  const proj = dAP * cosA;
  if (proj >= dAB) return dBP;

  return Math.sqrt(Math.max(0, dAP * dAP - proj * proj));
}

/** Compute minimum distance from a point to a GeoJSON LineString coordinates array */
export function distanceToRouteLineMeters(
  point: GeoCoordinates,
  coordinates: [number, number][]
): number {
  if (coordinates.length === 0) return Infinity;
  if (coordinates.length === 1) {
    return haversineDistanceMeters(point, {
      lat: coordinates[0][1],
      lng: coordinates[0][0],
    });
  }

  let minDistance = Infinity;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const a: GeoCoordinates = { lat: coordinates[i][1], lng: coordinates[i][0] };
    const b: GeoCoordinates = { lat: coordinates[i + 1][1], lng: coordinates[i + 1][0] };
    const dist = distanceToSegmentMeters(point, a, b);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  return minDistance;
}
