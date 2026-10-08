"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { IconX } from "@/components/icons";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useSwepy } from "@/lib/swepy/provider";
import { getSession } from "@/lib/swepy/session";
import { CONFIG, generateOtp, haversine } from "@/lib/swepy";
import type { RealtimeEvent, OnlineHelper, Booking as SwepyBooking } from "@/lib/swepy";
import { useGeo } from "@/lib/geo-store";
import { servicePrices, addons as allAddons } from "@/lib/mock-data";

export default function SearchingPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { store, transport, ready } = useSwepy();
  const session = getSession();
  const geo = useGeo();

  const [radius, setRadius] = useState(1);
  const [radiusIdx, setRadiusIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState<number>(CONFIG.STEP_TIMEOUT_S);
  const [timedOut, setTimedOut] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [helpers, setHelpers] = useState<Map<string, OnlineHelper>>(new Map());

  const searchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bookingRef = useRef<SwepyBooking | null>(null);

  // On mount: check for an existing active booking first
  useEffect(() => {
    if (!ready || !session) return;
    const active = store.getActiveBookingForUser(session.user_id);
    if (active && active.status === "searching") {
      // Already searching, resume
      setBookingId(active.id);
      bookingRef.current = active;
    } else if (active && active.status !== "searching") {
      // Already has a helper assigned — jump straight to tracking
      router.replace(`/booking/${active.id}`);
    }
  }, [ready, session, store, router]);

  // Listen for helper location pings
  useEffect(() => {
    if (!ready || !session) return;
    const unsub = transport.subscribe((event: RealtimeEvent) => {
      if (event.sender === session.user_id) return;

      if (event.type === "helper_online" || event.type === "helper_location") {
        setHelpers(prev => {
          const next = new Map(prev);
          next.set(event.helper_id, {
            helper_id: event.helper_id,
            name: "name" in event ? event.name : prev.get(event.helper_id)?.name || "Helper",
            lat: event.lat, lng: event.lng,
            last_ping: event.ts,
          });
          return next;
        });
      }

      if (event.type === "helper_offline") {
        setHelpers(prev => { const next = new Map(prev); next.delete(event.helper_id); return next; });
      }

      // Helper accepted our booking
      if (event.type === "booking_accept" && bookingRef.current && event.booking_id === bookingRef.current.id) {
        // First-accept-wins
        const b = bookingRef.current;
        if (b.status !== "searching") return;

        const updated = store.updateBooking(b.id, {
          status: "accepted",
          helper_id: event.helper_id,
          helper_name: event.helper_name,
          helper_lat: event.lat,
          helper_lng: event.lng,
        });

        if (updated) {
          bookingRef.current = updated;
          // Broadcast assigned
          transport.send({
            type: "booking_assigned",
            booking_id: b.id,
            helper_id: event.helper_id,
            helper_name: event.helper_name,
            ts: Date.now(),
            sender: session.user_id,
          });
          // Stop timer
          if (searchTimerRef.current) { clearInterval(searchTimerRef.current); searchTimerRef.current = null; }
          // Navigate to tracking page
          router.replace(`/booking/${b.id}`);
        }
      }
    });
    return unsub;
  }, [ready, session, transport, store, router]);

  // Create booking on mount if none exists
  useEffect(() => {
    if (!ready || !session || bookingId) return;

    const otp = generateOtp();
    const userLat = geo.lat || 28.6139;
    const userLng = geo.lng || 77.2090;

    // Use the first service price as demo (Minor clean · 2 BHK)
    const sp = servicePrices[1]; // minor_clean, 2bhk

    const newBookingLocal = store.createBooking({
      id: "bk_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6), // Temp ID until API returns
      user_id: session.user_id,
      user_name: session.name,
      service_name: "Minor clean",
      home_size: "2 BHK",
      address_short: "Sector 18, Noida",
      address_full: "Flat 402, Tower B, Sunrise Heights, Sector 18, Noida",
      lat: userLat,
      lng: userLng,
      price: sp?.price || 249,
      otp,
      status: "searching",
      helper_id: null,
      helper_name: null,
      helper_lat: null,
      helper_lng: null,
      radius_step: 0,
      rating: null,
      created_at: new Date().toISOString(),
    });

    setBookingId(newBookingLocal.id);
    bookingRef.current = newBookingLocal;

    // Call real API
    fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: session.user_id,
        addressId: 'addr_priya_home',
        servicePackageId: 'pkg_minor_2bhk',
        pricePaise: sp?.price ? sp.price * 100 : 24900,
        lat: userLat,
        lng: userLng,
        cityId: 'city_bangalore',
        idempotencyKey: newBookingLocal.id
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.booking) {
        // We could swap the ID here, but for simplicity we keep local ID for realtime and just let the backend track it via idempotency_key. 
        // In a full refactor, the UI would only use the DB ID.
      }
    })
    .catch(console.error);


    // Broadcast to helpers
    transport.send({
      type: "booking_new",
      booking_id: newBooking.id,
      service_name: newBooking.service_name,
      home_size: newBooking.home_size,
      price: newBooking.price,
      distance_km: 0,
      area_label: newBooking.address_short,
      user_lat: userLat,
      user_lng: userLng,
      ts: Date.now(),
      sender: session.user_id,
    });

    // Start countdown timer with radius expansion
    let elapsedSec = 0;
    let currentStep = 0;
    searchTimerRef.current = setInterval(() => {
      elapsedSec++;
      setElapsed(elapsedSec);
      const remaining = CONFIG.STEP_TIMEOUT_S - (elapsedSec % CONFIG.STEP_TIMEOUT_S);
      setCountdown(remaining);
      setRadius(CONFIG.RADIUS_STEPS_M[currentStep] / 1000);

      if (elapsedSec % CONFIG.STEP_TIMEOUT_S === 0) {
        currentStep++;
        if (currentStep < CONFIG.RADIUS_STEPS_M.length) {
          setRadiusIdx(currentStep);
          setRadius(CONFIG.RADIUS_STEPS_M[currentStep] / 1000);
          store.updateBooking(newBooking.id, { radius_step: currentStep });

          // Re-broadcast at wider radius
          transport.send({
            type: "booking_new",
            booking_id: newBooking.id,
            service_name: newBooking.service_name,
            home_size: newBooking.home_size,
            price: newBooking.price,
            distance_km: 0,
            area_label: newBooking.address_short,
            user_lat: userLat,
            user_lng: userLng,
            ts: Date.now(),
            sender: session.user_id,
          });

          transport.send({
            type: "booking_expand",
            booking_id: newBooking.id,
            radius_m: CONFIG.RADIUS_STEPS_M[currentStep],
            ts: Date.now(),
            sender: session.user_id,
          });
        } else {
          // All radii exhausted
          store.updateBooking(newBooking.id, { status: "expired" as any });
          setTimedOut(true);
          if (searchTimerRef.current) { clearInterval(searchTimerRef.current); searchTimerRef.current = null; }
        }
      }
    }, 1000);

    return () => {
      if (searchTimerRef.current) { clearInterval(searchTimerRef.current); searchTimerRef.current = null; }
    };
  }, [ready, session, store, transport, geo, bookingId]);

  const handleCancel = useCallback(() => {
    if (bookingRef.current && session) {
      store.updateBooking(bookingRef.current.id, { status: "cancelled" as any });
      transport.send({ type: "booking_cancel", booking_id: bookingRef.current.id, ts: Date.now(), sender: session.user_id });
    }
    if (searchTimerRef.current) { clearInterval(searchTimerRef.current); searchTimerRef.current = null; }
    router.replace("/");
  }, [store, transport, session, router]);

  const handleRetry = useCallback(() => {
    setTimedOut(false);
    setBookingId(null);
    bookingRef.current = null;
    setElapsed(0);
    setCountdown(CONFIG.STEP_TIMEOUT_S);
    setRadiusIdx(0);
    setRadius(1);
  }, []);

  return (
    <div className="mobile-frame bg-app-bg min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-4 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between py-3">
          <div />
          <button
            onClick={handleCancel}
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{ border: "0.5px solid var(--surface-border)" }}
          >
            <IconX size={18} className="text-ink-muted" />
          </button>
        </div>
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {!timedOut ? (
          <>
            {/* Radar animation */}
            <div className="relative w-40 h-40 mb-8">
              <div className="absolute inset-0 rounded-full animate-ping" style={{ border: "2px solid var(--brand-rose)", opacity: 0.15 }} />
              <div className="absolute inset-4 rounded-full animate-ping" style={{ border: "2px solid var(--brand-rose)", opacity: 0.25, animationDelay: "0.5s" }} />
              <div className="absolute inset-8 rounded-full animate-ping" style={{ border: "2px solid var(--brand-rose)", opacity: 0.35, animationDelay: "1s" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--brand-rose)" }}>
                  <span className="text-white text-[16px]">🧹</span>
                </div>
              </div>
            </div>

            <h2 className="text-[20px] font-medium text-ink mb-2">{t("searching.lookingForHelper")}</h2>
            <p className="text-[14px] text-ink-muted text-center mb-2">
              Searching within {radius} km radius
            </p>
            <p className="text-[13px] text-ink-muted mb-6">{countdown}s remaining at this radius</p>

            {/* Countdown bar */}
            <div className="w-full max-w-[240px] h-1 rounded-full mb-6 overflow-hidden" style={{ backgroundColor: "var(--step-inactive)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  backgroundColor: "var(--brand-rose)",
                  width: `${(countdown / CONFIG.STEP_TIMEOUT_S) * 100}%`,
                }}
              />
            </div>

            <p className="text-[12px] text-ink-muted">{helpers.size} helper{helpers.size !== 1 ? "s" : ""} online nearby</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: "var(--surface)" }}>
              <span className="text-[28px]">😔</span>
            </div>

            <h2 className="text-[18px] font-medium text-ink mb-2">{t("searching.noHelperFound")}</h2>
            <p className="text-[14px] text-ink-muted text-center mb-6">
              {t("searching.tryAgainLater")}
            </p>

            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={handleRetry}
                className="w-full h-12 rounded-[12px] text-[14px] font-medium text-white"
                style={{ backgroundColor: "var(--brand-rose)" }}
              >
                Try again
              </button>
              <Link
                href="/"
                className="w-full h-12 rounded-[12px] text-[14px] font-medium flex items-center justify-center no-underline"
                style={{ border: "1px solid var(--surface-border)", color: "var(--ink)" }}
              >
                Go home
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
