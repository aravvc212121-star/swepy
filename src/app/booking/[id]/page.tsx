"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { formatINR, formatHomeSize } from "@/lib/utils";
import {
  IconArrowLeft,
  IconCheck,
  IconPhone,
  IconBrandWhatsapp,
  IconMapPin,
  IconNavigation,
  IconClock,
  IconChevronRight,
  IconShieldCheck,
  IconStarFilled,
  IconX,
} from "@/components/icons";
import Link from "next/link";
import BottomNav from "@/components/bottom-nav";
import { useI18n } from "@/lib/i18n";
import { useGeo } from "@/lib/geo-store";
import { useSwepy } from "@/lib/swepy/provider";
import { getSession } from "@/lib/swepy/session";
import { CONFIG, haversine, computeEta, formatDistance, formatEta } from "@/lib/swepy";
import type { RealtimeEvent, Booking as SwepyBooking } from "@/lib/swepy";

/* ── Design tokens ── */
const C = {
  brand: "var(--brand-rose)",
  brandTint: "var(--blush)",
  routeLine: "var(--teal)",
  ink: "var(--ink)",
  secondary: "var(--ink-muted)",
  hint: "var(--ink-muted)",
  hairline: "var(--surface-border)",
  cardFill: "var(--card-fill)",
  white: "var(--surface)",
  success: "var(--sage)",
  danger: "#B3261E",
} as const;

/* ── Status helpers ── */
type TrackingStatus = "searching" | "accepted" | "on_the_way" | "arrived" | "in_progress" | "completed" | "cancelled" | "expired";

const STEP_KEYS = ["booked", "onTheWay", "arrived", "done"] as const;

function getStepStatuses(status: TrackingStatus): ("completed" | "active" | "upcoming")[] {
  switch (status) {
    case "searching":
    case "accepted":
      return ["completed", "active", "upcoming", "upcoming"];
    case "on_the_way":
      return ["completed", "active", "upcoming", "upcoming"];
    case "arrived":
      return ["completed", "completed", "active", "upcoming"];
    case "in_progress":
      return ["completed", "completed", "completed", "active"];
    case "completed":
      return ["completed", "completed", "completed", "completed"];
    case "cancelled":
    case "expired":
      return ["completed", "upcoming", "upcoming", "upcoming"];
    default:
      return ["completed", "active", "upcoming", "upcoming"];
  }
}

function getHeadline(status: TrackingStatus, name: string, etaMin: number, t: (k: string, v?: Record<string, string | number>) => string): string {
  switch (status) {
    case "searching": return t("booking.searching");
    case "accepted":
    case "on_the_way": return t("booking.arrivingIn", { name, eta: etaMin });
    case "arrived": return t("booking.hasArrived", { name });
    case "in_progress": return t("booking.inProgress");
    case "completed": return t("booking.completed");
    case "cancelled": return t("booking.cancelled");
    case "expired": return "No helper found";
    default: return t("booking.arrivingIn", { name, eta: etaMin });
  }
}

function getStatusLabel(status: TrackingStatus, t: (k: string) => string): string {
  switch (status) {
    case "searching": return t("booking.searching");
    case "accepted":
    case "on_the_way": return t("booking.onTheWay");
    case "arrived": return t("booking.arrived");
    case "in_progress": return t("booking.inProgress");
    case "completed": return t("booking.completed");
    case "cancelled": return t("booking.cancelled");
    case "expired": return "Expired";
    default: return t("booking.onTheWay");
  }
}

