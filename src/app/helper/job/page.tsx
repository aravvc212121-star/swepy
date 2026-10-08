"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSwepy } from "@/lib/swepy/provider";
import { getSession } from "@/lib/swepy/session";
import { CONFIG, haversine, computeEta, formatDistance, formatEta } from "@/lib/swepy";
import type { RealtimeEvent, Booking } from "@/lib/swepy";
import HelperBottomNav from "@/components/helper-bottom-nav";
import { IconCheck, IconMapPin } from "@/components/icons";

type JobPhase = "idle" | "accepted" | "on_the_way" | "arrived" | "otp_check" | "in_progress" | "completed";

export default function HelperJobPage() {
  const { transport, store } = useSwepy();
  const session = getSession();
  const [phase, setPhase] = useState<JobPhase>("idle");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [myLat, setMyLat] = useState(28.622);
  const [myLng, setMyLng] = useState(77.214);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<number | null>(null);

  // Use browser geolocation
  useEffect(() => {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setMyLat(pos.coords.latitude);
        setMyLng(pos.coords.longitude);
      },
      () => { /* fall back to defaults */ },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  // Restore active job
  useEffect(() => {
    if (!session) return;
    const active = store.getActiveBookingForHelper(session.user_id);
    if (active) {
      setBooking(active);
      if (active.status === "accepted") setPhase("accepted");
      else if (active.status === "on_the_way") setPhase("on_the_way");
      else if (active.status === "arrived") setPhase("otp_check");
      else if (active.status === "in_progress") setPhase("in_progress");
    }
  }, [session, store]);

  // Listen for booking_assigned events
  useEffect(() => {
    if (!session) return;
    const unsub = transport.subscribe((event: RealtimeEvent) => {
      if (event.type === "booking_assigned" && event.helper_id === session.user_id) {
        const b = store.getBooking(event.booking_id);
        if (b) { setBooking(b); setPhase("accepted"); }
      }
      if (event.type === "booking_cancel" && booking && event.booking_id === booking.id) {
        setPhase("idle"); setBooking(null);
        if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
      }
    });
    return unsub;
  }, [session, transport, store, booking]);

  // Broadcast job_location when on a job
  useEffect(() => {
    if (!session || !booking || phase === "idle" || phase === "completed") return;
    const ping = () => {
      transport.send({
        type: "job_location",
        booking_id: booking.id,
        helper_id: session.user_id,
        lat: myLat, lng: myLng,
        ts: Date.now(), sender: session.user_id,
      });
    };
    ping();
    pingRef.current = setInterval(ping, CONFIG.LOCATION_PING_S * 1000);
    return () => { if (pingRef.current) clearInterval(pingRef.current); };
  }, [session, transport, booking, phase, myLat, myLng]);

  const advanceStatus = useCallback((newStatus: string, newPhase: JobPhase) => {
    if (!booking || !session) return;
    store.updateBooking(booking.id, { status: newStatus as any });
    setBooking(prev => prev ? { ...prev, status: newStatus as any } : prev);
    setPhase(newPhase);
    transport.send({
      type: "job_status",
      booking_id: booking.id,
      status: newStatus as any,
      ts: Date.now(), sender: session.user_id,
    });
  }, [booking, session, store, transport]);

  const handleStartTrip = () => advanceStatus("on_the_way", "on_the_way");
  const handleArrived = () => advanceStatus("arrived", "otp_check");

  const handleOtpSubmit = () => {
    if (!booking) return;
    if (otpInput === booking.otp) {
      setOtpError(false);
      advanceStatus("in_progress", "in_progress");
    } else {
      setOtpError(true);
    }
  };

  const handleComplete = () => advanceStatus("completed", "completed");

  if (!session || session.role !== "helper") {
    return (
      <div className="w-full max-w-[430px] mx-auto min-h-dvh flex items-center justify-center bg-app-bg px-4">
        <p className="text-[14px] text-ink-muted text-center">
          Go to <a href="/demo" className="underline" style={{ color: "var(--brand-rose)" }}>/demo</a> and pick "Helper".
        </p>
      </div>
    );
  }

  const dist = booking ? haversine({ lat: myLat, lng: myLng }, { lat: booking.lat, lng: booking.lng }) : 0;

  return (
    <>
      <div className="w-full max-w-[430px] mx-auto min-h-dvh bg-app-bg px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}>

        <h1 className="text-[20px] font-medium text-ink mb-4">Current job</h1>

        {phase === "idle" && (
          <div className="text-center py-12">
            <p className="text-[14px] text-ink-muted">No active job. Accept a request from the Orders tab.</p>
          </div>
        )}

        {phase !== "idle" && phase !== "completed" && booking && (
          <>
            {/* Location status */}
            <div className="rounded-[14px] p-3 mb-3" style={{ backgroundColor: "var(--teal-soft)", border: "0.5px solid var(--teal)" }}>
              <p className="text-[12px] font-medium" style={{ color: "var(--teal-dark)" }}>📍 Your location: {myLat.toFixed(4)}, {myLng.toFixed(4)}</p>
            </div>

            {/* Map */}
            <div className="rounded-[14px] overflow-hidden mb-3 relative" style={{ height: 180, backgroundColor: "var(--teal-soft)", border: "0.5px solid var(--surface-border)" }}>
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Customer pin */}
                <div className="absolute" style={{ left: "60%", top: "40%" }}>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "var(--brand-rose)" }} />
                  <p className="text-[9px] text-ink-muted mt-0.5">Customer</p>
                </div>
                {/* Helper pin */}
                <div className="absolute" style={{ left: "30%", top: "65%" }}>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "var(--teal)" }} />
                  <p className="text-[9px] text-ink-muted mt-0.5">You</p>
                </div>
                {/* Route line */}
                <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
                  <line x1="30%" y1="65%" x2="60%" y2="40%" stroke="var(--teal)" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.5" />
                </svg>
              </div>
            </div>

            {/* Info */}
            <div className="rounded-[14px] p-4 mb-3" style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}>
              <p className="text-[15px] font-medium text-ink mb-1">{booking.service_name} · {booking.home_size}</p>
              <div className="flex items-center gap-1.5 mb-2">
                <IconMapPin size={14} style={{ color: "var(--teal)" }} />
                <span className="text-[13px] text-ink-muted">{booking.address_full}</span>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 rounded-[10px] py-2 text-center" style={{ backgroundColor: "var(--app-bg)" }}>
                  <p className="text-[14px] font-medium text-ink">{formatDistance(dist)}</p>
                  <p className="text-[11px] text-ink-muted">Distance</p>
                </div>
                <div className="flex-1 rounded-[10px] py-2 text-center" style={{ backgroundColor: "var(--app-bg)" }}>
                  <p className="text-[14px] font-medium text-ink">~{formatEta(computeEta(dist))}</p>
                  <p className="text-[11px] text-ink-muted">ETA</p>
                </div>
              </div>
            </div>

            {/* Navigate button */}
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${booking.lat},${booking.lng}`}
              target="_blank" rel="noopener noreferrer" data-pressable=""
              className="w-full h-10 rounded-[12px] text-[14px] font-medium no-select flex items-center justify-center gap-2 mb-3 no-underline"
              style={{ backgroundColor: "var(--teal-soft)", color: "var(--teal-dark)", border: "1px solid var(--teal)" }}>
              Navigate in Google Maps
            </a>

            {/* Action buttons */}
            {phase === "accepted" && (
              <button type="button" onClick={handleStartTrip} data-pressable=""
                className="w-full h-12 rounded-[12px] text-[15px] font-medium text-white no-select"
                style={{ backgroundColor: "var(--brand-rose)" }}>
                Start trip
              </button>
            )}

            {phase === "on_the_way" && (
              <button type="button" onClick={handleArrived} data-pressable=""
                className="w-full h-12 rounded-[12px] text-[15px] font-medium text-white no-select"
                style={{ backgroundColor: "var(--brand-rose)" }}>
                I have arrived
              </button>
            )}

            {phase === "otp_check" && (
              <div className="rounded-[14px] p-4" style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}>
                <p className="text-[14px] font-medium text-ink mb-2">Enter customer OTP</p>
                <div className="flex gap-2 mb-2">
                  {[0, 1, 2, 3].map(i => (
                    <input key={i} type="text" inputMode="numeric" maxLength={1}
                      value={otpInput[i] || ""}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, "");
                        const arr = otpInput.split("");
                        arr[i] = val;
                        setOtpInput(arr.join("").slice(0, 4));
                        setOtpError(false);
                        if (val && i < 3) {
                          const next = e.target.parentElement?.children[i + 1] as HTMLInputElement;
                          next?.focus();
                        }
                      }}
                      className="flex-1 h-12 rounded-[10px] text-center text-[20px] font-medium text-ink outline-none"
                      style={{
                        backgroundColor: "var(--amber-soft)",
                        border: `1.5px solid ${otpError ? "#B3261E" : "var(--amber-border)"}`,
                        caretColor: "var(--brand-rose)",
                      }} />
                  ))}
                </div>
                {otpError && <p className="text-[12px] mb-2" style={{ color: "#B3261E" }}>Wrong OTP. Please try again.</p>}
                <button type="button" onClick={handleOtpSubmit} data-pressable=""
                  disabled={otpInput.length < 4}
                  className="w-full h-12 rounded-[12px] text-[15px] font-medium text-white no-select"
                  style={{ backgroundColor: otpInput.length < 4 ? "var(--step-inactive)" : "var(--brand-rose)" }}>
                  Verify and start
                </button>
                <button type="button" onClick={() => advanceStatus("in_progress", "in_progress")} data-pressable=""
                  className="w-full h-10 mt-2 rounded-[12px] text-[13px] font-medium no-select"
                  style={{ border: "1px dashed var(--teal)", color: "var(--teal)" }}>
                  Skip OTP (Dev)
                </button>
              </div>
            )}

            {phase === "in_progress" && (
              <button type="button" onClick={handleComplete} data-pressable=""
                className="w-full h-12 rounded-[12px] text-[15px] font-medium text-white no-select"
                style={{ backgroundColor: "var(--sage)" }}>
                Complete job
              </button>
            )}
          </>
        )}

        {phase === "completed" && (
          <div className="text-center pt-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "var(--sage)" }}>
              <IconCheck size={32} className="text-white" />
            </div>
            <h2 className="text-[18px] font-medium text-ink mb-2">Job completed</h2>
            <p className="text-[14px] text-ink-muted mb-5">Great work. The earning has been added.</p>
            <button type="button" onClick={() => { setPhase("idle"); setBooking(null); }} data-pressable=""
              className="w-full h-12 rounded-[12px] text-[15px] font-medium text-white no-select"
              style={{ backgroundColor: "var(--brand-rose)" }}>
              Back to requests
            </button>
          </div>
        )}
      </div>
      <HelperBottomNav />
    </>
  );
}
