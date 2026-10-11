"use client";

import { useEffect, useRef, useState } from "react";
import { IconMapPin, IconPlus, IconMinus } from "@/components/icons";
import { HELPER_TOKENS } from "@/lib/helper-theme";

interface HelperMapCardProps {
  lat: number;
  lng: number;
  areaLabel: string;
  isLoading?: boolean;
}

interface MapLibreMap {
  on: (event: string, callback: (e?: unknown) => void) => void;
  setStyle: (style: string) => void;
  easeTo: (options: { center: [number, number]; duration?: number }) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  remove: () => void;
}

interface MapLibreMarker {
  setLngLat: (coords: [number, number]) => MapLibreMarker;
  addTo: (map: MapLibreMap) => MapLibreMarker;
}

interface MapLibreNamespace {
  Map: new (options: {
    container: HTMLElement;
    style: string;
    center: [number, number];
    zoom: number;
    cooperativeGestures?: boolean;
    attributionControl?: boolean;
  }) => MapLibreMap;
  Marker: new (options: { element: HTMLElement }) => MapLibreMarker;
}

declare global {
  interface Window {
    maplibregl?: MapLibreNamespace;
  }
}

export default function HelperMapCard({
  lat,
  lng,
  areaLabel,
  isLoading = false,
}: HelperMapCardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<MapLibreMarker | null>(null);
  const initialCoordsRef = useRef<[number, number]>([lng, lat]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  // Load MapLibre GL script & stylesheet
  useEffect(() => {
    let isCancelled = false;

    const loadMapLibre = async () => {
      if (typeof window === "undefined") return;

      if (!document.getElementById("maplibre-css")) {
        const link = document.createElement("link");
        link.id = "maplibre-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";
        document.head.appendChild(link);
      }

      if (!window.maplibregl) {
        if (!document.getElementById("maplibre-js")) {
          const script = document.createElement("script");
          script.id = "maplibre-js";
          script.src = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
          script.async = true;
          document.head.appendChild(script);

          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load maplibre"));
          }).catch(() => {
            if (!isCancelled) setUseFallback(true);
          });
        } else {
          // Wait if script tag already exists
          let retries = 0;
          while (!window.maplibregl && retries < 40) {
            await new Promise((r) => setTimeout(r, 100));
            retries++;
          }
          if (!window.maplibregl && !isCancelled) {
            setUseFallback(true);
            return;
          }
        }
      }

      if (isCancelled || !containerRef.current || !window.maplibregl) return;

      try {
        const [initLng, initLat] = initialCoordsRef.current;
        const map = new window.maplibregl.Map({
          container: containerRef.current,
          style: "https://tiles.openfreemap.org/styles/positron",
          center: [initLng, initLat],
          zoom: 14,
          cooperativeGestures: true,
          attributionControl: false,
        });

        map.on("error", (e: unknown) => {
          const errObj = e as { error?: { message?: string }; sourceId?: string } | undefined;
          if (errObj?.error?.message?.includes("positron") || errObj?.sourceId) {
            try {
              map.setStyle("https://tiles.openfreemap.org/styles/bright");
            } catch {
              setUseFallback(true);
            }
          }
        });

        // Custom marker: 18px brand dot with 3px white border and 54px translucent halo
        const haloEl = document.createElement("div");
        haloEl.style.width = "54px";
        haloEl.style.height = "54px";
        haloEl.style.borderRadius = "50%";
        haloEl.style.backgroundColor = HELPER_TOKENS.colors.halo;
        haloEl.style.display = "flex";
        haloEl.style.alignItems = "center";
        haloEl.style.justifyContent = "center";
        haloEl.style.pointerEvents = "none";

        const dotEl = document.createElement("div");
        dotEl.style.width = "18px";
        dotEl.style.height = "18px";
        dotEl.style.borderRadius = "50%";
        dotEl.style.backgroundColor = HELPER_TOKENS.colors.brand;
        dotEl.style.border = "3px solid #FFFFFF";
        dotEl.style.boxShadow = "0 2px 6px rgba(42, 31, 36, 0.2)";
        haloEl.appendChild(dotEl);

        const marker = new window.maplibregl.Marker({ element: haloEl })
          .setLngLat([initLng, initLat])
          .addTo(map);

        map.on("load", () => {
          if (!isCancelled) {
            setMapLoaded(true);
          }
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      } catch {
        if (!isCancelled) setUseFallback(true);
      }
    };

    loadMapLibre();

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync coords when lat/lng change
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    }
    if (mapInstanceRef.current && mapLoaded) {
      mapInstanceRef.current.easeTo({ center: [lng, lat], duration: 600 });
    }
  }, [lat, lng, mapLoaded]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  return (
    <div
      className="w-full relative overflow-hidden select-none"
      style={{
        height: "clamp(260px, 38vh, 300px)",
        borderRadius: HELPER_TOKENS.radius.mapCard,
        border: `1px solid ${HELPER_TOKENS.colors.hairline}`,
        backgroundColor: HELPER_TOKENS.colors.innerHairline,
      }}
    >
      {/* SKELETON LOADING STATE */}
      {(!mapLoaded || isLoading) && !useFallback && (
        <div
          className="absolute inset-0 z-[5] flex items-center justify-center animate-pulse"
          style={{ backgroundColor: HELPER_TOKENS.colors.innerHairline }}
          aria-hidden="true"
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: HELPER_TOKENS.colors.blush }}
          >
            <IconMapPin size={22} style={{ color: HELPER_TOKENS.colors.brand }} />
          </div>
        </div>
      )}

      {/* MAPLIBRE GL CANVAS CONTAINER */}
      {!useFallback ? (
        <div ref={containerRef} className="w-full h-full" />
      ) : (
        /* FALLBACK EMBED IF WEBGL / MAPLIBRE FAILS */
        <div className="relative w-full h-full overflow-hidden">
          <iframe
            title="Helper Location Map"
            style={{
              border: 0,
              display: "block",
              width: "100%",
              height: "calc(100% + 40px)",
              marginTop: "-20px",
              pointerEvents: "none",
            }}
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.007}%2C${lat - 0.005}%2C${lng + 0.007}%2C${lat + 0.005}&layer=mapnik`}
          />
          {/* Centered custom marker */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            aria-hidden="true"
          >
            <div
              style={{
                width: "54px",
                height: "54px",
                borderRadius: "50%",
                backgroundColor: HELPER_TOKENS.colors.halo,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  backgroundColor: HELPER_TOKENS.colors.brand,
                  border: "3px solid #FFFFFF",
                  boxShadow: "0 2px 6px rgba(42, 31, 36, 0.2)",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* FLOATING AREA CHIP (TOP-LEFT) */}
      <div
        className="absolute top-3 left-3 z-10 max-w-[calc(100%-88px)] flex items-center gap-1.5 px-3 py-1.5 shadow-sm"
        style={{
          backgroundColor: HELPER_TOKENS.colors.cardBg,
          borderRadius: HELPER_TOKENS.radius.pill,
          border: `1px solid ${HELPER_TOKENS.colors.hairline}`,
        }}
      >
        <IconMapPin size={18} strokeWidth={1.5} style={{ color: HELPER_TOKENS.colors.brand, flexShrink: 0 }} />
        <span
          className="text-[12px] truncate select-text"
          style={{
            fontWeight: 500,
            color: HELPER_TOKENS.colors.ink,
          }}
        >
          {areaLabel || "Hastsal · Delhi 110059"}
        </span>
      </div>

      {/* ZOOM BUTTONS (TOP-RIGHT, NO COMPASS) */}
      <div
        className="absolute top-3 right-3 z-10 flex flex-col gap-1.5"
        role="group"
        aria-label="Map zoom controls"
      >
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Zoom in"
          className="w-9 h-9 flex items-center justify-center outline-none transition-colors duration-200 cursor-pointer shadow-sm active:scale-95"
          style={{
            backgroundColor: HELPER_TOKENS.colors.cardBg,
            borderRadius: HELPER_TOKENS.radius.innerTile,
            border: `1px solid ${HELPER_TOKENS.colors.hairline}`,
            color: HELPER_TOKENS.colors.ink,
          }}
        >
          <IconPlus size={18} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Zoom out"
          className="w-9 h-9 flex items-center justify-center outline-none transition-colors duration-200 cursor-pointer shadow-sm active:scale-95"
          style={{
            backgroundColor: HELPER_TOKENS.colors.cardBg,
            borderRadius: HELPER_TOKENS.radius.innerTile,
            border: `1px solid ${HELPER_TOKENS.colors.hairline}`,
            color: HELPER_TOKENS.colors.ink,
          }}
        >
          <IconMinus size={18} strokeWidth={1.5} />
        </button>
      </div>

      {/* OPENSTREETMAP ATTRIBUTION CHIP (BOTTOM-RIGHT) */}
      <div
        className="absolute bottom-2 right-2 z-10 px-2 py-0.5 rounded-full pointer-events-auto"
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
          className="text-[11px] no-underline hover:underline"
          style={{ color: HELPER_TOKENS.colors.secondary, fontWeight: 400 }}
        >
          © OpenStreetMap
        </a>
      </div>
    </div>
  );
}
