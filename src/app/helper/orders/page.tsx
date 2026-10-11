"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useSwepy } from "@/lib/swepy/provider";
import { getSession, ensureSession } from "@/lib/swepy/session";
import type { Session } from "@/lib/swepy/types";
import { CONFIG, haversine, computeEta } from "@/lib/swepy";
import type { RealtimeEvent } from "@/lib/swepy";
import { useHelper } from "@/lib/helper-store";
import { useI18n } from "@/lib/i18n";
import HelperBottomNav from "@/components/helper-bottom-nav";
import HelperMapCard from "@/components/helper-map-card";
import { IconMapPin, IconBell } from "@/components/icons";
import { HELPER_TOKENS } from "@/lib/helper-theme";

interface IncomingRequest {
  booking_id: string;
  service_name: string;
  home_size: string;
  price: number;
  notes?: string;
  addons?: string[];
  distance_km: number;
  area_label: string;
  user_lat: number;
  user_lng: number;
  received_at: number;
}

const DEFAULT_HELPER_SESSION: Session = {
  user_id: "hlp_demo",
  name: "Deepa Nair",
  role: "helper",
  phone: "+91 9876543210",
};

let cachedSession: Session | null = null;
function getSessionSnapshot(): Session {
  if (!cachedSession) {
    cachedSession = getSession() ?? ensureSession("helper");
  }
  return cachedSession;
}

function getServerSessionSnapshot(): Session {
  return DEFAULT_HELPER_SESSION;
}

