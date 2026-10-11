"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
type MapLibreMap = maplibregl.Map;
type MapLibreMarker = maplibregl.Marker;
import "maplibre-gl/dist/maplibre-gl.css";

// Configure MapLibre worker URL for Next.js bundler compatibility
if (typeof window !== "undefined" && typeof (maplibregl as any).setWorkerUrl === "function") {
  (maplibregl as any).setWorkerUrl("/maplibre-gl-worker.mjs");
}

import { IconMapPin, IconClock, IconNavigation, IconPlus, IconMinus } from "@/components/icons";
import { HELPER_TOKENS } from "@/lib/helper-theme";
import { formatDistance } from "@/lib/utils";

export interface LiveMapProps {
  role: "customer" | "helper";
  destination?: { lat: number; lng: number; label?: string } | null;
  helperPosition?: {
    lat: number;
    lng: number;
    heading_deg?: number | null;
    stale?: boolean;
    accuracy_m?: number;
  } | null;
  route?: {
    geometry: { type: "LineString"; coordinates: [number, number][] };
    distance_m: number;
    duration_s: number;
    source: "ors" | "straight_line";
  } | null;
  status?: string;
  helperInitial?: string;
  areaLabel?: string;
  etaMinutes?: number | null;
  distanceM?: number | null;
  isApproximateEta?: boolean;
  isLocating?: boolean;
  isUnavailable?: boolean;
  lastUpdatedSec?: number | null;
  height?: string;
  onNavigateClick?: () => void;
}

