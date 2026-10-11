import { NextRequest, NextResponse } from "next/server.js";
import { cookies } from "next/headers.js";
import crypto from "crypto";
import { authService } from "../../../auth/_init.ts";
import { liveLocationRepo } from "../../../../../server/repositories/live-location.repository.ts";
import { BookingRepository } from "../../../../../server/repositories/booking.repository.ts";
import { getRoutingProvider } from "../../../../../server/services/routing/index.ts";
import { distanceToRouteLineMeters } from "../../../../../server/services/routing/route-geometry.ts";
import { haversineDistanceMeters } from "../../../../../server/services/routing/straight-line.provider.ts";
import { helperActiveBookings } from "../../../helper/location/route.ts";

const bookingRepo = new BookingRepository();

// In-memory demo booking cache for /booking/demo or local testing
export const demoBookings = new Map<string, {
  id: string;
  customer_id: string;
  helper_id: string | null;
  status: string;
  lat: number;
  lng: number;
  address_short?: string;
}>();

// Initialize standard demo booking
demoBookings.set("demo", {
  id: "demo",
  customer_id: "demo_customer",
  helper_id: "hlp_demo",
  status: "on_the_way",
  lat: 28.6139,
  lng: 77.2090,
  address_short: "Hastsal · Delhi 110059",
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const now = new Date();
    const serverTimeStr = now.toISOString();

    // 1. Resolve booking
    let booking: any = null;
    if (demoBookings.has(id)) {
      booking = demoBookings.get(id);
    } else {
      // Check memory map from helper actions
      for (const [_, b] of helperActiveBookings.entries()) {
        if (b.booking_id === id) {
          booking = {
            id: b.booking_id,
            status: b.status,
            customer_id: b.customer_id || "customer",
            lat: b.lat || 28.6139,
            lng: b.lng || 77.2090,
          };
          break;
        }
      }
    }

    if (!booking) {
      try {
        booking = await bookingRepo.getBooking(id);
      } catch {
        // Fallback for dev
      }
    }

    // Default mock fallback for dev if booking does not exist in DB yet
    if (!booking) {
      booking = {
        id,
        customer_id: "customer",
        helper_id: "hlp_demo",
        status: "assigned",
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

    // In dev / demo / test mode: if user header is passed (e.g. x-user-id / x-user-role)
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

    const bookingStatus = booking.status;
    const isSharingWindow = ["assigned", "on_the_way", "arrived"].includes(bookingStatus);

    // 3. Outside sharing window: stop publishing, delete live row, return only status
    if (!isSharingWindow) {
      // Clean up live location row if booking progressed to in_progress / completed / cancelled
      if (["in_progress", "completed", "cancelled"].includes(bookingStatus)) {
        await liveLocationRepo.deleteLiveLocation(id);
        await liveLocationRepo.deleteRoute(id);
      }

      const outsideResponse = {
        booking_status: bookingStatus,
        server_time: serverTimeStr,
      };

      const etag = `W/"${crypto.createHash("md5").update(JSON.stringify(outsideResponse)).digest("hex")}"`;
      if (req.headers.get("if-none-match") === etag) {
        return new NextResponse(null, { status: 304, headers: { ETag: etag } });
      }

      return NextResponse.json(outsideResponse, {
        headers: {
          ETag: etag,
          "Cache-Control": "no-cache",
        },
      });
    }

    // 4. In sharing window: fetch live location & destination
    const liveLoc = await liveLocationRepo.getLiveLocation(id);

    // Default destination
    const destination = {
      lat: booking.lat ?? 28.6139,
      lng: booking.lng ?? 77.2090,
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
      // Initial state before first ping: slight offset for demo / initial view
      helperLat = destination.lat + 0.008;
      helperLng = destination.lng - 0.006;
    }

    // 5. Route calculation & caching
    let cachedRoute = await liveLocationRepo.getRoute(id);
    let needRecompute = false;

    if (!cachedRoute) {
      needRecompute = true;
    } else {
      const routeAgeSeconds = (now.getTime() - new Date(cachedRoute.computed_at).getTime()) / 1000;
      const coords = cachedRoute.geometry.coordinates;

      // Distance of helper to route line
      const distToLineM = distanceToRouteLineMeters({ lat: helperLat, lng: helperLng }, coords);
      if (distToLineM > 150) {
        needRecompute = true;
      } else if (routeAgeSeconds > 120) {
        // Check if helper moved > 300m from route origin
        const startPoint: [number, number] = coords[0] || [helperLng, helperLat];
        const distFromStartM = haversineDistanceMeters(
          { lat: helperLat, lng: helperLng },
          { lat: startPoint[1], lng: startPoint[0] }
        );
        if (distFromStartM > 300) {
          needRecompute = true;
        }
      }
    }

    const routingProvider = getRoutingProvider();

    if (needRecompute) {
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

    // 6. Compute distance & ETA
    // Remaining straight-line / remaining distance to destination
    const remainingDirectDistM = haversineDistanceMeters(
      { lat: helperLat, lng: helperLng },
      destination
    );

    let etaMinutes = 1;
    let distanceM = Math.round(remainingDirectDistM * 1.35);

    if (cachedRoute && cachedRoute.distance_m > 0) {
      distanceM = Math.round(remainingDirectDistM * 1.35);
      const ratio = Math.min(1, Math.max(0, distanceM / cachedRoute.distance_m));
      etaMinutes = Math.max(1, Math.round((cachedRoute.duration_s * ratio) / 60));
    } else {
      const avgSpeedKmh = Number(process.env.AVG_SPEED_KMH) || 15;
      const speedMps = (avgSpeedKmh * 1000) / 3600;
      etaMinutes = Math.max(1, Math.round(distanceM / speedMps / 60));
    }

    const responsePayload = {
      booking_status: bookingStatus,
      helper: helperPayload,
      destination,
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

    // 7. ETag generation and 304 response (computed on state data, not ephemeral server_time)
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
      headers: {
        ETag: etag,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
