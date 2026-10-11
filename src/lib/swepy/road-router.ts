/**
 * Free road routing provider using Open Source Routing Machine (OSRM)
 * Based on OpenStreetMap road networks. Returns exact road geometry LineString.
 */

export interface RoadRouteData {
  coordinates: [number, number][]; // [lng, lat][]
  distanceM: number;
  durationS: number;
  source: "osrm" | "straight_line";
}

const routeCache = new Map<string, RoadRouteData>();

export async function fetchRoadRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<RoadRouteData> {
  // If points are virtually identical (< 5 meters), return single-segment
  const dLat = Math.abs(from.lat - to.lat);
  const dLng = Math.abs(from.lng - to.lng);
  if (dLat < 0.00005 && dLng < 0.00005) {
    return {
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat],
      ],
      distanceM: 0,
      durationS: 0,
      source: "straight_line",
    };
  }

  const cacheKey = `${from.lat.toFixed(4)},${from.lng.toFixed(4)}->${to.lat.toFixed(4)},${to.lng.toFixed(4)}`;
  const cached = routeCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Primary: OSRM public router
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const route = data.routes?.[0];
      if (route?.geometry?.coordinates && route.geometry.coordinates.length > 1) {
        const result: RoadRouteData = {
          coordinates: route.geometry.coordinates,
          distanceM: Math.round(route.distance ?? 0),
          durationS: Math.round(route.duration ?? 60),
          source: "osrm",
        };
        routeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err: any) {
    // Try secondary OSM routed-car mirror
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const mirrorUrl = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
      const mirrorRes = await fetch(mirrorUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (mirrorRes.ok) {
        const mirrorData = await mirrorRes.json();
        const mirrorRoute = mirrorData.routes?.[0];
        if (mirrorRoute?.geometry?.coordinates && mirrorRoute.geometry.coordinates.length > 1) {
          const result: RoadRouteData = {
            coordinates: mirrorRoute.geometry.coordinates,
            distanceM: Math.round(mirrorRoute.distance ?? 0),
            durationS: Math.round(mirrorRoute.duration ?? 60),
            source: "osrm",
          };
          routeCache.set(cacheKey, result);
          return result;
        }
      }
    } catch {
      // Ignore fallback error
    }
  }

  // Fallback: straight line
  return {
    coordinates: [
      [from.lng, from.lat],
      [to.lng, to.lat],
    ],
    distanceM: Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 111000 * 1.35),
    durationS: Math.max(60, Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 111000 * 1.35 / 5.5)),
    source: "straight_line",
  };
}
