"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSwepy } from "@/lib/swepy/provider";
import { getSession } from "@/lib/swepy/session";
import { CONFIG, haversine, computeEta, formatDistance, formatEta } from "@/lib/swepy";
import type { RealtimeEvent, OnlineHelper } from "@/lib/swepy";
import HelperBottomNav from "@/components/helper-bottom-nav";
import { IconMapPin } from "@/components/icons";

function formatINR(n: number) { return "₹" + n.toLocaleString("en-IN"); }

interface IncomingRequest {
  booking_id: string;
  service_name: string;
  home_size: string;
  price: number;
  distance_km: number;
  area_label: string;
  user_lat: number;
  user_lng: number;
  received_at: number;
}

export default function HelperRequestsPage() {
  const { transport, store } = useSwepy();
  const session = getSession();
  const [isOnline, setIsOnline] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [myLat, setMyLat] = useState(28.6139);
  const [myLng, setMyLng] = useState(77.2090);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [locality, setLocality] = useState<string | null>(null);
  const [pincode, setPincode] = useState<string | null>(null);
  const [stateName, setStateName] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<string | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<number | null>(null);
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});

  // Request geolocation when going online
  useEffect(() => {
    if (!isOnline) {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      return;
    }
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setMyLat(pos.coords.latitude);
        setMyLng(pos.coords.longitude);
        setGeoLoading(false);
        setGeoError(null);
      },
      (err) => {
        setGeoError(err.code === 1 ? "Location permission denied" : "Could not get location");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
    };
  }, [isOnline]);

  // Reverse geocode when position changes
  useEffect(() => {
    if (!isOnline || geoLoading) return;
    let cancelled = false;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${myLat}&lon=${myLng}&zoom=18&addressdetails=1`,
          { headers: { "Accept-Language": "en" }, signal: controller.signal }
        );
        const data = await res.json();
        if (!cancelled && data?.address) {
          const a = data.address;
          setLocality(
            a.suburb || a.neighbourhood || a.village || a.town || a.city_district || a.city || "Unknown area"
          );
          setPincode(a.postcode || null);
          setStateName(a.state || a.county || null);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; controller.abort(); };
  }, [isOnline, geoLoading, myLat, myLng]);

  // Ping location when online
  useEffect(() => {
    if (!isOnline || !session) return;
    const ping = () => {
      transport.send({
        type: "helper_location",
        helper_id: session.user_id,
        lat: myLat, lng: myLng,
        ts: Date.now(), sender: session.user_id,
      });
    };

    // Send online event
    transport.send({
      type: "helper_online",
      helper_id: session.user_id,
      name: session.name,
      lat: myLat, lng: myLng,
      ts: Date.now(), sender: session.user_id,
    });

    ping();
    const interval = setInterval(ping, CONFIG.LOCATION_PING_S * 1000);
    pingRef.current = interval;

    return () => {
      clearInterval(interval);
      transport.send({
        type: "helper_offline",
        helper_id: session.user_id,
        ts: Date.now(), sender: session.user_id,
      });
    };
  }, [isOnline, myLat, myLng, session, transport]);

  // Listen for booking events
  useEffect(() => {
    if (!session) return;
    const unsub = transport.subscribe((event: RealtimeEvent) => {
      if (event.sender === session.user_id) return;

      if (event.type === "booking_new") {
        const dist = haversine({ lat: myLat, lng: myLng }, { lat: event.user_lat, lng: event.user_lng });
        setRequests(prev => {
          if (prev.some(r => r.booking_id === event.booking_id)) return prev;
          return [...prev, {
            booking_id: event.booking_id,
            service_name: event.service_name,
            home_size: event.home_size,
            price: event.price,
            distance_km: dist / 1000,
            area_label: event.area_label,
            user_lat: event.user_lat,
            user_lng: event.user_lng,
            received_at: Date.now(),
          }];
        });
      }

      if (event.type === "booking_assigned") {
        if (event.helper_id === session.user_id) {
          setAccepted(event.booking_id);
        }
        // Remove request if taken by someone else
        setRequests(prev => prev.filter(r => r.booking_id !== event.booking_id));
      }

      if (event.type === "booking_cancel") {
        setRequests(prev => prev.filter(r => r.booking_id !== event.booking_id));
      }
    });
    return unsub;
  }, [session, transport, myLat, myLng]);

  // Countdown timers for each request
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCountdowns(prev => {
        const next: Record<string, number> = {};
        requests.forEach(r => {
          const elapsed = (now - r.received_at) / 1000;
          next[r.booking_id] = Math.max(0, CONFIG.STEP_TIMEOUT_S - Math.floor(elapsed));
        });
        return next;
      });
      // Remove expired requests
      setRequests(prev => prev.filter(r => (Date.now() - r.received_at) / 1000 < CONFIG.STEP_TIMEOUT_S));
    }, 1000);
    return () => clearInterval(interval);
  }, [requests]);

  const handleAccept = useCallback((req: IncomingRequest) => {
    if (!session) return;
    transport.send({
      type: "booking_accept",
      booking_id: req.booking_id,
      helper_id: session.user_id,
      helper_name: session.name,
      lat: myLat, lng: myLng,
      ts: Date.now(), sender: session.user_id,
    });
  }, [session, transport, myLat, myLng]);

  const handleDecline = useCallback((bookingId: string) => {
    setRequests(prev => prev.filter(r => r.booking_id !== bookingId));
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!session || session.role !== "helper") {
    return (
      <div className="w-full max-w-[430px] mx-auto min-h-dvh flex items-center justify-center bg-app-bg px-4">
        <p className="text-[14px] text-ink-muted text-center">
          Please go to <a href="/demo" className="underline" style={{ color: "var(--brand-rose)" }}>/demo</a> and pick "Helper" first.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-[430px] mx-auto min-h-dvh bg-app-bg" style={{ paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}>
        {/* Header */}
        <div className="px-4" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[20px] font-medium text-ink">{session.name}</p>
              <p className="text-[13px] text-ink-muted">Helper</p>
            </div>
            {/* Online toggle */}
            <button type="button" onClick={() => setIsOnline(!isOnline)}
              role="switch" aria-checked={isOnline} data-pressable=""
              className="h-9 px-4 rounded-[10px] text-[13px] font-medium no-select"
              style={{
                backgroundColor: isOnline ? "var(--sage-soft)" : "var(--surface)",
                color: isOnline ? "var(--sage-text)" : "var(--ink-muted)",
                border: `1px solid ${isOnline ? "var(--sage)" : "var(--surface-border)"}`,
              }}>
              {isOnline ? "● Online" : "○ Offline"}
            </button>
          </div>
        </div>

        {/* Location status */}
        {isOnline && (
          <div className="mx-4 mb-4 rounded-[14px] p-3" style={{
            backgroundColor: geoError ? "var(--amber-soft)" : "var(--teal-soft)",
            border: `0.5px solid ${geoError ? "var(--amber-border)" : "var(--teal)"}`,
          }}>
            {geoLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--teal)", borderTopColor: "transparent" }} />
                <p className="text-[13px] font-medium" style={{ color: "var(--teal-dark)" }}>Getting your location...</p>
              </div>
            ) : geoError ? (
              <p className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>⚠️ {geoError}</p>
            ) : (
              <div>
                <p className="text-[14px] font-medium mb-0.5" style={{ color: "var(--teal-dark)" }}>
                  📍 {locality || "Detecting area..."}
                </p>
                <p className="text-[12px]" style={{ color: "var(--teal-dark)", opacity: 0.8 }}>
                  {[pincode, stateName].filter(Boolean).join(" · ") || ""}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="px-4">
          {/* Real map */}
          <div className="rounded-[14px] overflow-hidden mb-4 relative" style={{ height: 180, border: "0.5px solid var(--surface-border)" }}>
            <iframe
              title="Your location"
              style={{
                border: 0,
                display: "block",
                pointerEvents: "none",
                width: "100%",
                height: "calc(100% + 40px)",
                marginTop: "-20px",
              }}
              loading="eager"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${myLng - 0.006}%2C${myLat - 0.004}%2C${myLng + 0.006}%2C${myLat + 0.004}&layer=mapnik&marker=${myLat}%2C${myLng}`}
            />
            {/* Location label overlay */}
            <div className="absolute bottom-2 left-3 right-3 flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{ backgroundColor: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
              <span className="text-[11px] font-medium truncate" style={{ color: "var(--ink)" }}>
                📍 {locality || `${myLat.toFixed(4)}, ${myLng.toFixed(4)}`}
              </span>
            </div>
          </div>

          {/* Requests */}
          {!isOnline ? (
            <div className="text-center py-12">
              <p className="text-[14px] text-ink-muted">Go online to receive requests</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[14px] text-ink-muted">You are online, waiting for requests</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {requests.map(req => (
                <div key={req.booking_id} className="rounded-[14px] p-4" style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}>
                  {/* Badge + countdown */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-[8px] text-[11px] font-medium"
                      style={{ backgroundColor: "var(--amber-soft)", color: "var(--ink)", border: "0.5px solid var(--amber-border)" }}>
                      New request
                    </span>
                    <span className="text-[12px] font-medium" style={{ color: "var(--amber)" }}>
                      {countdowns[req.booking_id] ?? CONFIG.STEP_TIMEOUT_S}s
                    </span>
                  </div>

                  {/* Countdown bar */}
                  <div className="h-1 rounded-full mb-3 overflow-hidden" style={{ backgroundColor: "var(--step-inactive)" }}>
                    <div className="h-full rounded-full transition-all" style={{
                      backgroundColor: "var(--amber)",
                      width: `${((countdowns[req.booking_id] ?? CONFIG.STEP_TIMEOUT_S) / CONFIG.STEP_TIMEOUT_S) * 100}%`,
                    }} />
                  </div>

                  {/* Details */}
                  <p className="text-[15px] font-medium text-ink">{req.service_name} · {req.home_size}</p>
                  <div className="flex items-center gap-1.5 mt-1 mb-3">
                    <IconMapPin size={14} style={{ color: "var(--teal)" }} />
                    <span className="text-[12px] text-ink-muted">{req.area_label} · {req.distance_km.toFixed(1)} km, ~{computeEta(req.distance_km * 1000)} min</span>
                  </div>

                  {/* Price + actions */}
                  <div className="flex items-center justify-between">
                    <p className="text-[16px] font-medium" style={{ color: "var(--sage-text)" }}>You earn {formatINR(req.price)}</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleDecline(req.booking_id)} data-pressable=""
                        className="h-10 px-5 rounded-[12px] text-[14px] font-medium no-select"
                        style={{ border: "1px solid var(--surface-border)", color: "var(--ink)" }}>
                        Decline
                      </button>
                      <button type="button" onClick={() => handleAccept(req)} data-pressable=""
                        className="h-10 px-5 rounded-[12px] text-[14px] font-medium text-white no-select"
                        style={{ backgroundColor: "var(--brand-rose)" }}>
                        Accept
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <HelperBottomNav />
    </>
  );
}
