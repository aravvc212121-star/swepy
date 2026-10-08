"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type GeoState = {
  status: "idle" | "requesting" | "granted" | "denied" | "error";
  lat: number | null;
  lng: number | null;
  address: string | null;
  pincode: string | null;
};

type GeoActions = {
  requestLocation: () => void;
};

const STORAGE_KEY = "swepy_geo";

function loadGeo(): GeoState {
  if (typeof window === "undefined") return { status: "idle", lat: null, lng: null, address: null, pincode: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as GeoState;
  } catch { /* ignore */ }
  return { status: "idle", lat: null, lng: null, address: null, pincode: null };
}

function saveGeo(state: GeoState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

const GeoContext = createContext<(GeoState & GeoActions) | null>(null);

async function reverseGeocode(lat: number, lng: number): Promise<{ address: string; pincode: string | null }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (data?.address) {
      const a = data.address;
      const parts = [
        a.road || a.neighbourhood || a.hamlet || "",
        a.suburb || a.village || a.town || "",
        a.city || a.state_district || a.county || "",
      ].filter(Boolean);
      return { address: parts.join(", "), pincode: a.postcode || null };
    }
    return { address: data?.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`, pincode: null };
  } catch {
    return { address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, pincode: null };
  }
}

export function GeoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GeoState>(() => loadGeo());

  useEffect(() => {
    if (state.status !== "idle") saveGeo(state);
  }, [state]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((p) => ({ ...p, status: "error" }));
      return;
    }
    setState((p) => ({ ...p, status: "requesting" }));

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const { address, pincode } = await reverseGeocode(lat, lng);
        setState({ status: "granted", lat, lng, address, pincode });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState((p) => ({ ...p, status: "denied" }));
        } else {
          setState((p) => ({ ...p, status: "error" }));
        }
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, []);

  return (
    <GeoContext.Provider value={{ ...state, requestLocation }}>
      {children}
    </GeoContext.Provider>
  );
}

export function useGeo() {
  const ctx = useContext(GeoContext);
  if (!ctx) throw new Error("useGeo must be used within GeoProvider");
  return ctx;
}
