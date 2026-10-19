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
type TrackingStatus = "searching" | "accepted" | "confirmed" | "on_the_way" | "arrived" | "in_progress" | "completed" | "cancelled" | "expired" | "no_helper_found";

const STEP_KEYS = ["booked", "onTheWay", "arrived", "done"] as const;

function getStepStatuses(status: TrackingStatus): ("completed" | "active" | "upcoming")[] {
  switch (status) {
    case "searching":
      return ["active", "upcoming", "upcoming", "upcoming"];
    case "accepted":
    case "on_the_way":
      return ["completed", "active", "upcoming", "upcoming"];
    case "arrived":
      return ["completed", "completed", "active", "upcoming"];
    case "confirmed":
    case "in_progress":
      return ["completed", "completed", "completed", "active"];
    case "completed":
      return ["completed", "completed", "completed", "completed"];
    case "cancelled":
    case "expired":
    case "no_helper_found":
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
    case "confirmed": return "Order confirmed";
    case "in_progress": return t("booking.inProgress");
    case "completed": return "Order Done! 🎉";
    case "cancelled": return t("booking.cancelled");
    case "expired":
    case "no_helper_found": return "No helper found";
    default: return "Order confirmed";
  }
}

function getStatusLabel(status: TrackingStatus, t: (k: string) => string): string {
  switch (status) {
    case "searching": return t("booking.searching");
    case "accepted":
    case "on_the_way": return t("booking.onTheWay");
    case "arrived": return t("booking.arrived");
    case "confirmed": return "Order confirmed";
    case "in_progress": return t("booking.inProgress");
    case "completed": return t("booking.completed");
    case "cancelled": return t("booking.cancelled");
    case "expired":
    case "no_helper_found": return "No helper found";
    default: return "Order confirmed";
  }
}

