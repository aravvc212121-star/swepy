"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSwepy } from "@/lib/swepy/provider";
import { getSession } from "@/lib/swepy/session";
import {
  CONFIG, generateOtp, haversine, computeEta,
  formatDistance, formatEta, pickHelpersInRadius,
  isActive, canTransition, transition,
} from "@/lib/swepy";
import type { RealtimeEvent, OnlineHelper, Booking } from "@/lib/swepy";
import { IconMapPin, IconCheck } from "@/components/icons";

function formatINR(n: number) { return "₹" + n.toLocaleString("en-IN"); }

type Phase = "idle" | "searching" | "accepted" | "on_the_way" | "arrived" | "in_progress" | "completed" | "expired";

export default function TrackingPage() {
  const { transport, store } = useSwepy();
  const session = getSession();
  const [phase, setPhase] = useState<Phase>("idle");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [radiusIdx, setRadiusIdx] = useState(0);
  const [countdown, setCountdown] = useState<number>(CONFIG.STEP_TIMEOUT_S);
  const [helpers, setHelpers] = useState<Map<string, OnlineHelper>>(new Map());
  const [helperLat, setHelperLat] = useState<number | null>(null);
  const [helperLng, setHelperLng] = useState<number | null>(null);
  const [helperName, setHelperName] = useState<string>("");
  const [distance, setDistance] = useState<number | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [helperStale, setHelperStale] = useState(false);
  const [rating, setRating] = useState(0);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // My location (user)
  const [myLat, setMyLat] = useState(28.6139);
  const [myLng, setMyLng] = useState(77.2090);

  // Restore active booking on mount
  useEffect(() => {
    if (!session) return;
    const active = store.getActiveBookingForUser(session.user_id);
    if (active) {
      setBooking(active);
      setPhase(active.status as Phase);
      setMyLat(active.lat);
      setMyLng(active.lng);
      if (active.helper_lat) setHelperLat(active.helper_lat);
      if (active.helper_lng) setHelperLng(active.helper_lng);
      if (active.helper_name) setHelperName(active.helper_name);
    }
  }, [session, store]);

  // Listen for helper pings (to build the online map)
  useEffect(() => {
    if (!session) return;
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

      // Booking accept
      if (event.type === "booking_accept" && booking && event.booking_id === booking.id && phase === "searching") {
        // DB-READY: becomes an atomic server-side update where status = searching
        resolveAccept(event);
      }

      // Helper location during job
      if (event.type === "job_location" && booking && event.booking_id === booking.id) {
        setHelperLat(event.lat);
        setHelperLng(event.lng);
        setHelperStale(false);
        const dist = haversine({ lat: myLat, lng: myLng }, { lat: event.lat, lng: event.lng });
        setDistance(dist);
        setEta(computeEta(dist));
        store.updateBooking(booking.id, { helper_lat: event.lat, helper_lng: event.lng });
        // Reset stale timer
        if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
        staleTimerRef.current = setTimeout(() => setHelperStale(true), CONFIG.HELPER_STALE_S * 1000);
      }

      // Job status changes from helper
      if (event.type === "job_status" && booking && event.booking_id === booking.id) {
        const newStatus = event.status;
        setPhase(newStatus as Phase);
        store.updateBooking(booking.id, { status: newStatus });
        setBooking(prev => prev ? { ...prev, status: newStatus } : prev);
      }
    });
    return unsub;
  }, [session, transport, booking, phase, myLat, myLng, store]);

  /* ── resolveAccept: first-accept-wins referee ── */
  // DB-READY: becomes an atomic server-side update where status = searching
  const resolveAccept = useCallback((event: RealtimeEvent & { type: "booking_accept" }) => {
    if (!booking || booking.status !== "searching") return;

    // Accept this helper
    const updated = store.updateBooking(booking.id, {
      status: "accepted",
      helper_id: event.helper_id,
      helper_name: event.helper_name,
      helper_lat: event.lat,
      helper_lng: event.lng,
    });

    if (updated) {
      setBooking(updated);
      setPhase("accepted");
      setHelperName(event.helper_name);
      setHelperLat(event.lat);
      setHelperLng(event.lng);
      const dist = haversine({ lat: myLat, lng: myLng }, { lat: event.lat, lng: event.lng });
      setDistance(dist);
      setEta(computeEta(dist));

      // Broadcast assigned to all helpers
      transport.send({
        type: "booking_assigned",
        booking_id: booking.id,
        helper_id: event.helper_id,
        helper_name: event.helper_name,
        ts: Date.now(),
        sender: session!.user_id,
      });

      // Stop searching
      if (searchTimerRef.current) { clearInterval(searchTimerRef.current); searchTimerRef.current = null; }
    }
  }, [booking, store, transport, session, myLat, myLng]);

  // Prune stale helpers
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setHelpers(prev => {
        const next = new Map(prev);
        for (const [id, h] of next) {
          if (now - h.last_ping > CONFIG.HELPER_STALE_S * 1000) next.delete(id);
        }
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  /* ── Start searching ── */
  const handleFindHelper = useCallback(() => {
    if (!session) return;
    const otp = generateOtp();
    const newBooking = store.createBooking({
      id: "bk_" + Math.random().toString(36).slice(2, 10),
      user_id: session.user_id,
      user_name: session.name,
      service_name: "Minor clean",
      home_size: "2 BHK",
      address_short: "Sector 18, Noida",
      address_full: "Flat 402, Tower B, Sunrise Heights, Sector 18, Noida",
      lat: myLat, lng: myLng,
      price: 180,
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

    setBooking(newBooking);
    setPhase("searching");
    setRadiusIdx(0);
    setCountdown(CONFIG.STEP_TIMEOUT_S);

    // Broadcast to helpers within first radius
    broadcastToRadius(newBooking, 0);

    // Start countdown
    let elapsed = 0;
    let currentStep = 0;
    searchTimerRef.current = setInterval(() => {
      elapsed++;
      const remaining = CONFIG.STEP_TIMEOUT_S - (elapsed % CONFIG.STEP_TIMEOUT_S);
      setCountdown(remaining);

      if (elapsed % CONFIG.STEP_TIMEOUT_S === 0) {
        currentStep++;
        if (currentStep < CONFIG.RADIUS_STEPS_M.length) {
          setRadiusIdx(currentStep);
          store.updateBooking(newBooking.id, { radius_step: currentStep });
          broadcastToRadius(newBooking, currentStep);
          // Broadcast expand
          transport.send({
            type: "booking_expand",
            booking_id: newBooking.id,
            radius_m: CONFIG.RADIUS_STEPS_M[currentStep],
            ts: Date.now(), sender: session.user_id,
          });
        } else {
          // Expired
          store.updateBooking(newBooking.id, { status: "expired" });
          setPhase("expired");
          if (searchTimerRef.current) { clearInterval(searchTimerRef.current); searchTimerRef.current = null; }
        }
      }
    }, 1000);
  }, [session, store, transport, helpers, myLat, myLng]);

  const broadcastToRadius = useCallback((b: Booking, stepIdx: number) => {
    if (!session) return;
    const radius = CONFIG.RADIUS_STEPS_M[stepIdx];
    const eligible = pickHelpersInRadius(Array.from(helpers.values()), { lat: b.lat, lng: b.lng }, radius);
    // Send booking_new to all eligible helpers (via broadcast channel, all will hear it)
    transport.send({
      type: "booking_new",
      booking_id: b.id,
      service_name: b.service_name,
      home_size: b.home_size,
      price: b.price,
      distance_km: 0, // each helper computes their own
      area_label: b.address_short,
      user_lat: b.lat, user_lng: b.lng,
      ts: Date.now(), sender: session.user_id,
    });
  }, [session, transport, helpers]);

  const handleCancel = useCallback(() => {
    if (!booking) return;
    store.updateBooking(booking.id, { status: "cancelled" });
    transport.send({ type: "booking_cancel", booking_id: booking.id, ts: Date.now(), sender: session!.user_id });
    setPhase("idle");
    setBooking(null);
    if (searchTimerRef.current) { clearInterval(searchTimerRef.current); searchTimerRef.current = null; }
  }, [booking, store, transport, session]);

  const handleRetry = useCallback(() => {
    setPhase("idle");
    setBooking(null);
  }, []);

  const handleRate = useCallback((stars: number) => {
    if (!booking) return;
    setRating(stars);
    store.updateBooking(booking.id, { rating: stars });
    // Create earning for the helper
    if (booking.helper_id) {
      store.appendEarning({
        id: "earn_" + Math.random().toString(36).slice(2, 10),
        booking_id: booking.id,
        helper_id: booking.helper_id,
        service_name: booking.service_name,
        home_size: booking.home_size,
        amount: booking.price,
        tip: 0,
        rating: stars,
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
    }
  }, [booking, store]);

  if (!session) {
    return (
      <div className="w-full max-w-[430px] mx-auto min-h-dvh flex items-center justify-center bg-app-bg px-4">
        <p className="text-[14px] text-ink-muted text-center">
          Go to <a href="/demo" className="underline" style={{ color: "var(--brand-rose)" }}>/demo</a> first.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[430px] mx-auto min-h-dvh bg-app-bg px-4"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", paddingBottom: "calc(96px + env(safe-area-inset-bottom, 0px))" }}>

      {/* ── IDLE: Find helper ── */}
      {phase === "idle" && (
        <>
          <h1 className="text-[22px] font-medium text-ink mb-1">Book a helper</h1>
          <p className="text-[14px] text-ink-muted mb-5">Quick service at your doorstep</p>

          <div className="rounded-[14px] p-4 mb-4" style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}>
            <p className="text-[14px] font-medium text-ink mb-1">Minor clean · 2 BHK</p>
            <p className="text-[13px] text-ink-muted mb-2">Sector 18, Noida</p>
            <p className="text-[18px] font-medium" style={{ color: "var(--sage-text)" }}>{formatINR(180)}</p>
          </div>

          <p className="text-[12px] text-ink-muted mb-4 text-center">{helpers.size} helper{helpers.size !== 1 ? "s" : ""} online nearby</p>

          <button type="button" onClick={handleFindHelper} data-pressable=""
            className="w-full h-12 rounded-[12px] text-[15px] font-medium text-white no-select"
            style={{ backgroundColor: "var(--brand-rose)" }}>
            Find helper
          </button>
        </>
      )}

      {/* ── SEARCHING ── */}
      {phase === "searching" && (
        <div className="text-center pt-8">
          {/* Radar animation */}
          <div className="relative w-40 h-40 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full" style={{ border: "2px dashed var(--step-inactive)" }} />
            <div className="absolute rounded-full animate-ping" style={{
              inset: 20, border: "2px solid var(--teal)", opacity: 0.3,
            }} />
            <div className="absolute rounded-full" style={{
              inset: 40, border: "2px dashed var(--teal)",
            }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "var(--brand-rose)" }} />
            </div>
          </div>

          <p className="text-[16px] font-medium text-ink mb-1">
            Looking within {CONFIG.RADIUS_STEPS_M[radiusIdx] / 1000} km
          </p>
          <p className="text-[14px] text-ink-muted mb-4">{countdown}s remaining</p>

          {/* Countdown bar */}
          <div className="h-1 rounded-full mb-6 overflow-hidden mx-8" style={{ backgroundColor: "var(--step-inactive)" }}>
            <div className="h-full rounded-full transition-all" style={{
              backgroundColor: "var(--teal)",
              width: `${(countdown / CONFIG.STEP_TIMEOUT_S) * 100}%`,
            }} />
          </div>

          <button type="button" onClick={handleCancel} data-pressable=""
            className="h-10 px-6 rounded-[12px] text-[14px] font-medium no-select"
            style={{ border: "1px solid var(--surface-border)", color: "var(--ink)" }}>
            Cancel
          </button>
        </div>
      )}

      {/* ── ACCEPTED / ON THE WAY / ARRIVED ── */}
      {(phase === "accepted" || phase === "on_the_way" || phase === "arrived") && booking && (
        <>
          {/* Map area */}
          <div className="rounded-[14px] overflow-hidden mb-4 relative" style={{ height: 200, backgroundColor: "var(--teal-soft)", border: "0.5px solid var(--surface-border)" }}>
            <div className="absolute inset-0 flex items-center justify-center">
              {/* User marker */}
              <div className="absolute" style={{ left: "35%", top: "55%" }}>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "var(--brand-rose)" }} />
              </div>
              {/* Helper marker */}
              {helperLat && helperLng && (
                <div className="absolute transition-all duration-[3000ms] ease-linear" style={{
                  left: `${35 + ((helperLng! - myLng) * 50000)}%`,
                  top: `${55 - ((helperLat! - myLat) * 50000)}%`,
                }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium text-white"
                    style={{ backgroundColor: "var(--teal)" }}>
                    {helperName.charAt(0)}
                  </div>
                </div>
              )}
              {/* Line */}
              <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
                <line x1="35%" y1="55%" x2="65%" y2="35%" stroke="var(--teal)" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.5" />
              </svg>
            </div>
            {helperStale && (
              <div className="absolute top-2 left-2 right-2 rounded-[8px] px-2 py-1 text-center"
                style={{ backgroundColor: "var(--amber-soft)", border: "0.5px solid var(--amber-border)" }}>
                <p className="text-[11px] font-medium" style={{ color: "var(--ink)" }}>Helper reconnecting...</p>
              </div>
            )}
          </div>

          {/* Helper card */}
          <div className="rounded-[14px] p-4 mb-3" style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-[16px] font-medium text-white"
                style={{ backgroundColor: "var(--brand-rose)" }}>
                {helperName.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-medium text-ink">{helperName}</p>
                <p className="text-[12px] text-ink-muted">{booking.service_name} · {booking.home_size}</p>
              </div>
            </div>
            {distance !== null && eta !== null && (
              <div className="flex gap-3">
                <div className="flex-1 rounded-[10px] py-2 text-center" style={{ backgroundColor: "var(--app-bg)" }}>
                  <p className="text-[14px] font-medium text-ink">{formatDistance(distance)}</p>
                  <p className="text-[11px] text-ink-muted">Distance</p>
                </div>
                <div className="flex-1 rounded-[10px] py-2 text-center" style={{ backgroundColor: "var(--app-bg)" }}>
                  <p className="text-[14px] font-medium text-ink">~{formatEta(eta)}</p>
                  <p className="text-[11px] text-ink-muted">ETA (approx)</p>
                </div>
              </div>
            )}
          </div>

          {/* OTP card */}
          <div className="rounded-[14px] p-4 mb-3" style={{ backgroundColor: "var(--teal-soft)", border: "0.5px solid var(--teal)" }}>
            <p className="text-[12px] font-medium mb-1" style={{ color: "var(--teal-dark)" }}>Share this OTP with your helper</p>
            <p className="text-[28px] font-medium tracking-[8px] text-center" style={{ color: "var(--teal-dark)" }}>
              {booking.otp}
            </p>
          </div>

          {/* Progress stepper */}
          <div className="rounded-[14px] p-4" style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}>
            {["Booked", "On the way", "Arrived"].map((label, i) => {
              const stepMap: Phase[] = ["accepted", "on_the_way", "arrived"];
              const stepIdx = stepMap.indexOf(phase);
              const isDone = i <= stepIdx;
              return (
                <div key={label} className="flex items-center gap-3 py-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: isDone ? "var(--sage)" : "var(--step-inactive)" }}>
                    {isDone && <IconCheck size={14} className="text-white" />}
                  </div>
                  <span className="text-[14px]" style={{ color: isDone ? "var(--sage-text)" : "var(--ink-muted)" }}>{label}</span>
                </div>
              );
            })}
          </div>

          <button type="button" onClick={handleCancel} data-pressable=""
            className="w-full h-10 mt-3 rounded-[12px] text-[14px] font-medium no-select"
            style={{ border: "1px solid var(--surface-border)", color: "var(--ink)" }}>
            Cancel booking
          </button>
        </>
      )}

      {/* ── IN PROGRESS ── */}
      {phase === "in_progress" && booking && (
        <div className="text-center pt-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "var(--teal-soft)" }}>
            <span className="text-[24px]">🧹</span>
          </div>
          <h2 className="text-[18px] font-medium text-ink mb-2">Cleaning in progress</h2>
          <p className="text-[14px] text-ink-muted">{helperName} is working on your {booking.service_name}</p>
        </div>
      )}

      {/* ── COMPLETED ── */}
      {phase === "completed" && booking && (
        <div className="text-center pt-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "var(--sage)" }}>
            <IconCheck size={32} className="text-white" />
          </div>
          <h2 className="text-[18px] font-medium text-ink mb-2">Job completed</h2>
          <p className="text-[14px] text-ink-muted mb-5">How was your experience with {helperName}?</p>

          {/* Rating stars */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map(star => (
              <button key={star} type="button" onClick={() => handleRate(star)}
                className="text-[32px] no-select"
                style={{ color: star <= rating ? "var(--amber)" : "var(--step-inactive)" }}>
                ★
              </button>
            ))}
          </div>

          <button type="button" onClick={() => { setPhase("idle"); setBooking(null); }} data-pressable=""
            className="w-full h-12 rounded-[12px] text-[15px] font-medium text-white no-select"
            style={{ backgroundColor: "var(--brand-rose)" }}>
            Done
          </button>
        </div>
      )}

      {/* ── EXPIRED ── */}
      {phase === "expired" && (
        <div className="text-center pt-8">
          <p className="text-[18px] font-medium text-ink mb-2">No helper available</p>
          <p className="text-[14px] text-ink-muted mb-5">All helpers are busy right now. Try again.</p>
          <button type="button" onClick={handleRetry} data-pressable=""
            className="w-full h-12 rounded-[12px] text-[15px] font-medium text-white no-select"
            style={{ backgroundColor: "var(--brand-rose)" }}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