/* ── Map Component ── */
function TrackingMap({
  helperProgress,
  helperInitial,
  lat,
  lng,
}: {
  helperProgress: number;
  helperInitial: string;
  lat: number | null;
  lng: number | null;
}) {
  if (lat && lng) {
    const helperLat = lat + 0.0015 * (1 - helperProgress);
    const helperLng = lng - 0.002 * (1 - helperProgress);

    return (
      <div className="relative w-full overflow-hidden" style={{ height: "clamp(220px, 36vh, 280px)" }}>
        <iframe
          title="Tracking map"
          style={{
            border: 0,
            display: "block",
            pointerEvents: "none",
            width: "100%",
            height: "calc(100% + 60px)",
            marginTop: "-30px"
          }}
          loading="eager"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.003}%2C${lat - 0.002}%2C${lng + 0.003}%2C${lat + 0.002}&layer=mapnik&marker=${lat}%2C${lng}`}
        />
        <div
          className="absolute transition-all duration-[5000ms] ease-linear"
          style={{
            left: `${50 - (lng - helperLng) * 16666.66}%`,
            top: `${50 - (helperLat - lat) * 25000}%`,
            transform: "translate(-50%, -50%)",
            zIndex: 10,
          }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium text-white"
            style={{
              backgroundColor: "var(--brand-rose)",
              border: "2.5px solid var(--surface)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            }}
          >
            {helperInitial}
          </div>
        </div>
      </div>
    );
  }

  // Fallback SVG
  const hx = 60 + helperProgress * 260;
  const hy = hx <= 180 ? 70 : 70 + ((hx - 180) / 140) * 100;
  const clampedHx = Math.min(hx, 320);
  const clampedHy = Math.min(hy, 170);

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "clamp(220px, 36vh, 280px)", backgroundColor: "var(--app-bg)" }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="400" height="240" fill="var(--app-bg)" />
        <line x1="0" y1="70" x2="400" y2="70" stroke="var(--surface)" strokeWidth="10" />
        <line x1="0" y1="130" x2="400" y2="130" stroke="var(--surface)" strokeWidth="8" />
        <line x1="0" y1="180" x2="400" y2="180" stroke="var(--surface)" strokeWidth="10" />
        <line x1="80" y1="0" x2="80" y2="240" stroke="var(--surface)" strokeWidth="8" />
        <line x1="180" y1="0" x2="180" y2="240" stroke="var(--surface)" strokeWidth="10" />
        <line x1="320" y1="0" x2="320" y2="240" stroke="var(--surface)" strokeWidth="8" />
        <path d="M 60 70 L 180 70 L 180 130 L 320 130 L 320 180" stroke={C.routeLine} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
        <path d="M 60 70 L 180 70 L 180 130 L 320 130 L 320 180" stroke={C.routeLine} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div
        className="absolute transition-all duration-[5000ms] ease-linear"
        style={{ left: `${(clampedHx / 400) * 100}%`, top: `${(clampedHy / 240) * 100}%`, transform: "translate(-50%, -50%)" }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium text-white"
          style={{ backgroundColor: C.brand, border: `2.5px solid ${C.white}`, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
        >
          {helperInitial}
        </div>
      </div>
      <div className="absolute" style={{ left: `${(320 / 400) * 100}%`, top: `${(180 / 240) * 100}%`, transform: "translate(-50%, -50%)" }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: C.white, border: `2px solid ${C.brand}`, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
          <IconMapPin size={16} style={{ color: C.brand }} />
        </div>
      </div>
    </div>
  );
}

/* ── Progress Stepper ── */
function Stepper({ statuses, t }: { statuses: ("completed" | "active" | "upcoming")[]; t: (k: string) => string }) {
  return (
    <ol className="flex items-start gap-0 w-full list-none m-0 p-0" aria-label="Booking progress">
      {STEP_KEYS.map((key, i) => {
        const s = statuses[i];
        const isLast = i === STEP_KEYS.length - 1;
        return (
          <li
            key={key}
            className="flex flex-col items-center"
            style={{ flex: isLast ? "none" : 1 }}
            aria-current={s === "active" ? "step" : undefined}
          >
            <div className="flex items-center w-full">
              <div className="shrink-0">
                {s === "completed" ? (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: C.brand }}>
                    <IconCheck size={14} className="text-white" strokeWidth={2.5} />
                  </div>
                ) : s === "active" ? (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ border: `2.5px solid ${C.brand}`, backgroundColor: C.white }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: C.brand }} />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: C.hairline }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: C.hint }} />
                  </div>
                )}
              </div>
              {!isLast && (
                <div
                  className="flex-1 h-[2px] mx-1"
                  style={{
                    backgroundColor: statuses[i + 1] === "upcoming" ? C.hairline : C.brand,
                    transition: "background-color 300ms ease",
                  }}
                />
              )}
            </div>
            <span
              className="mt-1.5 text-center leading-tight"
              style={{
                fontSize: "12px",
                fontWeight: s === "active" ? 500 : 400,
                color: s === "active" ? C.ink : s === "completed" ? C.secondary : C.hint,
              }}
            >
              {t(`booking.${key}`)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ── Cancel Dialog ── */
function CancelDialog({ onConfirm, onCancel, t }: { onConfirm: () => void; onCancel: () => void; t: (k: string) => string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-[430px] rounded-t-[24px] p-5" style={{ backgroundColor: "var(--surface)", paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))" }}>
        <h3 className="text-[16px] font-medium mb-1" style={{ color: C.ink }}>{t("booking.cancelConfirmTitle")}</h3>
        <p className="text-[14px] mb-5" style={{ color: C.secondary }}>{t("booking.cancelConfirmMsg")}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 h-12 rounded-[12px] text-[14px] font-medium" style={{ border: `1px solid ${C.hairline}`, color: C.ink }}>
            {t("booking.keepBooking")}
          </button>
          <button onClick={onConfirm} className="flex-1 h-12 rounded-[12px] text-[14px] font-medium text-white" style={{ backgroundColor: C.danger }}>
            {t("booking.confirmCancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function BookedPage() {
  const { t, formatCurrency, locale } = useI18n();
  const geo = useGeo();
  const params = useParams();
  const router = useRouter();
  const { store, transport, ready } = useSwepy();
  const session = getSession();

  const bookingId = params.id as string;

  // Real booking from store
  const [booking, setBooking] = useState<SwepyBooking | null>(null);
  const [status, setStatus] = useState<TrackingStatus>("searching");
  const [etaMin, setEtaMin] = useState(8);
  const [helperProgress, setHelperProgress] = useState(0.15);
  const [distance, setDistance] = useState<number | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [rating, setRating] = useState(0);

  // Load booking from store or API
  useEffect(() => {
    if (!ready) return;

    if (bookingId === 'demo') {
      // Keep demo as a fixture using the local store
      const b = store.getBooking(bookingId);
      if (b) {
        setBooking(b);
        setStatus(b.status as TrackingStatus);
        if (b.helper_lat && b.helper_lng) {
          const dist = haversine({ lat: b.lat, lng: b.lng }, { lat: b.helper_lat, lng: b.helper_lng });
          setDistance(dist);
          setEtaMin(Math.max(1, Math.round(computeEta(dist))));
        }
      }
    } else {
      // Fetch real data from the API
      fetch(`/api/bookings/${bookingId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.booking) {
            // Map DB booking to UI booking structure
            const dbBooking = data.booking;
            setBooking({
              id: dbBooking.id,
              user_id: dbBooking.customer_id,
              user_name: 'Customer',
              service_name: dbBooking.service_code || 'Service',
              home_size: dbBooking.home_size || 'Home',
              address_short: 'Address',
              address_full: 'Full Address',
              lat: 12.9716, // Use default or parse from address_snapshot
              lng: 77.5946,
              price: dbBooking.price_paise / 100,
              otp: dbBooking.start_code || '0000',
              status: dbBooking.status,
              helper_id: dbBooking.helper_id,
              helper_name: dbBooking.helper_id ? 'Helper' : null,
              helper_lat: 12.9720,
              helper_lng: 77.5950,
              radius_step: dbBooking.dispatch_wave,
              rating: null,
              created_at: dbBooking.created_at,
              updated_at: dbBooking.updated_at || dbBooking.created_at,
            });
            setStatus(dbBooking.status as TrackingStatus);
            setDistance(0.5); // Mock distance since DB doesn't track live location yet
            setEtaMin(5);
          }
        })
        .catch(console.error);
    }
  }, [ready, store, bookingId]);

  // Listen for realtime events
  useEffect(() => {
    if (!ready || !session || !booking) return;
    const unsub = transport.subscribe((event: RealtimeEvent) => {
      if (event.sender === session.user_id) return;

      // Helper location pings
      if (event.type === "job_location" && event.booking_id === bookingId) {
        setBooking(prev => prev ? { ...prev, helper_lat: event.lat, helper_lng: event.lng } : prev);
        store.updateBooking(bookingId, { helper_lat: event.lat, helper_lng: event.lng });
        if (booking) {
          const dist = haversine({ lat: booking.lat, lng: booking.lng }, { lat: event.lat, lng: event.lng });
          setDistance(dist);
          setEtaMin(Math.max(1, Math.round(computeEta(dist))));
          // Update progress 0..1 based on distance (closer = higher progress)
          const maxDist = 2; // 2 km max
          setHelperProgress(Math.min(0.95, Math.max(0.15, 1 - dist / maxDist)));
        }
      }

      // Job status changes from helper
      if (event.type === "job_status" && event.booking_id === bookingId) {
        const newStatus = event.status as TrackingStatus;
        setStatus(newStatus);
        setBooking(prev => prev ? { ...prev, status: newStatus as any } : prev);
        store.updateBooking(bookingId, { status: newStatus as any });
      }

      // Helper accepted (for when navigated here from searching before assignment)
      if (event.type === "booking_accept" && event.booking_id === bookingId && status === "searching") {
        const updated = store.updateBooking(bookingId, {
          status: "accepted",
          helper_id: event.helper_id,
          helper_name: event.helper_name,
          helper_lat: event.lat,
          helper_lng: event.lng,
        });
        if (updated) {
          setBooking(updated);
          setStatus("accepted");
          transport.send({
            type: "booking_assigned",
            booking_id: bookingId,
            helper_id: event.helper_id,
            helper_name: event.helper_name,
            ts: Date.now(),
            sender: session.user_id,
          });
        }
      }
    });
    return unsub;
  }, [ready, session, transport, store, booking, bookingId, status]);

  // Simulate helper progress for demo
  useEffect(() => {
    if (status !== "on_the_way" && status !== "accepted") return;
    const interval = setInterval(() => {
      setHelperProgress(prev => Math.min(0.92, prev + 0.015));
    }, 4000);
    return () => clearInterval(interval);
  }, [status]);

  // Sticky header
  const statusRowRef = useRef<HTMLDivElement>(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  useEffect(() => {
    const el = statusRowRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowStickyHeader(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-60px 0px 0px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Arriving time
  const arrivingByTime = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + etaMin);
    return now.toLocaleTimeString(locale === "hi" ? "hi-IN" : "en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  }, [etaMin, locale]);

  // Cancel handler
  const handleCancel = useCallback(() => {
    if (booking && session) {
      store.updateBooking(booking.id, { status: "cancelled" as any });
      transport.send({ type: "booking_cancel", booking_id: booking.id, ts: Date.now(), sender: session.user_id });
    }
    setShowCancelDialog(false);
    router.push("/");
  }, [booking, session, store, transport, router]);

  // Rate
  const handleRate = useCallback((stars: number) => {
    setRating(stars);
    if (booking) {
      store.updateBooking(booking.id, { rating: stars });
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
    }
  }, [booking, store]);

  // No booking found
  if (ready && !booking) {
    return (
      <>
        <div className="mobile-frame min-h-screen bg-app-bg flex flex-col items-center justify-center px-6"
          style={{ paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: "var(--surface)" }}>
            <span className="text-[28px]">📋</span>
          </div>
          <h2 className="text-[18px] font-medium text-ink mb-2">No active booking</h2>
          <p className="text-[14px] text-ink-muted text-center mb-6">
            You don&apos;t have any active booking right now. Book a helper from the home screen.
          </p>
          <Link
            href="/"
            className="w-full max-w-[280px] h-12 rounded-[12px] text-[14px] font-medium text-white flex items-center justify-center no-underline"
            style={{ backgroundColor: "var(--brand-rose)" }}
          >
            Go to home
          </Link>
        </div>
        <BottomNav />
      </>
    );
  }

  // Loading
  if (!booking) {
    return (
      <>
        <div className="mobile-frame min-h-screen bg-app-bg flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--brand-rose)", borderTopColor: "transparent" }} />
        </div>
        <BottomNav />
      </>
    );
  }

  const helperName = booking.helper_name || "Helper";
  const helperInitial = helperName.charAt(0).toUpperCase();
  const otpDigits = booking.otp.split("");
  const showOtp = status === "on_the_way" || status === "accepted" || status === "arrived";
  const otpVerified = status === "in_progress" || status === "completed";
  const showHelper = status !== "searching" && status !== "cancelled" && status !== "expired" && booking.helper_name;
  const showMap = status !== "completed" && status !== "cancelled" && status !== "expired";
  const showActions = status !== "completed" && status !== "cancelled" && status !== "expired";
  const headline = getHeadline(status, helperName, etaMin, t);
  const statusLabel = getStatusLabel(status, t);
  const stepStatuses = getStepStatuses(status);

  return (
    <>
      {/* Sticky mini-header */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30 transition-transform duration-200"
        style={{
          transform: showStickyHeader ? "translateY(0) translateX(-50%)" : "translateY(-100%) translateX(-50%)",
          backgroundColor: C.white,
          borderBottom: `1px solid ${C.hairline}`,
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="flex items-center gap-3 px-4 py-2.5">
          <Link
            href="/"
            className="w-9 h-9 flex items-center justify-center rounded-full shrink-0"
            style={{ border: `1px solid ${C.hairline}` }}
            aria-label={t("common.back")}
          >
            <IconArrowLeft size={18} style={{ color: C.ink }} />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium truncate" style={{ color: C.ink }}>{headline}</p>
            <p className="text-[12px]" style={{ color: C.brand }}>{statusLabel}</p>
          </div>
        </div>
      </div>

      <div className="mobile-frame min-h-screen" style={{ backgroundColor: "var(--app-bg)", paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}>
        {/* ── Map Hero ── */}
        {showMap && (
          <div className="relative">
            <TrackingMap helperProgress={helperProgress} helperInitial={helperInitial} lat={geo.lat} lng={geo.lng} />
            <Link
              href="/"
              className="absolute flex items-center justify-center rounded-full"
              style={{
                top: "calc(env(safe-area-inset-top, 0px) + 12px)", left: 16,
                width: 36, height: 36,
                backgroundColor: C.white, boxShadow: "0 1px 6px rgba(0,0,0,0.1)",
                minWidth: 44, minHeight: 44, padding: 4,
              }}
              aria-label={t("common.back")}
            >
              <IconArrowLeft size={18} style={{ color: C.ink }} />
            </Link>
            <div
              className="absolute flex items-center gap-1.5 rounded-full px-3"
              style={{
                bottom: 32, left: 16, height: 32,
                backgroundColor: C.white, boxShadow: "0 1px 6px rgba(0,0,0,0.1)",
                fontSize: 12, fontWeight: 500, color: C.ink,
              }}
            >
              <IconClock size={14} style={{ color: C.brand }} />
              ~{etaMin} {t("booking.min")} {distance !== null ? `· ${formatDistance(distance)}` : ""}
            </div>
          </div>
        )}

        {/* ── Bottom Sheet ── */}
        <div
          className="relative"
          style={{
            backgroundColor: "var(--app-bg)",
            marginTop: showMap ? "-20px" : 0,
            borderRadius: showMap ? "24px 24px 0 0" : 0,
            paddingTop: showMap ? 8 : "calc(env(safe-area-inset-top, 0px) + 12px)",
          }}
        >
          {showMap && (
            <div className="flex justify-center pt-2 pb-3">
              <div className="w-8 h-1 rounded-full" style={{ backgroundColor: C.hairline }} />
            </div>
          )}

          {!showMap && (
            <div className="flex items-center gap-3 px-4 pb-4">
              <Link href="/" className="w-9 h-9 flex items-center justify-center rounded-full shrink-0" style={{ border: `1px solid ${C.hairline}` }} aria-label={t("common.back")}>
                <IconArrowLeft size={18} style={{ color: C.ink }} />
              </Link>
              <h1 className="text-[16px] font-medium" style={{ color: C.ink }}>{headline}</h1>
            </div>
          )}

          <div className="px-4 space-y-3">
            {/* a. Status row */}
            <div ref={statusRowRef}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status === "cancelled" || status === "expired" ? C.danger : C.brand }} />
                  <span className="text-[14px] font-medium" style={{ color: status === "cancelled" || status === "expired" ? C.danger : C.brand }}>
                    {statusLabel}
                  </span>
                </div>
                <span className="text-[12px]" style={{ color: C.hint }}>{booking.id}</span>
              </div>
              <h1 className="text-[22px] font-medium leading-tight" style={{ color: C.ink }}>{headline}</h1>
              {(status === "on_the_way" || status === "accepted") && (
                <p className="text-[14px] mt-0.5" style={{ color: C.secondary }}>
                  {t("booking.arrivingBy", { time: arrivingByTime })}
                </p>
              )}
            </div>

            {/* b. Stepper */}
            <div className="py-2">
              <Stepper statuses={stepStatuses} t={t} />
            </div>

            {/* c. Helper card */}
            {showHelper && (
              <div className="rounded-[16px] p-4 flex items-center gap-3" style={{ backgroundColor: C.cardFill, border: `1px solid ${C.hairline}` }}>
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-[16px] font-medium" style={{ backgroundColor: C.brandTint, color: C.brand }}>
                    {helperInitial}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: C.success, border: `2px solid ${C.cardFill}` }}>
                    <IconCheck size={10} className="text-white" strokeWidth={3} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-medium" style={{ color: C.ink }}>{helperName}</p>
                  <p className="text-[14px]" style={{ color: C.secondary }}>{booking.service_name} · {booking.home_size}</p>
                  <p className="text-[12px] mt-0.5" style={{ color: C.hint }}>{t("booking.yourSwepyPro")}</p>
                </div>
              </div>
            )}

            {/* d. OTP card */}
            {(showOtp || otpVerified) && (
              <div className="rounded-[16px] p-4" style={{ backgroundColor: C.cardFill, border: `1px solid ${C.hairline}` }}>
                {otpVerified ? (
                  <div className="flex items-center gap-3 justify-center py-2">
                    <div className="w-10 h-10 rounded-[12px] flex items-center justify-center" style={{ backgroundColor: C.brandTint }}>
                      <IconShieldCheck size={20} style={{ color: C.success }} />
                    </div>
                    <span className="text-[14px] font-medium" style={{ color: C.success }}>{t("booking.codeVerified")}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-[12px] flex items-center justify-center" style={{ backgroundColor: C.brandTint }}>
                        <IconShieldCheck size={18} style={{ color: C.brand }} />
                      </div>
                      <div>
                        <p className="text-[14px] font-medium" style={{ color: C.ink }}>{t("booking.yourStartCode")}</p>
                        <p className="text-[12px]" style={{ color: C.secondary }}>
                          {t("booking.shareOtp", { name: helperName })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2.5 justify-center">
                      {otpDigits.map((digit, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-center rounded-[12px]"
                          style={{
                            width: 52, height: 56,
                            backgroundColor: C.white,
                            border: `1px solid ${C.hairline}`,
                            fontSize: 24, fontWeight: 500, color: C.ink,
                          }}
                        >
                          {digit}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* e. Booking details card */}
            <div className="rounded-[16px] p-4" style={{ backgroundColor: C.cardFill, border: `1px solid ${C.hairline}` }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[14px] font-medium" style={{ color: C.ink }}>{t("booking.bookingDetails")}</span>
                <span className="text-[12px]" style={{ color: C.hint }}>{booking.id}</span>
              </div>
              <div className="space-y-0">
                {[
                  { label: t("booking.service"), value: booking.service_name },
                  { label: t("booking.homeSize"), value: booking.home_size },
                  { label: t("booking.when"), value: "Instant" },
                  { label: t("booking.address"), value: booking.address_short },
                ].map((row, i, arr) => (
                  <div key={row.label} className="flex items-center justify-between py-3" style={i < arr.length - 1 ? { borderBottom: `1px solid ${C.hairline}` } : undefined}>
                    <span className="text-[14px]" style={{ color: C.secondary }}>{row.label}</span>
                    <span className="text-[14px] font-medium text-right max-w-[55%] truncate" style={{ color: C.ink }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* f. Payment summary */}
            <div className="rounded-[16px] p-4" style={{ backgroundColor: C.cardFill, border: `1px solid ${C.hairline}` }}>
              <span className="text-[14px] font-medium" style={{ color: C.ink }}>{t("booking.paymentSummary")}</span>
              <div className="mt-3">
                <div className="flex justify-between py-2">
                  <span className="text-[14px]" style={{ color: C.secondary }}>{booking.service_name} · {booking.home_size}</span>
                  <span className="text-[14px]" style={{ color: C.ink }}>{formatCurrency(booking.price)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[14px]" style={{ color: C.secondary }}>{t("booking.taxesFees")}</span>
                  <span className="text-[14px]" style={{ color: C.ink }}>{formatCurrency(0)}</span>
                </div>
                <div className="pt-2 mt-1 flex justify-between" style={{ borderTop: `1px solid ${C.hairline}` }}>
                  <span className="text-[16px] font-medium" style={{ color: C.ink }}>{t("booking.total")}</span>
                  <span className="text-[16px] font-medium" style={{ color: C.ink }}>{formatCurrency(booking.price)}</span>
                </div>
              </div>
              <div className="mt-3 rounded-[12px] px-3 py-2 text-center text-[12px] font-medium" style={{ backgroundColor: C.brandTint, color: C.brand }}>
                {t("booking.payAfterChip")}
              </div>
            </div>

            {/* g. Completed: rating */}
            {status === "completed" && (
              <div className="rounded-[16px] p-4 text-center" style={{ backgroundColor: C.cardFill, border: `1px solid ${C.hairline}` }}>
                <p className="text-[14px] font-medium mb-3" style={{ color: C.ink }}>Rate your experience</p>
                <div className="flex items-center justify-center gap-2 mb-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} type="button" onClick={() => handleRate(star)}
                      className="text-[28px] no-select"
                      style={{ color: star <= rating ? "#F5A623" : C.hairline }}>
                      ★
                    </button>
                  ))}
                </div>
                {rating > 0 && <p className="text-[13px]" style={{ color: C.success }}>Thanks for your feedback!</p>}
              </div>
            )}

            {/* h. Actions */}
            {showActions && (
              <>
                <div className="flex gap-3">
                  <button className="flex-1 h-12 rounded-[12px] text-[14px] font-medium" style={{ border: `1px solid ${C.hairline}`, color: C.ink }}>
                    {t("booking.reschedule")}
                  </button>
                  <button onClick={() => setShowCancelDialog(true)} className="flex-1 h-12 rounded-[12px] text-[14px] font-medium" style={{ border: `1px solid ${C.hairline}`, color: C.danger }}>
                    {t("booking.cancelBooking")}
                  </button>
                </div>
                <Link href="/help" className="flex items-center justify-between rounded-[16px] px-4 py-3.5 no-underline" style={{ backgroundColor: C.cardFill, border: `1px solid ${C.hairline}` }}>
                  <span className="text-[14px]" style={{ color: C.secondary }}>{t("booking.needHelp")}</span>
                  <IconChevronRight size={18} style={{ color: C.hint }} />
                </Link>
              </>
            )}

            <div className="h-4" />
          </div>
        </div>
      </div>

      {showCancelDialog && (
        <CancelDialog t={t} onCancel={() => setShowCancelDialog(false)} onConfirm={handleCancel} />
      )}

      <BottomNav />
    </>
  );
}
