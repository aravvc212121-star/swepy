export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface RouteGeometry {
  type: "LineString";
  coordinates: [number, number][]; // [longitude, latitude]
}

export interface RouteResult {
  geometry: RouteGeometry;
  distance_m: number;
  duration_s: number;
  source: "ors" | "straight_line";
  isApproximate?: boolean;
}

export interface RoutingProvider {
  calculateRoute(
    from: GeoCoordinates,
    to: GeoCoordinates
  ): Promise<RouteResult>;
}