export default function LiveMap({
  role,
  destination,
  helperPosition,
  route,
  status = "assigned",
  helperInitial = "H",
  areaLabel,
  etaMinutes,
  distanceM,
  isApproximateEta = false,
  isLocating = false,
  isUnavailable = false,
  lastUpdatedSec,
  height = "clamp(240px, 38vh, 320px)",
}: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const helperMarkerRef = useRef<MapLibreMarker | null>(null);
  const destMarkerRef = useRef<MapLibreMarker | null>(null);
  const helperMarkerElRef = useRef<HTMLDivElement | null>(null);

  // Position tweening refs
  const currentPosRef = useRef<[number, number] | null>(null);
  const targetPosRef = useRef<[number, number] | null>(null);
  const animStartTimeRef = useRef<number>(0);
  const animStartPosRef = useRef<[number, number] | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Follow mode state
  const [followMode, setFollowMode] = useState<boolean>(true);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);

  // Initialize MapLibre
  useEffect(() => {
    if (!containerRef.current) return;

    const initialCenter: [number, number] = helperPosition
      ? [helperPosition.lng, helperPosition.lat]
      : destination
      ? [destination.lng, destination.lat]
      : [77.209, 28.6139];

    if (typeof (maplibregl as any).setWorkerUrl === "function") {
      (maplibregl as any).setWorkerUrl("/maplibre-gl-worker.mjs");
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: initialCenter,
      zoom: 14,
      attributionControl: false,
    });

    map.on("load", () => {
      setMapLoaded(true);

      // Add route line layers if not present
      if (!map.getSource("route-source")) {
        map.addSource("route-source", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [],
            },
          },
        });

        // 1. White casing line
        map.addLayer({
          id: "route-casing",
          type: "line",
          source: "route-source",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#FFFFFF",
            "line-width": 6,
            "line-opacity": 0.95,
          },
        });

        // 2. Rose route line
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route-source",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#D9507F",
            "line-width": 4,
          },
        });
      }
    });

    // Detect user interactions to pause follow mode
    const handleUserInteraction = () => {
      setFollowMode(false);
    };

    map.on("dragstart", handleUserInteraction);
    map.on("zoomstart", handleUserInteraction);

    mapRef.current = map;

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Route GeoJSON on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const source = map.getSource("route-source") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    let coords: [number, number][] = [];
    let isStraightLine = true;

    if (route?.geometry?.coordinates && route.geometry.coordinates.length > 0) {
      coords = route.geometry.coordinates;
      isStraightLine = route.source === "straight_line";
    } else if (helperPosition && destination) {
      coords = [
        [helperPosition.lng, helperPosition.lat],
        [destination.lng, destination.lat],
      ];
      isStraightLine = true;
    }

    source.setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: coords,
      },
    });

    // Configure dashed style for straight-line mode
    if (map.getLayer("route-line")) {
      if (isStraightLine) {
        map.setPaintProperty("route-line", "line-dasharray", [2, 2]);
      } else {
        map.setPaintProperty("route-line", "line-dasharray", undefined);
      }
    }
  }, [route, helperPosition, destination, mapLoaded]);

  // Destination Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!destination) {
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
      return;
    }

    if (!destMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "dest-marker flex items-center justify-center";
      el.style.width = "36px";
      el.style.height = "36px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = "#FFFFFF";
      el.style.border = "2.5px solid #D9507F";
      el.style.boxShadow = "0 3px 10px rgba(0,0,0,0.2)";
      el.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D9507F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([destination.lng, destination.lat])
        .addTo(map);

      destMarkerRef.current = marker;
    } else {
      destMarkerRef.current.setLngLat([destination.lng, destination.lat]);
    }
  }, [destination]);

  // Helper Marker & Tween Animation
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Hide helper marker if locating or no coordinates
    if (isLocating || !helperPosition) {
      if (helperMarkerRef.current) {
        helperMarkerRef.current.remove();
        helperMarkerRef.current = null;
        helperMarkerElRef.current = null;
      }
      currentPosRef.current = null;
      return;
    }

    const nextLng = helperPosition.lng;
    const nextLat = helperPosition.lat;

    // Create marker DOM element if not existing
    if (!helperMarkerRef.current) {
      const haloEl = document.createElement("div");
      haloEl.className = "helper-marker-halo";
      haloEl.style.width = "54px";
      haloEl.style.height = "54px";
      haloEl.style.borderRadius = "50%";
      haloEl.style.backgroundColor = "rgba(217, 80, 127, 0.18)";
      haloEl.style.display = "flex";
      haloEl.style.alignItems = "center";
      haloEl.style.justifyContent = "center";
      haloEl.style.pointerEvents = "none";
      haloEl.style.transition = "opacity 300ms ease";

      const dotEl = document.createElement("div");
      dotEl.style.width = "22px";
      dotEl.style.height = "22px";
      dotEl.style.borderRadius = "50%";
      dotEl.style.backgroundColor = "#D9507F";
      dotEl.style.border = "3px solid #FFFFFF";
      dotEl.style.boxShadow = "0 2px 8px rgba(42, 31, 36, 0.3)";
      dotEl.style.display = "flex";
      dotEl.style.alignItems = "center";
      dotEl.style.justifyContent = "center";
      dotEl.style.color = "#FFFFFF";
      dotEl.style.fontSize = "11px";
      dotEl.style.fontWeight = "600";
      dotEl.innerText = helperInitial;
      haloEl.appendChild(dotEl);

      const marker = new maplibregl.Marker({ element: haloEl })
        .setLngLat([nextLng, nextLat])
        .addTo(map);

      helperMarkerRef.current = marker;
      helperMarkerElRef.current = haloEl;
      currentPosRef.current = [nextLng, nextLat];
      targetPosRef.current = [nextLng, nextLat];
      return;
    }

    // Update stale opacity
    if (helperMarkerElRef.current) {
      helperMarkerElRef.current.style.opacity = helperPosition.stale ? "0.45" : "1";
    }

    const prevPos = currentPosRef.current || [nextLng, nextLat];
    const dLng = nextLng - prevPos[0];
    const dLat = nextLat - prevPos[1];
    // Approx distance in meters
    const approxDistM = Math.sqrt(dLng * dLng + dLat * dLat) * 111000;

    // Snap without animation if jump is over 500m
    if (approxDistM > 500) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      currentPosRef.current = [nextLng, nextLat];
      targetPosRef.current = [nextLng, nextLat];
      helperMarkerRef.current.setLngLat([nextLng, nextLat]);
      return;
    }

    // Tween smoothly over ~900ms using requestAnimationFrame
    targetPosRef.current = [nextLng, nextLat];
    animStartPosRef.current = prevPos;
    animStartTimeRef.current = performance.now();

    const duration = 900;

    const animate = (now: number) => {
      const elapsed = now - animStartTimeRef.current;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);

      const start = animStartPosRef.current || [nextLng, nextLat];
      const target = targetPosRef.current || [nextLng, nextLat];

      const curLng = start[0] + (target[0] - start[0]) * ease;
      const curLat = start[1] + (target[1] - start[1]) * ease;

      currentPosRef.current = [curLng, curLat];
      if (helperMarkerRef.current) {
        helperMarkerRef.current.setLngLat([curLng, curLat]);
      }

      if (progress < 1) {
        animFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        animFrameIdRef.current = null;
      }
    };

    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
    }
    animFrameIdRef.current = requestAnimationFrame(animate);
  }, [helperPosition, isLocating, helperInitial]);

  // Bounds fitting and follow mode
  const fitToView = useCallback(
    (animate = true) => {
      const map = mapRef.current;
      if (!map) return;

      const points: [number, number][] = [];
      if (helperPosition) points.push([helperPosition.lng, helperPosition.lat]);
      if (destination) points.push([destination.lng, destination.lat]);

      if (points.length === 0) return;

      if (points.length === 1) {
        if (animate) {
          map.easeTo({ center: points[0], zoom: 15, duration: 600 });
        } else {
          map.setCenter(points[0]);
          map.setZoom(15);
        }
        return;
      }

      const bounds = new maplibregl.LngLatBounds(points[0], points[1]);
      map.fitBounds(bounds, {
        padding: 60,
        maxZoom: 16,
        duration: animate ? 600 : 0,
      });
    },
    [helperPosition, destination]
  );

  // Re-fit on follow mode when positions change
  useEffect(() => {
    if (followMode && mapLoaded) {
      fitToView(true);
    }
  }, [followMode, helperPosition?.lat, helperPosition?.lng, destination?.lat, destination?.lng, mapLoaded, fitToView]);

  const handleRecenter = () => {
    setFollowMode(true);
    fitToView(true);
  };

  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
  };

  const isORS = route?.source === "ors";

  return (
    <div
      className="w-full relative overflow-hidden select-none"
      style={{
        height,
        borderRadius: HELPER_TOKENS.radius.mapCard,
        border: `1px solid ${HELPER_TOKENS.colors.hairline}`,
        backgroundColor: "#F2EDE4",
      }}
    >
      {/* MapLibre Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* FLOATING AREA CHIP (IDLE MODE OR TOP-LEFT) */}
      {areaLabel && (
        <div
          className="absolute top-3 left-3 z-10 max-w-[calc(100%-88px)] flex items-center gap-1.5 px-3 py-1.5 shadow-sm"
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: HELPER_TOKENS.radius.pill,
            border: `1px solid ${HELPER_TOKENS.colors.hairline}`,
          }}
        >
          <IconMapPin size={16} strokeWidth={2} style={{ color: "#D9507F", flexShrink: 0 }} />
          <span className="text-[12px] font-medium text-ink truncate select-text">
            {areaLabel}
          </span>
        </div>
      )}

      {/* ETA CHIP (BOTTOM-LEFT / HERO) */}
      {etaMinutes !== undefined && etaMinutes !== null && (
        <div
          className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-full px-3 py-1 shadow-sm"
          style={{
            backgroundColor: "#FFFFFF",
            border: `1px solid ${HELPER_TOKENS.colors.hairline}`,
            fontSize: "12px",
            fontWeight: 500,
            color: HELPER_TOKENS.colors.ink,
          }}
        >
          <IconClock size={14} style={{ color: "#D9507F" }} />
          <span>
            {isApproximateEta ? "~" : ""}
            {etaMinutes} min {distanceM !== undefined && distanceM !== null ? `· ${formatDistance(distanceM / 1000)}` : ""}
          </span>
        </div>
      )}

      {/* RECENTER BUTTON (WHEN FOLLOW MODE PAUSED) */}
      {!followMode && (
        <button
          type="button"
          onClick={handleRecenter}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full shadow-md bg-white text-ink text-[12px] font-medium transition-transform active:scale-95 cursor-pointer"
          style={{ border: `1px solid ${HELPER_TOKENS.colors.hairline}` }}
          aria-label="Recenter map"
        >
          <IconNavigation size={14} style={{ color: "#D9507F" }} />
          Recenter
        </button>
      )}

      {/* ZOOM BUTTONS (TOP-RIGHT) */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5" role="group" aria-label="Zoom controls">
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-9 h-9 flex items-center justify-center rounded-[10px] bg-white text-ink shadow-sm cursor-pointer transition-colors active:scale-95"
          style={{ border: `1px solid ${HELPER_TOKENS.colors.hairline}` }}
          aria-label="Zoom in"
        >
          <IconPlus size={18} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="w-9 h-9 flex items-center justify-center rounded-[10px] bg-white text-ink shadow-sm cursor-pointer transition-colors active:scale-95"
          style={{ border: `1px solid ${HELPER_TOKENS.colors.hairline}` }}
          aria-label="Zoom out"
        >
          <IconMinus size={18} strokeWidth={1.5} />
        </button>
      </div>

      {/* NOTICES: LOCATING / STALE / UNAVAILABLE */}
      {isLocating && (
        <div
          className="absolute top-12 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full text-[12px] font-medium shadow-sm bg-white"
          style={{ color: "#D9507F", border: `1px solid ${HELPER_TOKENS.colors.hairline}` }}
        >
          Locating your helper...
        </div>
      )}

      {!isLocating && helperPosition?.stale && (
        <div
          className="absolute top-12 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full text-[11px] font-medium shadow-sm bg-white/95"
          style={{ color: "#8E8883", border: `1px solid ${HELPER_TOKENS.colors.hairline}` }}
        >
          Updated {lastUpdatedSec ?? 20}s ago
        </div>
      )}

      {isUnavailable && (
        <div
          className="absolute top-12 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full text-[12px] font-medium shadow-sm bg-white"
          style={{ color: "#B3261E", border: `1px solid #B3261E` }}
        >
          Helper&apos;s location is unavailable right now
        </div>
      )}

      {/* ATTRIBUTION CHIP (BOTTOM-RIGHT) */}
      <div
        className="absolute bottom-2 right-2 z-10 px-2 py-0.5 rounded-full pointer-events-auto flex items-center gap-1.5"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.88)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          border: `1px solid ${HELPER_TOKENS.colors.hairline}`,
        }}
      >
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] no-underline hover:underline text-ink-muted"
        >
          © OpenStreetMap
        </a>
        {isORS && (
          <span className="text-[10px] text-ink-muted">
            · Routing © openrouteservice.org
          </span>
        )}
      </div>
    </div>
  );
}
