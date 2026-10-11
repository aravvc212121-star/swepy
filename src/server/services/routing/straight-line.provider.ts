import { GeoCoordinates, RouteResult, RoutingProvider } from "./routing.types";

/** Compute haversine distance in meters */
export function haversineDistanceMeters(a: GeoCoordinates, b: GeoCoordinates): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const x =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng *
      sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

export class StraightLineProvider implements RoutingProvider {
  async calculateRoute(from: GeoCoordinates, to: GeoCoordinates): Promise<RouteResult> {
    const rawDistM = haversineDistanceMeters(from, to);
    // Estimated road distance with 1.35x winding factor
    const distanceM = Math.round(rawDistM * 1.35);

    // Average speed in km/h (default 15 km/h)
    const avgSpeedKmh = Number(process.env.AVG_SPEED_KMH) || 15;
    const speedMps = (avgSpeedKmh * 1000) / 3600;

    // Minimum 1 minute (60 seconds)
    const durationSeconds = Math.max(60, Math.round(distanceM / speedMps));

    return {
      geometry: {
        type: "LineString",
        coordinates: [
          [from.lng, from.lat],
          [to.lng, to.lat],
        ],
      },
      distance_m: distanceM,
      duration_s: durationSeconds,
      source: "straight_line",
      isApproximate: true,
    };
  }
}