function subscribeSession(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export default function HelperRequestsPage() {
  const router = useRouter();
  const { transport, store } = useSwepy();
  const { profile, isOnline, setOnline } = useHelper();
  const { t, formatCurrency, locale } = useI18n();

  const session = useSyncExternalStore(subscribeSession, getSessionSnapshot, getServerSessionSnapshot);

  const handleToggleOnline = useCallback(() => {
    const next = !isOnline;
    setOnline(next);
    if (!next && session) {
      transport.send({
        type: "helper_offline",
        helper_id: session.user_id,
        ts: Date.now(),
        sender: session.user_id,
      });
    }
  }, [isOnline, setOnline, session, transport]);
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [myLat, setMyLat] = useState(28.6139);
  const [myLng, setMyLng] = useState(77.2090);
  const myLatRef = useRef(28.6139);
  const myLngRef = useRef(77.2090);
  const [geoLoading, setGeoLoading] = useState(false);
  const [locality, setLocality] = useState<string | null>(null);
  const [pincode, setPincode] = useState<string | null>(null);
  const [stateName, setStateName] = useState<string | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<number | null>(null);
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});

  // Keep coordinates ref updated
  useEffect(() => {
    myLatRef.current = myLat;
    myLngRef.current = myLng;
  }, [myLat, myLng]);

  // Request geolocation when going online
  useEffect(() => {
    if (!isOnline) {
      if (watchRef.current !== null) {
        navigator.geolocation?.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      return;
    }
    if (typeof window === "undefined" || !navigator.geolocation) {
      return;
    }

    const timer = setTimeout(() => setGeoLoading(true), 0);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setMyLat(pos.coords.latitude);
        setMyLng(pos.coords.longitude);
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    return () => {
      clearTimeout(timer);
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
          { headers: { "Accept-Language": locale === "hi" ? "hi" : "en" }, signal: controller.signal }
        );
        const data = await res.json();
        if (!cancelled && data?.address) {
          const a = data.address;
          setLocality(
            a.suburb || a.neighbourhood || a.village || a.town || a.city_district || a.city || "Hastsal"
          );
          setPincode(a.postcode || "110059");
          setStateName(a.state || "Delhi");
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; controller.abort(); };
  }, [isOnline, geoLoading, myLat, myLng, locale]);

  // Ping location when online
  useEffect(() => {
    if (!isOnline || !session) return;
    const ping = () => {
      transport.send({
        type: "helper_location",
        helper_id: session.user_id,
        name: session.name,
        lat: myLatRef.current,
        lng: myLngRef.current,
        ts: Date.now(),
        sender: session.user_id,
      });
    };

    transport.send({
      type: "helper_online",
      helper_id: session.user_id,
      name: session.name,
      lat: myLatRef.current,
      lng: myLngRef.current,
      ts: Date.now(),
      sender: session.user_id,
    });

    ping();
    const interval = setInterval(ping, CONFIG.LOCATION_PING_S * 1000);
    pingRef.current = interval;

    return () => {
      clearInterval(interval);
    };
  }, [isOnline, session, transport]);

  // Listen for booking events
  useEffect(() => {
    if (!session) return;
    const unsub = transport.subscribe((event: RealtimeEvent) => {
      if (event.sender === session.user_id) return;

      if (event.type === "booking_new") {
        const rawDist = haversine(
          { lat: myLatRef.current, lng: myLngRef.current },
          { lat: event.user_lat, lng: event.user_lng }
        );
        const isWithinDemoRange = rawDist <= Math.max(event.radius_m, 35000);
        if (!isWithinDemoRange) return;
        const displayDist = rawDist > 3000 ? 800 : rawDist;

        setRequests(prev => {
          if (prev.some(r => r.booking_id === event.booking_id)) return prev;
          return [...prev, {
            booking_id: event.booking_id,
            service_name: event.service_name,
            home_size: event.home_size,
            price: event.price,
            notes: event.notes,
            addons: event.addons,
            distance_km: displayDist / 1000,
            area_label: event.area_label,
            user_lat: event.user_lat,
            user_lng: event.user_lng,
            received_at: Date.now(),
          }];
        });
      }

      if (event.type === "booking_assigned") {
        if (event.helper_id === session.user_id) {
          const matched = requests.find(r => r.booking_id === event.booking_id);
          store.createBooking({
            id: event.booking_id,
            user_id: "customer",
            user_name: "Customer",
            service_name: event.service_name || matched?.service_name || "Cleaning Service",
            home_size: event.home_size || matched?.home_size || "2 BHK",
            notes: event.notes || matched?.notes,
            addons: event.addons || matched?.addons,
            address_short: matched?.area_label || "Customer Location",
            address_full: event.address_full || matched?.area_label || "Customer Location",
            lat: event.lat || matched?.user_lat || 28.6139,
            lng: event.lng || matched?.user_lng || 77.2090,
            price: event.price || matched?.price || 249,
            otp: event.otp || "",
            status: "accepted",
            helper_id: session.user_id,
            helper_name: session.name,
            helper_lat: myLatRef.current,
            helper_lng: myLngRef.current,
            radius_step: 0,
            rating: null,
            created_at: new Date().toISOString(),
          });
          router.push("/helper/job");
        }
        setRequests(prev => prev.filter(r => r.booking_id !== event.booking_id));
      }

      if (event.type === "booking_cancel") {
        setRequests(prev => prev.filter(r => r.booking_id !== event.booking_id));
      }
    });
    return unsub;
  }, [session, transport, router, store, requests]);

  // Countdown timers for each request
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCountdowns(() => {
        const next: Record<string, number> = {};
        requests.forEach(r => {
          const elapsed = (now - r.received_at) / 1000;
          next[r.booking_id] = Math.max(0, CONFIG.STEP_TIMEOUT_S - Math.floor(elapsed));
        });
        return next;
      });
      setRequests(prev => prev.filter(r => (Date.now() - r.received_at) / 1000 < CONFIG.STEP_TIMEOUT_S));
    }, 1000);
    return () => clearInterval(interval);
  }, [requests]);

  const handleAccept = useCallback((req: IncomingRequest) => {
    if (!session) return;

    store.createBooking({
      id: req.booking_id,
      user_id: "customer",
      user_name: "Customer",
      service_name: req.service_name,
      home_size: req.home_size,
      notes: req.notes,
      addons: req.addons,
      address_short: req.area_label,
      address_full: req.area_label,
      lat: req.user_lat,
      lng: req.user_lng,
      price: req.price,
      otp: "",
      status: "accepted",
      helper_id: session.user_id,
      helper_name: session.name,
      helper_lat: myLatRef.current,
      helper_lng: myLngRef.current,
      radius_step: 0,
      rating: null,
      created_at: new Date().toISOString(),
    });

    transport.send({
      type: "booking_accept",
      booking_id: req.booking_id,
      helper_id: session.user_id,
      helper_name: session.name,
      lat: myLatRef.current,
      lng: myLngRef.current,
      ts: Date.now(),
      sender: session.user_id,
    });
  }, [session, transport, store]);

  const handleDecline = useCallback((bookingId: string) => {
    setRequests(prev => prev.filter(r => r.booking_id !== bookingId));
  }, []);

  // Single signed-in helper name across Home & Profile
  const helperName = session.name || profile.full_name || "Deepa Nair";
  const avatarInitial = helperName.charAt(0).toUpperCase();

  const areaLabelString = locality
    ? [locality, [stateName, pincode].filter(Boolean).join(" ")].filter(Boolean).join(" · ")
    : "Hastsal · Delhi 110059";

  return (
    <>
      <main
        className="w-full max-w-[430px] mx-auto min-h-dvh flex flex-col"
        style={{
          backgroundColor: HELPER_TOKENS.colors.pageBg,
          paddingLeft: HELPER_TOKENS.layout.pagePadding,
          paddingRight: HELPER_TOKENS.layout.pagePadding,
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
          paddingBottom: HELPER_TOKENS.layout.scrollPaddingBottom,
        }}
      >
        {/* 1. HEADER ROW */}
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* 40px avatar: blush circle with brand initial */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 select-none"
              style={{
                backgroundColor: HELPER_TOKENS.colors.blush,
                color: HELPER_TOKENS.colors.brand,
                fontWeight: 500,
                fontSize: "16px",
              }}
              aria-hidden="true"
            >
              {avatarInitial}
            </div>
            <div className="min-w-0">
              <h1
                className="text-[16px] truncate leading-tight"
                style={{
                  fontWeight: 500,
                  color: HELPER_TOKENS.colors.ink,
                }}
              >
                {helperName}
              </h1>
              <p
                className="text-[12px] leading-tight mt-0.5"
                style={{
                  fontWeight: 400,
                  color: HELPER_TOKENS.colors.secondary,
                }}
              >
                {t("helper.helper")}
              </p>
            </div>
          </div>

          {/* ONLINE CONTROL: 34px-high pill switch */}
          <button
            type="button"
            onClick={handleToggleOnline}
            role="switch"
            aria-checked={isOnline}
            aria-label={isOnline ? t("helper.online") : t("helper.offline")}
            className="h-[34px] px-2 rounded-full flex items-center gap-2 border-0 outline-none transition-colors duration-200 cursor-pointer select-none"
            style={{
              minHeight: "44px", // A11y 44px tap target padding
              backgroundColor: isOnline
                ? HELPER_TOKENS.colors.status.onlineSolid
                : HELPER_TOKENS.colors.offlineTrack,
            }}
          >
            {/* Knob on the left when offline */}
            {!isOnline && (
              <span
                className="w-[26px] h-[26px] rounded-full bg-white shadow-xs shrink-0"
                aria-hidden="true"
              />
            )}
            <span
              className="text-[13px] px-1 whitespace-nowrap"
              style={{
                fontWeight: 500,
                color: isOnline ? "#FFFFFF" : HELPER_TOKENS.colors.secondary,
              }}
            >
              {isOnline ? t("helper.online") : t("helper.offline")}
            </span>
            {/* Knob on the right when online */}
            {isOnline && (
              <span
                className="w-[26px] h-[26px] rounded-full bg-white shadow-xs shrink-0"
                aria-hidden="true"
              />
            )}
          </button>
        </header>

        {/* 2 & 3. MAP CARD WITH FLOATING AREA CHIP */}
        <section className="mb-3.5">
          <HelperMapCard
            lat={myLat}
            lng={myLng}
            areaLabel={areaLabelString}
            isLoading={geoLoading}
          />
        </section>

        {/* 4. STATUS CARD UNDER THE MAP */}
        <section
          className="p-[22px] text-center mb-3.5"
          style={{
            backgroundColor: HELPER_TOKENS.colors.cardBg,
            borderRadius: HELPER_TOKENS.radius.card,
            border: `1px solid ${HELPER_TOKENS.colors.hairline}`,
          }}
        >
          {/* 56px blush circle with a white inner circle and bell icon */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{
              backgroundColor: HELPER_TOKENS.colors.blush,
            }}
            aria-hidden="true"
          >
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-xs">
              <IconBell size={18} strokeWidth={1.5} style={{ color: HELPER_TOKENS.colors.brand }} />
            </div>
          </div>
          <h2
            className="text-[16px] leading-snug mb-1"
            style={{
              fontWeight: 500,
              color: HELPER_TOKENS.colors.ink,
            }}
          >
            {isOnline ? t("helper.youreOnline") : t("helper.youreOffline")}
          </h2>
          <p
            className="text-[13px] leading-relaxed"
            style={{
              fontWeight: 400,
              color: HELPER_TOKENS.colors.secondary,
            }}
          >
            {isOnline ? t("helper.waitingForRequests") : t("helper.goOnlineToReceive")}
          </p>
        </section>

        {/* 5. INCOMING REQUESTS (WHEN ONLINE) */}
        {isOnline && requests.length > 0 && (
          <section className="flex flex-col gap-3.5" aria-label="Incoming booking requests">
            {requests.map(req => {
              const remainingSec = countdowns[req.booking_id] ?? CONFIG.STEP_TIMEOUT_S;
              const progressPct = (remainingSec / CONFIG.STEP_TIMEOUT_S) * 100;

              return (
                <article
                  key={req.booking_id}
                  className="p-4"
                  style={{
                    backgroundColor: HELPER_TOKENS.colors.cardBg,
                    borderRadius: HELPER_TOKENS.radius.card,
                    border: `1px solid ${HELPER_TOKENS.colors.hairline}`,
                  }}
                >
                  {/* Badge + countdown */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="px-2.5 py-1 text-[12px]"
                      style={{
                        backgroundColor: HELPER_TOKENS.colors.status.pendingTint,
                        color: HELPER_TOKENS.colors.status.pendingText,
                        borderRadius: HELPER_TOKENS.radius.pill,
                        fontWeight: 500,
                      }}
                    >
                      {t("helper.newRequest")}
                    </span>
                    <span
                      className="text-[12px] tabular-nums"
                      style={{
                        color: HELPER_TOKENS.colors.status.pendingText,
                        fontWeight: 500,
                      }}
                    >
                      {remainingSec}s
                    </span>
                  </div>

                  {/* Countdown bar */}
                  <div
                    className="h-1 rounded-full mb-3 overflow-hidden"
                    style={{ backgroundColor: HELPER_TOKENS.colors.innerHairline }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{
                        backgroundColor: HELPER_TOKENS.colors.brand,
                        width: `${progressPct}%`,
                      }}
                    />
                  </div>

                  {/* Details */}
                  <h3
                    className="text-[16px] leading-snug mb-1"
                    style={{
                      fontWeight: 500,
                      color: HELPER_TOKENS.colors.ink,
                    }}
                  >
                    {req.service_name} · {req.home_size}
                  </h3>

                  {/* Add-ons badges if selected */}
                  {req.addons && req.addons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {req.addons.map((addon, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 text-[12px]"
                          style={{
                            backgroundColor: HELPER_TOKENS.colors.blush,
                            color: HELPER_TOKENS.colors.brand,
                            borderRadius: HELPER_TOKENS.radius.pill,
                            fontWeight: 500,
                          }}
                        >
                          + {addon}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Customer note if provided */}
                  {req.notes && req.notes.trim().length > 0 && (
                    <div
                      className="mt-2.5 p-2.5"
                      style={{
                        backgroundColor: HELPER_TOKENS.colors.innerHairline,
                        borderRadius: HELPER_TOKENS.radius.innerTile,
                        border: `1px solid ${HELPER_TOKENS.colors.hairline}`,
                      }}
                    >
                      <p
                        className="text-[12px] uppercase tracking-wider mb-0.5"
                        style={{
                          color: HELPER_TOKENS.colors.secondary,
                          fontWeight: 500,
                        }}
                      >
                        {t("helper.customerNote")}
                      </p>
                      <p
                        className="text-[13px] leading-relaxed break-words"
                        style={{
                          color: HELPER_TOKENS.colors.ink,
                          fontWeight: 400,
                        }}
                      >
                        &ldquo;{req.notes.trim()}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Location & ETA */}
                  <div className="flex items-center gap-1.5 mt-2.5 mb-3.5">
                    <IconMapPin size={18} strokeWidth={1.5} style={{ color: HELPER_TOKENS.colors.brand, flexShrink: 0 }} />
                    <span
                      className="text-[12px] truncate"
                      style={{
                        color: HELPER_TOKENS.colors.secondary,
                        fontWeight: 400,
                      }}
                    >
                      {req.area_label} · {req.distance_km.toFixed(1)} km, ~{computeEta(req.distance_km * 1000)} min
                    </span>
                  </div>

                  {/* Price + actions */}
                  <div className="flex items-center justify-between gap-3 pt-1 border-t" style={{ borderColor: HELPER_TOKENS.colors.innerHairline }}>
                    <p
                      className="text-[16px] tabular-nums"
                      style={{
                        color: HELPER_TOKENS.colors.status.onlineText,
                        fontWeight: 500,
                      }}
                    >
                      {t("helper.youEarn", { amount: formatCurrency(req.price) })}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDecline(req.booking_id)}
                        className="h-11 px-4 text-[14px] cursor-pointer outline-none transition-colors duration-200"
                        style={{
                          backgroundColor: HELPER_TOKENS.colors.cardBg,
                          border: `1px solid ${HELPER_TOKENS.colors.hairline}`,
                          borderRadius: HELPER_TOKENS.radius.innerTile,
                          color: HELPER_TOKENS.colors.ink,
                          fontWeight: 500,
                          minHeight: "44px",
                        }}
                      >
                        {t("helper.decline")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAccept(req)}
                        className="h-11 px-4 text-[14px] text-white cursor-pointer outline-none transition-colors duration-200"
                        style={{
                          backgroundColor: HELPER_TOKENS.colors.brand,
                          border: "none",
                          borderRadius: HELPER_TOKENS.radius.innerTile,
                          fontWeight: 500,
                          minHeight: "44px",
                        }}
                      >
                        {t("helper.accept")}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
      <HelperBottomNav />
    </>
  );
}
