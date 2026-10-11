import { GeoCoordinates, RouteResult, RoutingProvider } from "./routing.types";
import { StraightLineProvider } from "./straight-line.provider";

interface RateLimitTracker {
  minuteWindowStart: number;
  minuteRequests: number;
  dayWindowStart: number;
  dayRequests: number;
}

const tracker: RateLimitTracker = {
  minuteWindowStart: Date.now(),
  minuteRequests: 0,
  dayWindowStart: Date.now(),
  dayRequests: 0,
};

const MAX_PER_MINUTE = 30;
const MAX_PER_DAY = 1800;

function checkAndConsumeRateLimit(): boolean {
  const now = Date.now();

  // Reset 1-minute window
  if (now - tracker.minuteWindowStart >= 60000) {
    tracker.minuteWindowStart = now;
    tracker.minuteRequests = 0;
  }

  // Reset 24-hour window
  if (now - tracker.dayWindowStart >= 86400000) {
    tracker.dayWindowStart = now;
    tracker.dayRequests = 0;
  }

  if (tracker.minuteRequests >= MAX_PER_MINUTE || tracker.dayRequests >= MAX_PER_DAY) {
    return false;
  }

  tracker.minuteRequests++;
  tracker.dayRequests++;
  return true;
}

export class OpenRouteServiceProvider implements RoutingProvider {
  private fallback = new StraightLineProvider();

  async calculateRoute(from: GeoCoordinates, to: GeoCoordinates): Promise<RouteResult> {
    const apiKey = process.env.ORS_API_KEY;
    if (!apiKey) {
      return this.fallback.calculateRoute(from, to);
    }

    if (!checkAndConsumeRateLimit()) {
      console.warn("[ORS] Global rate limit reached (max 30/min or 1800/day). Falling back to straight-line.");
      return this.fallback.calculateRoute(from, to);
    }

    const profile = process.env.ORS_PROFILE || "driving-car";
    const url = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: apiKey,
        },
        body: JSON.stringify({
          coordinates: [
            [from.lng, from.lat],
            [to.lng, to.lat],
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        console.warn(`[ORS] Request failed with status ${res.status}. Falling back to straight-line.`);
        return this.fallback.calculateRoute(from, to);
      }

      const data = await res.json();
      const feature = data.features?.[0];
      if (!feature || !feature.geometry?.coordinates) {
        console.warn("[ORS] Invalid GeoJSON response. Falling back to straight-line.");
        return this.fallback.calculateRoute(from, to);
      }

      const summary = feature.properties?.summary || {};
      const distanceM = Math.round(summary.distance ?? 0);
      const durationS = Math.round(summary.duration ?? 60);

      return {
        geometry: {
          type: "LineString",
          coordinates: feature.geometry.coordinates,
        },
        distance_m: distanceM,
        duration_s: durationS,
        source: "ors",
        isApproximate: false,
      };
    } catch (err: any) {
      console.warn(`[ORS] Error calling directions API: ${err.message}. Falling back to straight-line.`);
      return this.fallback.calculateRoute(from, to);
    }
  }
}
