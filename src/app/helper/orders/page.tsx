"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { useSwepy } from "@/lib/swepy/provider";
import { getSession, ensureSession } from "@/lib/swepy/session";
import type { Session } from "@/lib/swepy/types";
import { CONFIG, haversine, computeEta } from "@/lib/swepy";
import type { RealtimeEvent, Booking } from "@/lib/swepy";
import { useHelper } from "@/lib/helper-store";
import { useI18n } from "@/lib/i18n";
import HelperBottomNav from "@/components/helper-bottom-nav";
import dynamic from "next/dynamic";
const LiveMap = dynamic(() => import("@/components/live-map"), { ssr: false });
import { IconMapPin, IconBell, IconNavigation, IconCheck, IconShieldCheck } from "@/components/icons";
import { HELPER_TOKENS } from "@/lib/helper-theme";
import { fetchRoadRoute } from "@/lib/swepy/road-router";

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
  otp?: string;
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
  const { transport, store } = useSwepy();
  const { profile, isOnline, setOnline } = useHelper();
  const { t, formatCurrency, locale } = useI18n();

  const session = useSyncExternalStore(subscribeSession, getSessionSnapshot, getServerSessionSnapshot);

  // Geo states
  const [myLat, setMyLat] = useState(28.6139);
  const [myLng, setMyLng] = useState(77.2090);
  const [myHeading, setMyHeading] = useState<number | null>(null);
  const myLatRef = useRef(28.6139);
  const myLngRef = useRef(77.2090);
  const myHeadingRef = useRef<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [locality, setLocality] = useState<string | null>(null);
  const [pincode, setPincode] = useState<string | null>(null);
  const [stateName, setStateName] = useState<string | null>(null);

  // Active Job states
  const [activeJob, setActiveJob] = useState<Booking | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});

  // Publishing & Screen Wake Lock refs
  const watchRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const nextIntervalMsRef = useRef<number>(30000);
  const lastSampleRef = useRef<{ lat: number; lng: number; time: number; accuracy: number } | null>(null);
  const pingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep coordinates refs updated
  useEffect(() => {
    myLatRef.current = myLat;
    myLngRef.current = myLng;
    myHeadingRef.current = myHeading;
  }, [myLat, myLng, myHeading]);

  // Road route waypoints
  const roadWaypointsRef = useRef<[number, number][]>([]);
  const roadWaypointIdxRef = useRef<number>(0);

  // Restore active job from store
  useEffect(() => {
    if (!session) return;
    const active = store.getActiveBookingForHelper(session.user_id);
    if (
      active &&
      active.status !== "completed" &&
      active.status !== "cancelled" &&
      active.id !== "demo" &&
      !active.id.startsWith("demo_") &&
      active.user_id !== "customer_demo"
    ) {
      setActiveJob(active);
    } else {
      setActiveJob(null);
    }
  }, [session, store]);

  // Pre-fetch road route for active job
  useEffect(() => {
    if (!activeJob) {
      roadWaypointsRef.current = [];
      roadWaypointIdxRef.current = 0;
      return;
    }
    fetchRoadRoute(
      { lat: myLatRef.current, lng: myLngRef.current },
      { lat: activeJob.lat, lng: activeJob.lng }
    ).then((res) => {
      if (res.coordinates && res.coordinates.length > 1) {
        roadWaypointsRef.current = res.coordinates;
        roadWaypointIdxRef.current = 0;
      }
    }).catch(() => {});
  }, [activeJob?.id]);

  // Request geolocation when helper toggles Online
  const handleToggleOnline = useCallback(() => {
    if (isOnline) {
      // Going Offline: release wake lock, stop watch & ping
      setOnline(false);
      setGeoError(null);
      if (watchRef.current !== null) {
        navigator.geolocation?.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      if (session) {
        transport.send({
          type: "helper_offline",
          helper_id: session.user_id,
          ts: Date.now(),
          sender: session.user_id,
        });
      }
      return;
    }

    // Going Online: ask for geolocation permission immediately
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }

    setGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLat(pos.coords.latitude);
        setMyLng(pos.coords.longitude);
        setMyHeading(pos.coords.heading ?? null);
        myLatRef.current = pos.coords.latitude;
        myLngRef.current = pos.coords.longitude;
        setGeoLoading(false);
        setOnline(true);

        if (session) {
          transport.send({
            type: "helper_online",
            helper_id: session.user_id,
            name: session.name,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            ts: Date.now(),
            sender: session.user_id,
          });
        }
      },
      (err) => {
        setGeoLoading(false);
        setOnline(false);
        setGeoError(t("helper.geoDenied"));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }, [isOnline, setOnline, session, transport, t]);

  // Geolocation watchPosition while online
  useEffect(() => {
    if (!isOnline || typeof window === "undefined" || !navigator.geolocation) {
      if (watchRef.current !== null) {
        navigator.geolocation?.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      return;
    }

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const accuracy = pos.coords.accuracy;
        const now = Date.now();
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const heading = pos.coords.heading ?? null;

        // Skip samples with accuracy worse than 150m (except the very first sample)
        if (lastSampleRef.current && accuracy > 150) {
          return;
        }

        // Skip implausible jumps (over 120 km/h = 33.3 m/s)
        if (lastSampleRef.current) {
          const dtSec = Math.max(0.5, (now - lastSampleRef.current.time) / 1000);
          const dMeters = haversine(
            { lat: lastSampleRef.current.lat, lng: lastSampleRef.current.lng },
            { lat, lng }
          );
          const speedKmh = (dMeters / dtSec) * 3.6;
          if (speedKmh > 120) {
            return;
          }
        }

        lastSampleRef.current = { lat, lng, time: now, accuracy };
        setMyLat(lat);
        setMyLng(lng);
        setMyHeading(heading);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 4000 }
    );

    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation?.clearWatch(watchRef.current);
        watchRef.current = null;
      }
    };
  }, [isOnline]);

  // Screen Wake Lock & Publishing during Sharing Window
  const isSharingWindow =
    activeJob && ["assigned", "accepted", "on_the_way"].includes(activeJob.status);

  useEffect(() => {
    if (!isSharingWindow) {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      return;
    }

    // Acquire Screen Wake Lock
    const acquireLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        }
      } catch { /* ignore */ }
    };

    acquireLock();

    const handleVisibilityChange = () => {
      if (!document.hidden && isSharingWindow) {
        acquireLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [isSharingWindow]);

  // Publish location pings to server
  useEffect(() => {
    if (!isOnline || !session) return;

    let isCancelled = false;

    const sendPing = async () => {
      if (isCancelled) return;

      const payload = {
        lat: myLatRef.current,
        lng: myLngRef.current,
        accuracy_m: lastSampleRef.current?.accuracy ?? 10,
        heading_deg: myHeadingRef.current ?? null,
        speed_mps: null,
        recorded_at: new Date().toISOString(),
      };

      try {
        // Query param bookingId if in active sharing window
        const query = activeJob && isSharingWindow ? `?bookingId=${activeJob.id}` : "";
        const res = await fetch(`/api/helper/location${query}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-helper-id": session.user_id,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.next_interval_ms) {
            nextIntervalMsRef.current = data.next_interval_ms;
          }
        }
      } catch {
        // Retry with backoff
        nextIntervalMsRef.current = Math.min(15000, nextIntervalMsRef.current * 1.5);
      } finally {
        if (!isCancelled) {
          const delay = isSharingWindow ? (nextIntervalMsRef.current || 4000) : 30000;
          pingTimeoutRef.current = setTimeout(sendPing, delay);
        }
      }
    };

    sendPing();

    return () => {
      isCancelled = true;
      if (pingTimeoutRef.current) {
        clearTimeout(pingTimeoutRef.current);
      }
    };
  }, [isOnline, session, activeJob?.id, isSharingWindow]);

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

  // Listen for realtime booking events
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
            otp: event.otp,
          }];
        });
      }

      if (event.type === "booking_assigned") {
        if (event.helper_id === session.user_id) {
          const matched = requests.find(r => r.booking_id === event.booking_id);
          const userLat = event.lat || matched?.user_lat || 28.6139;
          const userLng = event.lng || matched?.user_lng || 77.2090;

          // Check if helper is right on top of customer house (e.g. testing locally)
          let helperStartLat = myLatRef.current;
          let helperStartLng = myLngRef.current;
          const rawDist = haversine({ lat: helperStartLat, lng: helperStartLng }, { lat: userLat, lng: userLng });
          if (rawDist < 200) {
            helperStartLat = userLat - 0.007;
            helperStartLng = userLng - 0.006;
            setMyLat(helperStartLat);
            setMyLng(helperStartLng);
            myLatRef.current = helperStartLat;
            myLngRef.current = helperStartLng;
          }

          const existing = store.getBooking(event.booking_id);
          const bookingOtp = event.otp || existing?.otp || "4821";

          const newBooking: Booking = {
            id: event.booking_id,
            user_id: "customer",
            user_name: "Customer",
            service_name: event.service_name || matched?.service_name || "Cleaning Service",
            home_size: event.home_size || matched?.home_size || "2 BHK",
            notes: event.notes || matched?.notes,
            addons: event.addons || matched?.addons,
            address_short: matched?.area_label || "Customer Location",
            address_full: event.address_full || matched?.area_label || "Customer Location",
            lat: userLat,
            lng: userLng,
            price: event.price || matched?.price || 249,
            otp: bookingOtp,
            status: "accepted",
            helper_id: session.user_id,
            helper_name: session.name,
            helper_lat: helperStartLat,
            helper_lng: helperStartLng,
            radius_step: 0,
            rating: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          store.createBooking(newBooking);
          setActiveJob(newBooking);
        }
        setRequests(prev => prev.filter(r => r.booking_id !== event.booking_id));
      }

      if (event.type === "booking_cancel" && activeJob && event.booking_id === activeJob.id) {
        setActiveJob(null);
        setRequests(prev => prev.filter(r => r.booking_id !== event.booking_id));
      }
    });
    return unsub;
  }, [session, transport, store, requests, activeJob]);

  // Request countdown timers
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

    const userLat = req.user_lat || 28.6139;
    const userLng = req.user_lng || 77.2090;

    // Check store for existing booking or fallback OTP
    const existing = store.getBooking(req.booking_id);
    const bookingOtp = req.otp || existing?.otp || "4821";

    let helperStartLat = myLatRef.current;
    let helperStartLng = myLngRef.current;
    const curDist = haversine({ lat: helperStartLat, lng: helperStartLng }, { lat: userLat, lng: userLng });
    if (curDist < 200) {
      // Offset helper by ~800m so there are two distinct dots (helper bicycle & user house) and a route line
      helperStartLat = userLat - 0.007;
      helperStartLng = userLng - 0.006;
      setMyLat(helperStartLat);
      setMyLng(helperStartLng);
      myLatRef.current = helperStartLat;
      myLngRef.current = helperStartLng;
    }

    const newBooking: Booking = {
      id: req.booking_id,
      user_id: "customer",
      user_name: "Customer",
      service_name: req.service_name,
      home_size: req.home_size,
      notes: req.notes,
      addons: req.addons,
      address_short: req.area_label,
      address_full: req.area_label,
      lat: userLat,
      lng: userLng,
      price: req.price,
      otp: bookingOtp,
      status: "accepted",
      helper_id: session.user_id,
      helper_name: session.name,
      helper_lat: helperStartLat,
      helper_lng: helperStartLng,
      radius_step: 0,
      rating: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = store.updateBooking(req.booking_id, {
      ...newBooking,
      status: "accepted",
    }) || store.createBooking(newBooking);
    setActiveJob(updated);

    // Call server accept endpoint
    fetch(`/api/bookings/${req.booking_id}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ helperId: session.user_id }),
    }).catch(console.error);

    transport.send({
      type: "booking_accept",
      booking_id: req.booking_id,
      helper_id: session.user_id,
      helper_name: session.name,
      lat: helperStartLat,
      lng: helperStartLng,
      otp: bookingOtp,
      ts: Date.now(),
      sender: session.user_id,
    });
  }, [session, transport, store]);

  const handleDecline = useCallback((bookingId: string) => {
    setRequests(prev => prev.filter(r => r.booking_id !== bookingId));
  }, []);

  // Job step controls
  const advanceJobStatus = useCallback((nextStatus: string) => {
    if (!activeJob || !session) return;
    store.updateBooking(activeJob.id, { status: nextStatus as any });
    setActiveJob(prev => (prev ? { ...prev, status: nextStatus as any } : null));

    transport.send({
      type: "job_status",
      booking_id: activeJob.id,
      status: nextStatus as any,
      ts: Date.now(),
      sender: session.user_id,
    });
  }, [activeJob, session, store, transport]);

  // Active trip simulation when helper starts trip (status === "on_the_way")
  useEffect(() => {
    if (!activeJob || activeJob.status !== "on_the_way" || !session) return;

    const interval = setInterval(() => {
      const curLat = myLatRef.current;
      const curLng = myLngRef.current;
      const destLat = activeJob.lat;
      const destLng = activeJob.lng;

      const distM = haversine({ lat: curLat, lng: curLng }, { lat: destLat, lng: destLng });

      // If helper is within 35m of user house, auto-arrive!
      if (distM <= 35) {
        setMyLat(destLat);
        setMyLng(destLng);
        myLatRef.current = destLat;
        myLngRef.current = destLng;
        store.updateBooking(activeJob.id, { helper_lat: destLat, helper_lng: destLng, status: "arrived" as any });
        setActiveJob(prev => (prev ? { ...prev, helper_lat: destLat, helper_lng: destLng, status: "arrived" as any } : null));
        transport.send({
          type: "job_status",
          booking_id: activeJob.id,
          status: "arrived" as any,
          ts: Date.now(),
          sender: session.user_id,
        });
        transport.send({
          type: "job_location",
          booking_id: activeJob.id,
          lat: destLat,
          lng: destLng,
          heading_deg: myHeadingRef.current ?? 0,
          speed_mps: 0,
          ts: Date.now(),
          sender: session.user_id,
        });
        return;
      }

      // Check if road waypoints are available to ride along real roads
      const waypoints = roadWaypointsRef.current;
      if (waypoints && waypoints.length > 2) {
        const step = Math.max(1, Math.min(3, Math.ceil(waypoints.length / 25)));
        roadWaypointIdxRef.current = Math.min(waypoints.length - 1, roadWaypointIdxRef.current + step);
        const [nextLng, nextLat] = waypoints[roadWaypointIdxRef.current];

        let headingDeg = myHeadingRef.current ?? 0;
        if (roadWaypointIdxRef.current < waypoints.length - 1) {
          const [aheadLng, aheadLat] = waypoints[roadWaypointIdxRef.current + 1];
          const dY = aheadLat - nextLat;
          const dX = (aheadLng - nextLng) * Math.cos((nextLat * Math.PI) / 180);
          headingDeg = Math.round((Math.atan2(dX, dY) * 180) / Math.PI + 360) % 360;
        }

        setMyLat(nextLat);
        setMyLng(nextLng);
        setMyHeading(headingDeg);
        myLatRef.current = nextLat;
        myLngRef.current = nextLng;
        myHeadingRef.current = headingDeg;

        store.updateBooking(activeJob.id, { helper_lat: nextLat, helper_lng: nextLng });

        transport.send({
          type: "job_location",
          booking_id: activeJob.id,
          lat: nextLat,
          lng: nextLng,
          heading_deg: headingDeg,
          speed_mps: 4.5,
          ts: Date.now(),
          sender: session.user_id,
        });

        fetch(`/api/helper/location?bookingId=${activeJob.id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-helper-id": session.user_id,
          },
          body: JSON.stringify({
            lat: nextLat,
            lng: nextLng,
            accuracy_m: 5,
            heading_deg: headingDeg,
            speed_mps: 4.5,
            recorded_at: new Date().toISOString(),
          }),
        }).catch(() => {});

        if (roadWaypointIdxRef.current >= waypoints.length - 1) {
          store.updateBooking(activeJob.id, { helper_lat: destLat, helper_lng: destLng, status: "arrived" as any });
          setActiveJob(prev => (prev ? { ...prev, helper_lat: destLat, helper_lng: destLng, status: "arrived" as any } : null));
          transport.send({
            type: "job_status",
            booking_id: activeJob.id,
            status: "arrived" as any,
            ts: Date.now(),
            sender: session.user_id,
          });
        }
        return;
      }

      // Fallback: Step towards destination ~5-6% of remaining distance each 2s
      const stepFraction = Math.max(0.04, Math.min(0.08, 35 / distM));
      const nextLat = curLat + (destLat - curLat) * stepFraction;
      const nextLng = curLng + (destLng - curLng) * stepFraction;

      // Bearing calculation
      const dY = destLat - curLat;
      const dX = (destLng - curLng) * Math.cos((curLat * Math.PI) / 180);
      const headingDeg = Math.round((Math.atan2(dX, dY) * 180) / Math.PI + 360) % 360;

      setMyLat(nextLat);
      setMyLng(nextLng);
      setMyHeading(headingDeg);
      myLatRef.current = nextLat;
      myLngRef.current = nextLng;
      myHeadingRef.current = headingDeg;

      // Update store
      store.updateBooking(activeJob.id, { helper_lat: nextLat, helper_lng: nextLng });

      // Broadcast location to customer
      transport.send({
        type: "job_location",
        booking_id: activeJob.id,
        lat: nextLat,
        lng: nextLng,
        heading_deg: headingDeg,
        speed_mps: 4.5,
        ts: Date.now(),
        sender: session.user_id,
      });

      // Also ping location API endpoint
      fetch(`/api/helper/location?bookingId=${activeJob.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-helper-id": session.user_id,
        },
        body: JSON.stringify({
          lat: nextLat,
          lng: nextLng,
          accuracy_m: 5,
          heading_deg: headingDeg,
          speed_mps: 4.5,
          recorded_at: new Date().toISOString(),
        }),
      }).catch(() => {});
    }, 2000);

    return () => clearInterval(interval);
  }, [activeJob?.id, activeJob?.status, session, store, transport]);

  const handleStartTrip = () => {
    advanceJobStatus("on_the_way");
    if (activeJob && session) {
      transport.send({
        type: "job_location",
        booking_id: activeJob.id,
        lat: myLatRef.current,
        lng: myLngRef.current,
        heading_deg: myHeadingRef.current ?? 0,
        speed_mps: 3.5,
        ts: Date.now(),
        sender: session.user_id,
      });
    }
  };

  const handleArrived = () => advanceJobStatus("arrived");

  const handleOtpSubmit = () => {
    if (!activeJob) return;
    const storeBooking = store.getBooking(activeJob.id);
    const expected = activeJob.otp || storeBooking?.otp;
    if (expected && otpInput === expected) {
      setOtpError(false);
      advanceJobStatus("completed");
      setTimeout(() => {
        setActiveJob(null);
      }, 2500);
    } else {
      setOtpError(true);
    }
  };

  const handleComplete = () => {
    advanceJobStatus("completed");
    setTimeout(() => {
      setActiveJob(null);
    }, 2500);
  };

  const handleCancelJob = useCallback(() => {
    if (!activeJob) return;
    store.updateBooking(activeJob.id, { status: "cancelled" as any });
    if (session) {
      transport.send({
        type: "booking_cancel",
        booking_id: activeJob.id,
        ts: Date.now(),
        sender: session.user_id,
      });
    }
    setActiveJob(null);
  }, [activeJob, session, store, transport]);

  const helperName = session.name || profile.full_name || "Deepa Nair";
  const avatarInitial = helperName.charAt(0).toUpperCase();

  const areaLabelString = locality
    ? [locality, [stateName, pincode].filter(Boolean).join(" ")].filter(Boolean).join(" · ")
    : "Hastsal · Delhi 110059";

  // Calculate active job distance & ETA
  const activeDistM = activeJob
    ? haversine({ lat: myLat, lng: myLng }, { lat: activeJob.lat, lng: activeJob.lng })
    : 0;
  const activeEtaMin = Math.max(1, Math.round(computeEta(activeDistM)));

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
              <h1 className="text-[16px] truncate leading-tight font-medium text-ink">
                {helperName}
              </h1>
              <p className="text-[12px] leading-tight mt-0.5 text-ink-muted">
                {t("helper.helper")}
              </p>
            </div>
          </div>

          {/* ONLINE CONTROL */}
          <button
            type="button"
            onClick={handleToggleOnline}
            role="switch"
            aria-checked={isOnline}
            aria-label={isOnline ? t("helper.online") : t("helper.offline")}
            className="h-[34px] px-2 rounded-full flex items-center gap-2 border-0 outline-none transition-colors duration-200 cursor-pointer select-none"
            style={{
              minHeight: "44px",
              backgroundColor: isOnline
                ? HELPER_TOKENS.colors.status.onlineSolid
                : HELPER_TOKENS.colors.offlineTrack,
            }}
          >
            {!isOnline && (
              <span className="w-[26px] h-[26px] rounded-full bg-white shadow-xs shrink-0" aria-hidden="true" />
            )}
            <span
              className="text-[13px] px-1 whitespace-nowrap font-medium"
              style={{ color: isOnline ? "#FFFFFF" : HELPER_TOKENS.colors.secondary }}
            >
              {isOnline ? t("helper.online") : t("helper.offline")}
            </span>
            {isOnline && (
              <span className="w-[26px] h-[26px] rounded-full bg-white shadow-xs shrink-0" aria-hidden="true" />
            )}
          </button>
        </header>

        {/* INLINE GEOLOCATION ERROR MESSAGE */}
        {geoError && (
          <div
            className="mb-3.5 p-3 rounded-[14px] text-[13px] leading-relaxed flex items-start gap-2 shadow-sm"
            style={{
              backgroundColor: "#FDF2F2",
              border: "1px solid #F87171",
              color: "#991B1B",
            }}
            role="alert"
          >
            <span className="text-[16px] shrink-0 mt-0.5">⚠️</span>
            <p className="flex-1">{geoError}</p>
          </div>
        )}

        {/* 2. SHARED LIVEMAP */}
        <section className="mb-3.5">
          {activeJob ? (
            /* ACTIVE JOB MAP */
            <LiveMap
              role="helper"
              destination={{ lat: activeJob.lat, lng: activeJob.lng }}
              helperPosition={
                // Keep helper bicycle dot visible during all active service states
                ["assigned", "accepted", "on_the_way", "arrived", "in_progress"].includes(activeJob.status)
                  ? { lat: myLat, lng: myLng, heading_deg: myHeading }
                  : null
              }
              status={activeJob.status}
              etaMinutes={activeEtaMin}
              distanceM={activeDistM}
              areaLabel={activeJob.address_short}
            />
          ) : (
            /* IDLE MAP (ONLINE OR OFFLINE) */
            <LiveMap
              role="helper"
              helperPosition={{ lat: myLat, lng: myLng, heading_deg: myHeading }}
              areaLabel={areaLabelString}
            />
          )}
        </section>

        {/* 3. ACTIVE JOB CARD OR IDLE STATUS CARD */}
        {activeJob ? (
          <section
            className="p-4 mb-3.5 rounded-[16px] shadow-sm"
            style={{
              backgroundColor: HELPER_TOKENS.colors.cardBg,
              border: `1px solid ${HELPER_TOKENS.colors.hairline}`,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="px-2.5 py-1 text-[12px] font-medium rounded-full"
                style={{
                  backgroundColor: HELPER_TOKENS.colors.blush,
                  color: HELPER_TOKENS.colors.brand,
                }}
              >
                {activeJob.status === "accepted" && "Job Accepted"}
                {activeJob.status === "on_the_way" && "On the way"}
                {activeJob.status === "arrived" && "Arrived at customer"}
                {activeJob.status === "in_progress" && "Service in progress"}
                {activeJob.status === "completed" && "Completed"}
              </span>
              <span className="text-[12px] text-ink-muted">
                ~{activeEtaMin} min · {(activeDistM / 1000).toFixed(1)} km
              </span>
            </div>

            <h2 className="text-[16px] font-medium text-ink mb-1">
              {activeJob.service_name} · {activeJob.home_size}
            </h2>
            <div className="flex items-center gap-1.5 text-[13px] text-ink-muted mb-3">
              <IconMapPin size={16} style={{ color: "#D9507F" }} />
              <span className="truncate">{activeJob.address_full}</span>
            </div>

            {/* NAVIGATE BUTTON */}
            {["accepted", "on_the_way"].includes(activeJob.status) && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${activeJob.lat},${activeJob.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 rounded-[12px] text-[14px] font-medium flex items-center justify-center gap-2 mb-3 no-underline shadow-xs cursor-pointer active:scale-95 transition-transform"
                style={{
                  backgroundColor: "#F3F7F6",
                  color: "#184E44",
                  border: "1px solid #C1E1DC",
                }}
              >
                <IconNavigation size={16} />
                {t("helper.navigate")}
              </a>
            )}

            {/* JOB-STEP CONTROLS */}
            {activeJob.status === "accepted" && (
              <button
                type="button"
                onClick={handleStartTrip}
                className="w-full h-12 rounded-[12px] text-[15px] font-medium text-white shadow-sm cursor-pointer active:scale-98 transition-transform"
                style={{ backgroundColor: HELPER_TOKENS.colors.brand }}
              >
                Start trip
              </button>
            )}

            {activeJob.status === "on_the_way" && (
              <button
                type="button"
                onClick={handleArrived}
                className="w-full h-12 rounded-[12px] text-[15px] font-medium text-white shadow-sm cursor-pointer active:scale-98 transition-transform"
                style={{ backgroundColor: HELPER_TOKENS.colors.brand }}
              >
                I have arrived
              </button>
            )}

            {activeJob.status === "arrived" && (
              <div className="py-2.5 flex flex-col items-center">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center mb-2 select-none"
                  style={{
                    backgroundColor: HELPER_TOKENS.colors.blush,
                    color: HELPER_TOKENS.colors.brand,
                  }}
                >
                  <IconShieldCheck size={22} />
                </div>
                <h3 className="text-[16px] font-semibold text-ink text-center leading-tight">
                  Enter Start Code
                </h3>
                <p className="text-[13px] text-ink-muted text-center mt-1 mb-3.5 max-w-[280px] leading-snug">
                  Ask customer for the 4-digit code shown on their tracking screen.
                </p>

                {/* PROPORTIONAL SCREEN-RATIO OTP BOXES */}
                <div className="flex items-center justify-center gap-3 w-full my-2">
                  {[0, 1, 2, 3].map(i => (
                    <input
                      key={i}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      autoComplete="one-time-code"
                      value={otpInput[i] || ""}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, "");
                        const arr = otpInput.split("");
                        arr[i] = val;
                        const nextOtp = arr.join("").slice(0, 4);
                        setOtpInput(nextOtp);
                        setOtpError(false);
                        if (val && i < 3) {
                          const next = e.target.parentElement?.children[i + 1] as HTMLInputElement;
                          next?.focus();
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === "Backspace" && !otpInput[i] && i > 0) {
                          const prev = e.currentTarget.parentElement?.children[i - 1] as HTMLInputElement;
                          prev?.focus();
                        }
                      }}
                      onPaste={e => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
                        if (pasted) {
                          setOtpInput(pasted);
                          setOtpError(false);
                          const lastIdx = Math.min(3, pasted.length - 1);
                          const target = e.currentTarget.parentElement?.children[lastIdx] as HTMLInputElement;
                          target?.focus();
                        }
                      }}
                      className="text-center text-[26px] font-bold text-ink rounded-[14px] outline-none transition-all duration-150 select-all"
                      style={{
                        width: "56px",
                        height: "64px",
                        backgroundColor: otpError ? "#FEF2F2" : "#FFFFFF",
                        border: `2px solid ${
                          otpError
                            ? "#B3261E"
                            : otpInput[i]
                            ? HELPER_TOKENS.colors.brand
                            : HELPER_TOKENS.colors.hairline
                        }`,
                        boxShadow: otpInput[i]
                          ? "0 2px 8px rgba(217, 80, 127, 0.15)"
                          : "0 1px 3px rgba(0,0,0,0.04)",
                      }}
                    />
                  ))}
                </div>

                {otpError && (
                  <p className="text-[12px] font-medium text-center my-1.5" style={{ color: "#B3261E" }}>
                    Wrong OTP. Please enter the 4-digit code shown on customer's screen.
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleOtpSubmit}
                  disabled={otpInput.length < 4}
                  className="w-full h-12 mt-2.5 rounded-[14px] text-[15px] font-medium text-white shadow-sm cursor-pointer transition-transform active:scale-98"
                  style={{
                    backgroundColor: otpInput.length < 4 ? "#D6D1CE" : HELPER_TOKENS.colors.brand,
                  }}
                >
                  Verify Code & Complete Order
                </button>
              </div>
            )}

            {activeJob.status === "in_progress" && (
              <button
                type="button"
                onClick={handleComplete}
                className="w-full h-12 rounded-[12px] text-[15px] font-medium text-white shadow-sm cursor-pointer active:scale-98 transition-transform"
                style={{ backgroundColor: "#2D6A4F" }}
              >
                Complete job
              </button>
            )}

            {activeJob.status === "completed" && (
              <div className="text-center py-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2"
                  style={{ backgroundColor: "rgba(45, 106, 79, 0.12)", color: "#2D6A4F" }}
                >
                  <IconCheck size={28} strokeWidth={2.5} />
                </div>
                <h3 className="text-[16px] font-semibold text-ink">Order Completed! 🎉</h3>
                <p className="text-[13px] text-ink-muted mt-0.5">Returning to online requests in a moment...</p>
              </div>
            )}

            {/* SCREEN WAKE LOCK HINT */}
            {isSharingWindow && (
              <p className="text-[11px] text-center text-ink-muted mt-2.5">
                {t("helper.keepScreenOpen")}
              </p>
            )}

            {/* OPTION TO DISMISS / CANCEL JOB */}
            {activeJob.status !== "completed" && (
              <button
                type="button"
                onClick={handleCancelJob}
                className="w-full mt-2 text-[12px] font-medium text-ink-muted hover:text-red-600 underline cursor-pointer py-1"
              >
                Cancel / dismiss job
              </button>
            )}
          </section>
        ) : (
          /* IDLE STATUS CARD */
          <section
            className="p-[22px] text-center mb-3.5"
            style={{
              backgroundColor: HELPER_TOKENS.colors.cardBg,
              borderRadius: HELPER_TOKENS.radius.card,
              border: `1px solid ${HELPER_TOKENS.colors.hairline}`,
            }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: HELPER_TOKENS.colors.blush }}
              aria-hidden="true"
            >
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-xs">
                <IconBell size={18} strokeWidth={1.5} style={{ color: HELPER_TOKENS.colors.brand }} />
              </div>
            </div>
            <h2 className="text-[16px] leading-snug mb-1 font-medium text-ink">
              {isOnline ? t("helper.youreOnline") : t("helper.youreOffline")}
            </h2>
            <p className="text-[13px] leading-relaxed text-ink-muted">
              {isOnline ? t("helper.waitingForRequests") : t("helper.goOnlineToReceive")}
            </p>
            {isOnline && (
              <button
                type="button"
                onClick={() => {
                  const demoId = "demo";
                  setRequests(prev => [
                    ...prev.filter(r => r.booking_id !== demoId),
                    {
                      booking_id: demoId,
                      service_name: "Deep Home Cleaning",
                      home_size: "2 BHK",
                      price: 349,
                      distance_km: 0.8,
                      area_label: "Sector 14 · Gurugram",
                      user_lat: 28.6139,
                      user_lng: 77.2090,
                      received_at: Date.now(),
                    },
                  ]);
                }}
                className="mt-3.5 px-4 py-2 rounded-full text-[13px] font-medium cursor-pointer shadow-xs active:scale-95 transition-transform"
                style={{
                  backgroundColor: HELPER_TOKENS.colors.blush,
                  color: HELPER_TOKENS.colors.brand,
                  border: `1px solid ${HELPER_TOKENS.colors.hairline}`,
                }}
              >
                ⚡ Simulate Demo Request
              </button>
            )}
          </section>
        )}

        {/* 4. INCOMING REQUESTS (WHEN ONLINE & IDLE) */}
        {isOnline && !activeJob && requests.length > 0 && (
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
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="px-2.5 py-1 text-[12px] font-medium"
                      style={{
                        backgroundColor: HELPER_TOKENS.colors.status.pendingTint,
                        color: HELPER_TOKENS.colors.status.pendingText,
                        borderRadius: HELPER_TOKENS.radius.pill,
                      }}
                    >
                      {t("helper.newRequest")}
                    </span>
                    <span
                      className="text-[12px] tabular-nums font-medium"
                      style={{ color: HELPER_TOKENS.colors.status.pendingText }}
                    >
                      {remainingSec}s
                    </span>
                  </div>

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

                  <h3 className="text-[16px] leading-snug mb-1 font-medium text-ink">
                    {req.service_name} · {req.home_size}
                  </h3>

                  {req.addons && req.addons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {req.addons.map((addon, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 text-[12px] font-medium"
                          style={{
                            backgroundColor: HELPER_TOKENS.colors.blush,
                            color: HELPER_TOKENS.colors.brand,
                            borderRadius: HELPER_TOKENS.radius.pill,
                          }}
                        >
                          + {addon}
                        </span>
                      ))}
                    </div>
                  )}

                  {req.notes && req.notes.trim().length > 0 && (
                    <div
                      className="mt-2.5 p-2.5"
                      style={{
                        backgroundColor: HELPER_TOKENS.colors.innerHairline,
                        borderRadius: HELPER_TOKENS.radius.innerTile,
                        border: `1px solid ${HELPER_TOKENS.colors.hairline}`,
                      }}
                    >
                      <p className="text-[12px] uppercase tracking-wider mb-0.5 font-medium text-ink-muted">
                        {t("helper.customerNote")}
                      </p>
                      <p className="text-[13px] leading-relaxed break-words font-normal text-ink">
                        &ldquo;{req.notes.trim()}&rdquo;
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 mt-2.5 mb-3.5">
                    <IconMapPin size={18} strokeWidth={1.5} style={{ color: HELPER_TOKENS.colors.brand, flexShrink: 0 }} />
                    <span className="text-[12px] truncate text-ink-muted">
                      {req.area_label} · {req.distance_km.toFixed(1)} km, ~{computeEta(req.distance_km * 1000)} min
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1 border-t" style={{ borderColor: HELPER_TOKENS.colors.innerHairline }}>
                    <p className="text-[16px] tabular-nums font-medium" style={{ color: HELPER_TOKENS.colors.status.onlineText }}>
                      {t("helper.youEarn", { amount: formatCurrency(req.price) })}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDecline(req.booking_id)}
                        className="h-11 px-4 text-[14px] cursor-pointer outline-none transition-colors duration-200 font-medium text-ink"
                        style={{
                          backgroundColor: HELPER_TOKENS.colors.cardBg,
                          border: `1px solid ${HELPER_TOKENS.colors.hairline}`,
                          borderRadius: HELPER_TOKENS.radius.innerTile,
                          minHeight: "44px",
                        }}
                      >
                        {t("helper.decline")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAccept(req)}
                        className="h-11 px-4 text-[14px] text-white cursor-pointer outline-none transition-colors duration-200 font-medium"
                        style={{
                          backgroundColor: HELPER_TOKENS.colors.brand,
                          border: "none",
                          borderRadius: HELPER_TOKENS.radius.innerTile,
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
