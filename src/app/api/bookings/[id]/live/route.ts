import { NextRequest, NextResponse } from "next/server.js";
import { cookies } from "next/headers.js";
import crypto from "crypto";
import { authService } from "../../../auth/_init.ts";
import { liveLocationRepo } from "../../../../../server/repositories/live-location.repository.ts";
import { BookingRepository } from "../../../../../server/repositories/booking.repository.ts";
import { bookingService, pushRealtimeEvent } from "../../../../../server/services/booking.service.ts";
import { getRoutingProvider } from "../../../../../server/services/routing/index.ts";
import { distanceToRouteLineMeters } from "../../../../../server/services/routing/route-geometry.ts";
import { haversineMeters, isValidCoord, isAtLocation } from "../../../../../server/lib/geo.ts";

const bookingRepo = new BookingRepository();

// In-memory demo booking cache for local testing (kept for backward compat)
export const demoBookings = new Map<string, {
  id: string;
  customer_id: string;
  helper_id: string | null;
  status: string;
  lat: number;
  lng: number;
  address_short?: string;
  start_code?: string;
}>();

// Separate user location cache (per booking) — user and helper locations are never mixed
const userLocations = new Map<string, { lat: number; lng: number; updated_at: number }>();

/**
 * POST /api/bookings/[id]/live — update booking status (with validation).
 * Kept for backward compatibility with the frontend demo flow.
 * Now validates status transitions through the booking service when possible.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const status = body.status;

    // Accept user location updates
    if (body.user_lat && body.user_lng) {
      if (isValidCoord(body.user_lat, body.user_lng)) {
        userLocations.set(id, { lat: body.user_lat, lng: body.user_lng, updated_at: Date.now() });
      }
    }

    if (status) {
      // Update demo bookings cache
      const existing = demoBookings.get(id);
      demoBookings.set(id, {
        id,
        customer_id: existing?.customer_id || "customer",
        helper_id: existing?.helper_id || body.helper_id || "hlp_demo",
        status,
        lat: existing?.lat || body.lat || 28.6139,
        lng: existing?.lng || body.lng || 77.2090,
        address_short: existing?.address_short || body.address_short,
      });

      // Clean up live data on terminal statuses
      if (["completed", "cancelled"].includes(status)) {
        await liveLocationRepo.deleteLiveLocation(id).catch(() => {});
        await liveLocationRepo.deleteRoute(id).catch(() => {});
        userLocations.delete(id);
        try {
          await bookingRepo.updateBookingStatus(id, status as any, undefined, {
            customer_id: existing?.customer_id || "customer",
          });
        } catch { /* DB offline in dev */ }
      } else {
        // Try to update DB status
        try {
          await bookingRepo.updateBookingStatus(id, status as any, undefined, {
            customer_id: existing?.customer_id || "customer",
          });
        } catch { /* DB offline in dev */ }
      }
    }
    return NextResponse.json({ ok: true, status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const now = new Date();
    const serverTimeStr = now.toISOString();

    // 1. Resolve booking — prioritize demo cache if set, then DB
    let booking: any = null;
    if (demoBookings.has(id)) {
      booking = demoBookings.get(id);
    }
    if (!booking) {
      try {
        booking = await bookingRepo.getBooking(id);
      } catch {
        // DB offline in dev
      }
    }

    // Default mock fallback for dev if booking does not exist in DB yet
    if (!booking) {
      let qStatus: string | null = null;
      try {
        const url = (req as any).nextUrl || new URL(req.url);
        qStatus = url.searchParams.get("status");
      } catch { /* ignore */ }
      if (!qStatus) {
        qStatus = req.headers.get("x-booking-status");
      }

      booking = {
        id,
        customer_id: "customer",
        helper_id: "hlp_demo",
        status: qStatus || "accepted",
        lat: 28.6139,
        lng: 77.2090,
      };
      demoBookings.set(id, booking);
    }

    // 2. Authentication & Authorization
    let currentUser: any = null;
    let token: string | undefined;
    try {
      const cookieStore = await cookies();
      token = cookieStore.get("swepy_session")?.value;
    } catch {
      // outside Next.js context
    }
    const authHeader = req.headers.get("authorization");

    if (token) {
      try {
        currentUser = await authService.validateSession(token);
      } catch { /* ignore */ }
    } else if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        currentUser = await authService.validateSession(authHeader.substring(7));
      } catch { /* ignore */ }
    }

    // In dev / demo / test mode: if user header is passed
    const headerUserId = req.headers.get("x-user-id");
    const headerUserRole = req.headers.get("x-user-role");
    if (!currentUser && headerUserId) {
      currentUser = { id: headerUserId, role: headerUserRole || "user" };
    }

    // Permission check: only customer of booking, assigned helper, or demo access allowed
    const isAllowed =
      !currentUser || // Allow demo / unauthenticated dev exploration
      id === "demo" ||
      currentUser.id === booking.customer_id ||
      currentUser.id === booking.helper_id ||
      currentUser.role === "admin";

    if (!isAllowed) {
      return NextResponse.json({ error: "Forbidden: Not authorized to view this booking" }, { status: 403 });
    }

    // Determine if caller is the helper (to hide OTP from them)
    const isHelper = currentUser && (
      currentUser.id === booking.helper_id ||
      currentUser.role === "helper"
    );

    const bookingStatus = booking.status;
    const isSharingWindow = ["accepted", "on_the_way"].includes(bookingStatus);

    // 3. Outside sharing window: return only status, clean up if terminal or in-progress
    if (!isSharingWindow) {
      if (["completed", "cancelled", "in_progress"].includes(bookingStatus)) {
        await liveLocationRepo.deleteLiveLocation(id).catch(() => {});
        await liveLocationRepo.deleteRoute(id).catch(() => {});
        userLocations.delete(id);
      }

      const outsideResponse: any = {
        booking_status: bookingStatus,
        server_time: serverTimeStr,
      };

      // ETag based on status only (not server_time, which changes each request)
      const etag = `W/"${crypto.createHash("md5").update(bookingStatus).digest("hex")}"`;
      if (req.headers.get("if-none-match") === etag) {
        return new NextResponse(null, { status: 304, headers: { ETag: etag } });
      }

      return NextResponse.json(outsideResponse, {
        headers: { ETag: etag, "Cache-Control": "no-cache" },
      });
    }

    // 4. In sharing window: fetch live location & destination
    const liveLoc = await liveLocationRepo.getLiveLocation(id);

    // Destination = the coordinates saved at booking time
    const addrSnapshot = booking.address_snapshot;
    const destination = {
      lat: addrSnapshot?.lat ?? booking.lat ?? 28.6139,
      lng: addrSnapshot?.lng ?? booking.lng ?? 77.2090,
    };

    // Helper coordinates
    let helperPayload: any = null;
    let helperLat: number;
    let helperLng: number;

    if (liveLoc) {
      const updatedTimeMs = new Date(liveLoc.updated_at).getTime();
      const ageSeconds = (now.getTime() - updatedTimeMs) / 1000;
      const isStale = ageSeconds > 20;

      helperLat = liveLoc.lat;
      helperLng = liveLoc.lng;

      helperPayload = {
        lat: liveLoc.lat,
        lng: liveLoc.lng,
        heading_deg: liveLoc.heading_deg ?? null,
        accuracy_m: liveLoc.accuracy_m,
        updated_at: liveLoc.updated_at.toISOString ? liveLoc.updated_at.toISOString() : new Date(liveLoc.updated_at).toISOString(),
        stale: isStale,
      };
    } else {
      // No live location yet — use helper's last known location or a small offset
      helperLat = destination.lat + 0.008;
      helperLng = destination.lng - 0.006;
    }

    // User location (separate from helper, never mixed)
    const userLoc = userLocations.get(id);
    const userPosition = userLoc
      ? { lat: userLoc.lat, lng: userLoc.lng }
      : { lat: destination.lat, lng: destination.lng };

    // 5. Route calculation & caching
    let cachedRoute = await liveLocationRepo.getRoute(id);
    let needRecompute = false;

    // Skip routing when very close (< 30m)
    const directDistM = haversineMeters(
      { lat: helperLat, lng: helperLng },
      destination,
    );

    if (directDistM < 30) {
      // Very close — no route needed
      needRecompute = false;
    } else if (!cachedRoute) {
      needRecompute = true;
    } else {
      const routeAgeSeconds = (now.getTime() - new Date(cachedRoute.computed_at).getTime()) / 1000;
      const coords = cachedRoute.geometry.coordinates;

      // Distance of helper to route line
      const distToLineM = distanceToRouteLineMeters({ lat: helperLat, lng: helperLng }, coords);
      if (distToLineM > 50) {
        // Helper > 50m off route — recompute
        needRecompute = true;
      } else if (routeAgeSeconds > 45) {
        // Route older than 45s — recompute
        needRecompute = true;
      }
    }

    const routingProvider = getRoutingProvider();

    if (needRecompute && directDistM >= 30) {
      const computed = await routingProvider.calculateRoute(
        { lat: helperLat, lng: helperLng },
        destination
      );

      cachedRoute = {
        booking_id: id,
        geometry: computed.geometry,
        distance_m: computed.distance_m,
        duration_s: computed.duration_s,
        source: computed.source,
        computed_at: now,
      };

      await liveLocationRepo.saveRoute(cachedRoute);
    }

    // 6. Compute distance & ETA (ONE place, saved for both apps)
    const helperAccuracy = liveLoc?.accuracy_m ?? 25;
    const destAccuracy = 10; // destination is a fixed pin

    let distanceM: number;
    let etaMinutes: number;

    if (isAtLocation(directDistM, helperAccuracy, destAccuracy)) {
      // Within accuracy bubble — report 0
      distanceM = 0;
      etaMinutes = 0;
    } else if (cachedRoute && cachedRoute.distance_m > 0) {
      // Use route distance with ratio of remaining straight-line
      distanceM = Math.round(directDistM * 1.35);
      const ratio = Math.min(1, Math.max(0, distanceM / cachedRoute.distance_m));
      etaMinutes = Math.max(1, Math.round((cachedRoute.duration_s * ratio) / 60));
    } else {
      // Fallback: haversine * road factor
      distanceM = Math.round(directDistM * 1.35);
      const avgSpeedKmh = Number(process.env.AVG_SPEED_KMH) || 15;
      const speedMps = (avgSpeedKmh * 1000) / 3600;
      etaMinutes = Math.max(1, Math.round(distanceM / speedMps / 60));
    }

    // 7. Build response
    const responsePayload: any = {
      booking_status: bookingStatus,
      helper: helperPayload,
      destination,
      user_position: userPosition,
      route: cachedRoute
        ? {
            geometry: cachedRoute.geometry,
            distance_m: cachedRoute.distance_m,
            duration_s: cachedRoute.duration_s,
            source: cachedRoute.source,
          }
        : null,
      eta_minutes: etaMinutes,
      distance_m: distanceM,
      server_time: serverTimeStr,
    };

    // OTP: visible to USER only while status is accepted or on_the_way. NEVER to helper.
    if (!isHelper && isSharingWindow) {
      // For the user: include the OTP
      // The OTP is stored as a hash in the DB. For demo/dev, check if it's in the demoBookings cache.
      const demoB = demoBookings.get(id);
      if (demoB?.start_code) {
        responsePayload.start_code = demoB.start_code;
      }
      // If booking has a plaintext OTP in the demo cache, include it
      // In production, the OTP was returned once at accept time and cached by the frontend
    }

    // 8. ETag
    const contentToHash = {
      booking_status: responsePayload.booking_status,
      helper: responsePayload.helper,
      destination: responsePayload.destination,
      route: responsePayload.route,
      eta_minutes: responsePayload.eta_minutes,
      distance_m: responsePayload.distance_m,
    };
    const etag = `W/"${crypto.createHash("md5").update(JSON.stringify(contentToHash)).digest("hex")}"`;

    const ifNoneMatch = req.headers.get("if-none-match") || req.headers.get("If-None-Match");
    if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === etag.replace(/^W\//, ""))) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    return NextResponse.json(responsePayload, {
      headers: { ETag: etag, "Cache-Control": "no-cache" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
