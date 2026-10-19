"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { IconX } from "@/components/icons";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useSwepy } from "@/lib/swepy/provider";
import { getSession, ensureSession } from "@/lib/swepy/session";
import type { Session } from "@/lib/swepy/types";
import { CONFIG, generateOtp, haversine } from "@/lib/swepy";
import type { RealtimeEvent, OnlineHelper, Booking as SwepyBooking } from "@/lib/swepy";
import { useGeo } from "@/lib/geo-store";
import { servicePrices, addons as allAddons } from "@/lib/mock-data";
import { getOrderDraft } from "@/lib/order-draft";
import { formatHomeSize } from "@/lib/utils";

export default function SearchingPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { store, transport, ready } = useSwepy();
  const [session, setSession] = useState<Session | null>(null);
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

  // Ensure customer session on mount
  useEffect(() => {
    const s = ensureSession("user", "Demo User");
    setSession(s);
  }, []);

  // Fetch all currently active helpers from the server immediately on mount
  useEffect(() => {
    fetch('/api/messages')
      .then(res => res.json())
      .then(data => {
        if (data.activeHelpers && data.activeHelpers.length > 0) {
          setHelpers(prev => {
            const next = new Map(prev);
            data.activeHelpers.forEach((h: any) => {
              next.set(h.helper_id, {
                helper_id: h.helper_id,
                name: h.name || "Helper",
                lat: h.lat,
                lng: h.lng,
                last_ping: h.last_ping || Date.now(),
              });
            });
            return next;
          });
        }
      })
      .catch(() => {});
  }, []);

  // Prune helpers older than 35s
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - 35000;
      setHelpers(prev => {
        let changed = false;
        const next = new Map(prev);
        for (const [id, h] of next.entries()) {
          if (h.last_ping < cutoff) {
            next.delete(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // On mount: check for an existing active booking first (local store + API)
  useEffect(() => {
    if (!ready || !session) return;
    const active = store.getActiveBookingForUser(session.user_id);
    if (active && (active.status === "searching" || active.status === "SEARCHING")) {
      // Already searching, resume
      setBookingId(active.id);
      bookingRef.current = active;
    } else if (active && active.status !== "searching" && active.status !== "SEARCHING") {
      // Already has a helper assigned — jump straight to tracking
      router.replace(`/booking/${active.id}`);
      return;
    }

    // Also verify against backend active order endpoint
    fetch("/api/bookings/active")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.booking) {
          const b = data.booking;
          const status = (b.status || "").toLowerCase();
          if (status === "searching") {
            setBookingId(b.id);
          } else if (["accepted", "confirmed", "on_the_way", "arrived", "in_progress"].includes(status)) {
            router.replace(`/booking/${b.id}`);
          }
        }
      })
      .catch(() => {});
  }, [ready, session, store, router]);

  // Listen for helper location pings and acceptance
  useEffect(() => {
    if (!ready || !session) return;
    const unsub = transport.subscribe((event: RealtimeEvent) => {
      if (event.sender === session.user_id) return;

      if (event.type === "helper_online" || event.type === "helper_location") {
        setHelpers(prev => {
          const next = new Map(prev);
          next.set(event.helper_id, {
            helper_id: event.helper_id,
            name: "name" in event && event.name ? event.name : prev.get(event.helper_id)?.name || "Helper",
            lat: event.lat,
            lng: event.lng,
            last_ping: event.ts || Date.now(),
          });
          return next;
        });
      }

      if (event.type === "helper_offline") {
        setHelpers(prev => { const next = new Map(prev); next.delete(event.helper_id); return next; });
      }

      // No helper found notification
      if (event.type === "order:no_helper_found" || (event as any).event === "order:no_helper_found") {
        if (searchTimerRef.current) {
          clearInterval(searchTimerRef.current);
          searchTimerRef.current = null;
        }
        if (bookingId) {
          router.replace(`/booking/${bookingId}`);
        }
      }

      // Helper accepted our booking -> navigate immediately to tracking with OTP
      if (
        event.type === "booking_accept" ||
        event.type === "order:accepted" ||
        (event as any).event === "order:accepted"
      ) {
        const evt = event as any;
        const b = bookingRef.current || (bookingId ? store.getBooking(bookingId) : null) || store.getBooking(evt.booking_id || evt.order_id);
        const targetId = evt.booking_id || evt.order_id || b?.id;
        const helperId = evt.helper?.id || evt.helper_id;
        const helperName = evt.helper?.name || evt.helper_name || "Helper";
        const lat = evt.helper_location?.lat ?? evt.lat;
        const lng = evt.helper_location?.lng ?? evt.lng;
        const otp = evt.otp || b?.otp;

        if (targetId && (!b || b.id === targetId)) {
          if (b) {
            store.updateBooking(b.id, {
              status: "accepted",
              helper_id: helperId,
              helper_name: helperName,
              helper_lat: lat,
              helper_lng: lng,
              ...(otp ? { otp } : {}),
            });
            bookingRef.current = {
              ...b,
              status: "accepted" as const,
              helper_id: helperId,
              helper_name: helperName,
              helper_lat: lat,
              helper_lng: lng,
              ...(otp ? { otp } : {}),
            };

            // Broadcast assigned to lock in the match
            transport.send({
              type: "booking_assigned",
              booking_id: b.id,
              helper_id: helperId,
              helper_name: helperName,
              otp: otp || b.otp,
              address_full: b.address_full,
              service_name: b.service_name,
              home_size: b.home_size,
              price: b.price,
              notes: b.notes,
              addons: b.addons,
              lat: b.lat,
              lng: b.lng,
              ts: Date.now(),
              sender: session.user_id,
            });
          }

          // Stop search timer
          if (searchTimerRef.current) {
            clearInterval(searchTimerRef.current);
            searchTimerRef.current = null;
          }

          // Navigate to tracking page with OTP immediately
          router.replace(`/booking/${targetId}`);
        }
      }
    });
    return unsub;
  }, [ready, session, transport, store, router, bookingId]);

  // Sync across tabs via storage event if helper accepted in another tab
  useEffect(() => {
    const handleStorage = () => {
      const curId = bookingRef.current?.id || bookingId;
      if (curId) {
        const current = store.getBooking(curId);
        if (current && (current.status === "accepted" || current.status === "on_the_way" || current.status === "arrived")) {
          if (searchTimerRef.current) {
            clearInterval(searchTimerRef.current);
            searchTimerRef.current = null;
          }
          router.replace(`/booking/${current.id}`);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [bookingId, router, store]);

  // Create booking on mount if none exists
  useEffect(() => {
    if (!ready || !session || bookingId) return;

    const otp = generateOtp();
    const userLat = geo.lat || 28.6139;
    const userLng = geo.lng || 77.2090;

    // Load order draft from selection/checkout
    const draft = getOrderDraft();
    const serviceName = draft.serviceName || "Minor clean";
    const homeSizeLabel = formatHomeSize(draft.homeSize);
    const priceVal = draft.totalPrice > 0 ? draft.totalPrice : 249;
    const notesVal = draft.notes?.trim() || "";
    const addonsList = draft.addonNames && draft.addonNames.length > 0 ? draft.addonNames : [];

    const newBooking = store.createBooking({
      id: "bk_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6), // Temp ID until API returns
      user_id: session.user_id,
      user_name: session.name,
      service_name: serviceName,
      home_size: homeSizeLabel,
      address_short: "Sector 18, Noida",
      address_full: "Flat 402, Tower B, Sunrise Heights, Sector 18, Noida",
      lat: userLat,
      lng: userLng,
      price: priceVal,
      notes: notesVal,
      addons: addonsList,
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

    setBookingId(newBooking.id);
    bookingRef.current = newBooking;

    // Call real API
    fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: session.user_id,
        addressId: 'addr_priya_home',
        servicePackageId: draft.serviceId || 'pkg_minor_2bhk',
        pricePaise: priceVal * 100,
        lat: userLat,
        lng: userLng,
        cityId: 'city_bangalore',
        idempotencyKey: newBooking.id
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
      notes: notesVal,
      addons: addonsList,
      distance_km: 0,
      area_label: newBooking.address_short,
      user_lat: userLat,
      user_lng: userLng,
      ts: Date.now(),
      sender: session.user_id,
      radius_m: CONFIG.RADIUS_STEPS_M[0],
      otp: newBooking.otp,
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
            notes: notesVal,
            addons: addonsList,
            distance_km: 0,
            area_label: newBooking.address_short,
            user_lat: userLat,
            user_lng: userLng,
            ts: Date.now(),
            sender: session.user_id,
            radius_m: CONFIG.RADIUS_STEPS_M[currentStep],
            otp: newBooking.otp,
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