import dynamic from "next/dynamic";
const LiveMap = dynamic(() => import("@/components/live-map"), { ssr: false });
import { realtimeGateway, LiveBookingUpdate } from "@/lib/swepy/realtime-gateway";

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
  const [session, setSession] = useState<any>(null);

  const bookingId = params.id as string;

  // Real booking from store
  const [booking, setBooking] = useState<SwepyBooking | null>(null);
  const [status, setStatus] = useState<TrackingStatus>("searching");
  const [etaMin, setEtaMin] = useState(8);
  const [distance, setDistance] = useState<number | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [rating, setRating] = useState(0);

  // Live tracking states
  const [helperLivePosition, setHelperLivePosition] = useState<{
    lat: number;
    lng: number;
    heading_deg?: number | null;
    stale?: boolean;
  } | null>(null);
  const [liveRoute, setLiveRoute] = useState<{
    geometry: { type: "LineString"; coordinates: [number, number][] };
    distance_m: number;
    duration_s: number;
    source: "ors" | "straight_line";
  } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isUnavailable, setIsUnavailable] = useState<boolean>(false);
  const [lastUpdatedSec, setLastUpdatedSec] = useState<number | null>(null);
  const [isApproximateEta, setIsApproximateEta] = useState<boolean>(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const statusRef = useRef<TrackingStatus>(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Initialize session
  useEffect(() => {
    setSession(getSession());
  }, []);

  // Auto-redirect to orders history when completed
  useEffect(() => {
    if (status !== "completed") {
      setRedirectCountdown(null);
      return;
    }

    setRedirectCountdown(5);
    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          router.push("/orders?tab=history");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, router]);

  // Realtime Gateway: subscribe to live tracking API
  useEffect(() => {
    // If booking is already terminal, never subscribe or poll
    if (status === "completed" || status === "cancelled") {
      return;
    }

    const unsub = realtimeGateway.subscribe(
      bookingId,
      (data: LiveBookingUpdate) => {
        // Disallow polling updates if already terminal
        if (statusRef.current === "completed" || statusRef.current === "cancelled") {
          return;
        }

        if (data.booking_status) {
          const s = data.booking_status as TrackingStatus;
          if (s === "completed") {
            setStatus("completed");
            setBooking(prev => (prev ? { ...prev, status: "completed" as any } : prev));
            store.updateBooking(bookingId, { status: "completed" as any });
            return;
          }

          if (s !== statusRef.current) {
            setStatus(s);
            setBooking(prev => (prev ? { ...prev, status: s as any } : prev));
          }
        }

        if (data.helper) {
          setHelperLivePosition(data.helper);
          setIsLocating(false);
          if (data.helper.updated_at) {
            const ageSec = Math.max(1, Math.round((Date.now() - new Date(data.helper.updated_at).getTime()) / 1000));
            setLastUpdatedSec(ageSec);
            setIsUnavailable(ageSec > 90);
          }
        } else {
          // If in sharing window but no location ping yet
          if (["assigned", "accepted", "on_the_way", "arrived"].includes(data.booking_status)) {
            setIsLocating(true);
          }
          setHelperLivePosition(null);
        }

        if (data.route) {
          setLiveRoute(data.route);
          setIsApproximateEta(data.route.source === "straight_line");
        }

        if (data.eta_minutes !== undefined && data.eta_minutes !== null) {
          setEtaMin(data.eta_minutes);
        }

        if (data.distance_m !== undefined && data.distance_m !== null) {
          setDistance(data.distance_m / 1000);
        }
      },
      (err) => {
        // Network error: keep last position and retry with backoff
        console.warn("[LiveTracking] Polling warning:", err.message);
      }
    );

    return unsub;
  }, [bookingId, status, store]);

  // Load booking from store or API
  useEffect(() => {
    if (!ready) return;

    // 1. Try local store first (where searching page created or updated it!)
    const local = store.getBooking(bookingId);
    if (local) {
      setBooking(local);
      if (statusRef.current !== "completed" || local.status === "completed") {
        setStatus(local.status as TrackingStatus);
      }
      if (local.helper_lat && local.helper_lng) {
        const dist = haversine({ lat: local.lat, lng: local.lng }, { lat: local.helper_lat, lng: local.helper_lng });
        setDistance(dist);
        setEtaMin(Math.max(1, Math.round(computeEta(dist))));
        setHelperLivePosition({
          lat: local.helper_lat,
          lng: local.helper_lng,
          stale: false,
        });
        setIsLocating(false);
      }
      return;
    }

    // 2. Fetch from API (active order or specific booking ID)
    const fetchUrl = (bookingId === "active" || !bookingId) ? "/api/bookings/active" : `/api/bookings/${bookingId}`;
    fetch(fetchUrl)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.booking) {
            const dbBooking = data.booking;
            const newB: SwepyBooking = {
              id: dbBooking.id,
              user_id: dbBooking.customer_id,
              user_name: 'Customer',
              service_name: dbBooking.service_code || 'Service',
              home_size: dbBooking.home_size || 'Home',
              address_short: 'Address',
              address_full: 'Full Address',
              lat: dbBooking.user_lat || 28.6139,
              lng: dbBooking.user_lng || 77.2090,
              price: (dbBooking.price_paise || 29900) / 100,
              otp: dbBooking.otp || dbBooking.start_code || '4821',
              status: dbBooking.status,
              helper_id: dbBooking.helper_id,
              helper_name: dbBooking.helper_name || (dbBooking.helper_id ? 'Helper' : null),
              helper_lat: dbBooking.helper_lat || 28.6069,
              helper_lng: dbBooking.helper_lng || 77.2030,
              radius_step: dbBooking.dispatch_wave,
              rating: null,
              created_at: dbBooking.created_at,
              updated_at: dbBooking.updated_at || dbBooking.created_at,
            };
            setBooking(newB);
            setStatus(dbBooking.status as TrackingStatus);
            setDistance(0.8);
            setEtaMin(6);
            if (newB.helper_lat && newB.helper_lng) {
              setHelperLivePosition({
                lat: newB.helper_lat,
                lng: newB.helper_lng,
                stale: false,
              });
            }
          } else if (bookingId !== "active") {
            // Also try active endpoint as fallback
            fetch("/api/bookings/active")
              .then(r => r.json())
              .then(d => {
                if (d.success && d.booking) {
                  const dbB = d.booking;
                  const mapped: SwepyBooking = {
                    id: dbB.id,
                    user_id: dbB.customer_id,
                    user_name: 'Customer',
                    service_name: dbB.service_code || 'Service',
                    home_size: dbB.home_size || 'Home',
                    address_short: 'Address',
                    address_full: 'Full Address',
                    lat: dbB.user_lat || 28.6139,
                    lng: dbB.user_lng || 77.2090,
                    price: (dbB.price_paise || 29900) / 100,
                    otp: dbB.otp || dbB.start_code || '4821',
                    status: dbB.status,
                    helper_id: dbB.helper_id,
                    helper_name: dbB.helper_name || (dbB.helper_id ? 'Helper' : null),
                    helper_lat: dbB.helper_lat || 28.6069,
                    helper_lng: dbB.helper_lng || 77.2030,
                    radius_step: dbB.dispatch_wave,
                    rating: null,
                    created_at: dbB.created_at,
                    updated_at: dbB.updated_at || dbB.created_at,
                  };
                  setBooking(mapped);
                  setStatus(dbB.status as TrackingStatus);
                }
              }).catch(() => {});
          }
        })
        .catch(console.error);
  }, [ready, store, bookingId]);

  // Sync state across tabs if helper completed or updated booking in localStorage
  useEffect(() => {
    const handleStorage = () => {
      const b = store.getBooking(bookingId);
      if (b) {
        if (statusRef.current === "completed" && b.status !== "completed") {
          return;
        }
        if (b.status !== statusRef.current) {
          setStatus(b.status as TrackingStatus);
          setBooking(b);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [bookingId, store]);

  // Listen for realtime events
  useEffect(() => {
    if (!ready) return;
    const unsub = transport.subscribe((event: RealtimeEvent) => {
      if (session && event.sender === session.user_id) return;

      // If booking is already completed, ignore location or assignment updates
      if (statusRef.current === "completed" && event.type !== "job_status") {
        return;
      }

      // Helper location pings
      if (event.type === "job_location" && event.booking_id === bookingId) {
        if (statusRef.current === "completed") return;
        setBooking(prev => prev ? { ...prev, helper_lat: event.lat, helper_lng: event.lng } : prev);
        store.updateBooking(bookingId, { helper_lat: event.lat, helper_lng: event.lng });
        setHelperLivePosition({
          lat: event.lat,
          lng: event.lng,
          heading_deg: event.heading_deg ?? null,
          stale: false,
        });
        setIsLocating(false);
        setLastUpdatedSec(1);
        setBooking(prev => {
          if (prev) {
            const dist = haversine({ lat: prev.lat, lng: prev.lng }, { lat: event.lat, lng: event.lng });
            setDistance(dist);
            setEtaMin(Math.max(1, Math.round(computeEta(dist))));
          }
          return prev;
        });
      }

      // Also listen to general helper_location if helper_id matches
      if (event.type === "helper_location" && booking && event.helper_id === booking.helper_id) {
        if (statusRef.current === "completed") return;
        setBooking(prev => prev ? { ...prev, helper_lat: event.lat, helper_lng: event.lng } : prev);
        store.updateBooking(bookingId, { helper_lat: event.lat, helper_lng: event.lng });
        setHelperLivePosition({
          lat: event.lat,
          lng: event.lng,
          heading_deg: event.heading_deg ?? null,
          stale: false,
        });
        setIsLocating(false);
        setLastUpdatedSec(1);
        const dist = haversine({ lat: booking.lat, lng: booking.lng }, { lat: event.lat, lng: event.lng });
        setDistance(dist);
        setEtaMin(Math.max(1, Math.round(computeEta(dist))));
      }

      const evtType = (event as any).type || (event as any).event;

      // Realtime event contract: order:confirmed
      if (evtType === "order:confirmed") {
        const evt = event as any;
        const targetId = evt.order_id || evt.booking_id;
        if (!bookingId || bookingId === "active" || !targetId || targetId === bookingId) {
          setStatus("confirmed");
          setBooking(prev => prev ? { ...prev, status: "confirmed" as any } : prev);
          if (bookingId) store.updateBooking(bookingId, { status: "confirmed" as any });
        }
      }

      // Realtime event contract: order:cancelled
      if (evtType === "order:cancelled") {
        const evt = event as any;
        const targetId = evt.order_id || evt.booking_id;
        if (!bookingId || bookingId === "active" || !targetId || targetId === bookingId) {
          setStatus("cancelled");
          setBooking(prev => prev ? { ...prev, status: "cancelled" as any } : prev);
        }
      }

      // Realtime event contract: location:update
      if (evtType === "location:update") {
        const evt = event as any;
        const targetId = evt.order_id || evt.booking_id;
        if (!bookingId || bookingId === "active" || !targetId || targetId === bookingId) {
          if (evt.lat && evt.lng) {
            setBooking(prev => prev ? { ...prev, helper_lat: evt.lat, helper_lng: evt.lng } : prev);
            setHelperLivePosition({
              lat: evt.lat,
              lng: evt.lng,
              stale: false,
            });
            setIsLocating(false);
            setLastUpdatedSec(1);
            if (evt.eta_minutes !== undefined) {
              setEtaMin(evt.eta_minutes);
            }
          }
        }
      }

      // Job status changes from helper
      if (event.type === "job_status" && event.booking_id === bookingId) {
        const newStatus = event.status as TrackingStatus;
        if (statusRef.current === "completed" && newStatus !== "completed") return;
        setStatus(newStatus);
        setBooking(prev => prev ? { ...prev, status: newStatus as any } : prev);
        store.updateBooking(bookingId, { status: newStatus as any });
      }

      // Helper assigned or accepted (both booking_accept and order:accepted contract)
      if (
        evtType === "order:accepted" ||
        ((evtType === "booking_assigned" || evtType === "booking_accept") && (event as any).booking_id === bookingId)
      ) {
        if (statusRef.current === "completed") return;
        const evt = event as any;
        setStatus("accepted");
        const lat = evt.helper_location?.lat ?? evt.lat;
        const lng = evt.helper_location?.lng ?? evt.lng;
        const helperName = evt.helper?.name ?? evt.helper_name ?? "Helper";
        const helperId = evt.helper?.id ?? evt.helper_id;
        const otp = evt.otp;

        setBooking(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: "accepted",
            helper_id: helperId || prev.helper_id,
            helper_name: helperName || prev.helper_name,
            helper_lat: lat ?? prev.helper_lat,
            helper_lng: lng ?? prev.helper_lng,
            ...(otp ? { otp } : {}),
          };
        });
        if (evt.eta_minutes !== undefined) {
          setEtaMin(evt.eta_minutes);
        }
        if (lat && lng) {
          setHelperLivePosition({ lat, lng, stale: false });
          setIsLocating(false);
          setLastUpdatedSec(1);
          setBooking(prev => {
            if (prev) {
              const dist = haversine({ lat: prev.lat, lng: prev.lng }, { lat, lng });
              setDistance(dist);
              if (evt.eta_minutes === undefined) {
                setEtaMin(Math.max(1, Math.round(computeEta(dist))));
              }
            }
            return prev;
          });
        }
        store.updateBooking(bookingId, {
          status: "accepted",
          helper_id: helperId,
          helper_name: helperName,
          ...(lat && lng ? { helper_lat: lat, helper_lng: lng } : {}),
          ...(otp ? { otp } : {}),
        });
      }
    });
    return unsub;
  }, [ready, session, transport, store, booking, bookingId]);

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
          <h2 className="text-[18px] font-medium text-ink mb-2">No order</h2>
          <p className="text-[14px] text-ink-muted text-center mb-6">
            You don&apos;t have any active order right now. Book a helper from the home screen.
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
  const otpDigits = (booking.otp || "4821").slice(0, 4).padEnd(4, "0").split("");
  const showOtp = ((status as string) === "on_the_way" || (status as string) === "accepted" || (status as string) === "arrived") && (status as string) !== "confirmed";
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
            <LiveMap
              role="customer"
              destination={booking ? { lat: booking.lat || geo.lat || 28.6139, lng: booking.lng || geo.lng || 77.2090 } : null}
              helperPosition={helperLivePosition}
              route={liveRoute}
              status={status}
              helperInitial={helperInitial}
              etaMinutes={etaMin}
              distanceM={distance !== null ? distance * 1000 : null}
              isApproximateEta={isApproximateEta}
              isLocating={isLocating}
              isUnavailable={isUnavailable}
              lastUpdatedSec={lastUpdatedSec}
            />
            <Link
              href="/"
              className="absolute flex items-center justify-center rounded-full z-20"
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

            {/* ORDER COMPLETE TAB / BANNER (comes up on completion) */}
            {status === "completed" && (
              <div
                className="rounded-[20px] p-6 text-center shadow-sm animate-fade-in my-1"
                style={{
                  backgroundColor: C.cardFill,
                  border: `1.5px solid ${C.success}`,
                }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{
                    backgroundColor: "rgba(45, 106, 79, 0.12)",
                    fontSize: "32px",
                  }}
                >
                  🎉
                </div>
                <h2 className="text-[22px] font-bold tracking-tight mb-1" style={{ color: C.ink }}>
                  Order Complete!
                </h2>
                <p className="text-[14px] leading-relaxed mb-4" style={{ color: C.secondary }}>
                  Your service has been completed successfully. Your home is fresh and clean!
                </p>

                {/* Rating card */}
                <div
                  className="rounded-[14px] p-4 mb-4"
                  style={{
                    backgroundColor: C.white,
                    border: `1px solid ${C.hairline}`,
                  }}
                >
                  <p className="text-[13px] font-medium mb-2" style={{ color: C.ink }}>
                    Rate your experience with {helperName}
                  </p>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleRate(star)}
                        className="text-[32px] no-select cursor-pointer active:scale-125 transition-transform"
                        style={{ color: star <= rating ? "#F5A623" : C.hairline }}
                        aria-label={`${star} star`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <p className="text-[12px] font-medium" style={{ color: C.success }}>
                      Thanks for rating {helperName}!
                    </p>
                  )}
                </div>

                {redirectCountdown !== null && redirectCountdown > 0 && (
                  <p className="text-[13px] text-ink-muted mb-3.5 font-medium">
                    Moving to your booking history in {redirectCountdown}s...
                  </p>
                )}

                <div className="flex flex-col gap-2.5">
                  <Link
                    href="/orders?tab=history"
                    className="w-full h-12 rounded-[12px] text-[15px] font-medium text-white flex items-center justify-center no-underline shadow-xs cursor-pointer active:scale-98 transition-transform"
                    style={{ backgroundColor: C.brand }}
                  >
                    View in Booking History
                  </Link>
                  <Link
                    href="/"
                    className="w-full h-11 rounded-[12px] text-[14px] font-medium flex items-center justify-center no-underline cursor-pointer active:scale-98 transition-transform"
                    style={{
                      backgroundColor: C.white,
                      color: C.ink,
                      border: `1px solid ${C.hairline}`,
                    }}
                  >
                    Back to Home
                  </Link>
                </div>
              </div>
            )}

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

            {/* Order confirmed banner */}
            {status === "confirmed" && (
              <div
                className="rounded-[16px] p-5 text-center shadow-sm animate-fade-in my-1"
                style={{
                  backgroundColor: "rgba(45, 106, 79, 0.08)",
                  border: `1.5px solid ${C.success}`,
                }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2"
                  style={{ backgroundColor: C.success, color: "#fff" }}
                >
                  <IconCheck size={24} strokeWidth={3} />
                </div>
                <h2 className="text-[18px] font-bold tracking-tight mb-1" style={{ color: C.ink }}>
                  Order confirmed
                </h2>
                <p className="text-[13px] leading-relaxed" style={{ color: C.secondary }}>
                  Start code verified! {helperName} has confirmed your order.
                </p>
              </div>
            )}

            {/* d. OTP card (cleared once confirmed) */}
            {showOtp && (
              <div className="rounded-[16px] p-4" style={{ backgroundColor: C.cardFill, border: `1px solid ${C.hairline}` }}>
                {status === "arrived" && (
                  <div className="mb-3.5 p-3 rounded-[12px] flex items-center gap-2.5" style={{ backgroundColor: "#FEF3C7", border: "1px solid #FCD34D" }}>
                    <span className="text-[20px] shrink-0">🔔</span>
                    <p className="text-[13px] font-medium leading-snug" style={{ color: "#92400E" }}>
                      {helperName} has arrived at your door! Share your 4-digit code below to start.
                    </p>
                  </div>
                )}
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
                <div className="flex items-center justify-center gap-3 my-2">
                  {otpDigits.map((digit, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-center rounded-[14px] shadow-xs select-all"
                      style={{
                        width: "56px",
                        height: "64px",
                        backgroundColor: C.white,
                        border: `2px solid ${C.hairline}`,
                        fontSize: 26,
                        fontWeight: 700,
                        color: C.ink,
                      }}
                    >
                      {digit}
                    </div>
                  ))}
                </div>
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
                  ...(booking.addons && booking.addons.length > 0 ? [{ label: "Add-ons", value: booking.addons.join(", ") }] : []),
                  ...(booking.notes && booking.notes.trim().length > 0 ? [{ label: "Note for helper", value: booking.notes.trim() }] : []),
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
