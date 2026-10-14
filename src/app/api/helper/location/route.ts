import { NextRequest, NextResponse } from "next/server.js";
import { z } from "zod";
import { cookies } from "next/headers.js";
import { authService } from "../../auth/_init.ts";
import { liveLocationRepo } from "../../../../server/repositories/live-location.repository.ts";
import { BookingRepository } from "../../../../server/repositories/booking.repository.ts";
import { isValidCoord, isReasonableSpeed, haversineMeters } from "../../../../server/lib/geo.ts";

// In-memory rate limiting map: helper_id -> last request timestamp ms
const helperLastPing = new Map<string, number>();

// In-memory active bookings lookup for helpers (tracks in-memory/demo bookings during dev)
export const helperActiveBookings = new Map<string, { booking_id: string; status: string; customer_id?: string; lat?: number; lng?: number }>();

// Breadcrumb storage: booking_id -> array of {lat, lng, ts}
const breadcrumbs = new Map<string, { lat: number; lng: number; ts: number }[]>();
const MAX_BREADCRUMBS = 500;
const MIN_BREADCRUMB_MOVE_M = 10;

// Previous location for speed checks: helper_id -> {lat, lng, ts}
const prevLocations = new Map<string, { lat: number; lng: number; ts: number }>();

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy_m: z.number().nonnegative(),
  heading_deg: z.number().min(0).max(360).nullable().optional(),
  speed_mps: z.number().nonnegative().nullable().optional(),
  recorded_at: z.string().or(z.number()),
});

const bookingRepo = new BookingRepository();

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate helper role
    let helperId: string | null = null;

    let token: string | undefined;
    try {
      const cookieStore = await cookies();
      token = cookieStore.get("swepy_session")?.value;
    } catch {
      // outside Next.js context
    }
    const authHeader = req.headers.get("authorization");
    const headerHelperId = req.headers.get("x-helper-id");

    if (token) {
      try {
        const user = await authService.validateSession(token);
        if (user && user.role === "helper") {
          helperId = user.id;
        }
      } catch {
        // Continue to other auth mechanisms in dev
      }
    } else if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const user = await authService.validateSession(authHeader.substring(7));
        if (user && user.role === "helper") {
          helperId = user.id;
        }
      } catch {
        // Fallback
      }
    }

    // In dev / test / demo fallback
    if (!helperId && headerHelperId) {
      helperId = headerHelperId;
    }

    if (!helperId) {
      // Check query param helperId for dev / testing convenience
      try {
        const url = (req as any).nextUrl || new URL(req.url);
        const qHelperId = url.searchParams.get("helperId");
        if (qHelperId) {
          helperId = qHelperId;
        }
      } catch { /* ignore */ }
    }

    if (!helperId) {
      return NextResponse.json({ error: "Unauthorized: Helper role required" }, { status: 401 });
    }

    // 2. Rate limiting: 1 request per 2 seconds per helper
    const now = Date.now();
    const lastPing = helperLastPing.get(helperId) || 0;
    const elapsed = now - lastPing;

    if (elapsed < 1950) {
      // Rate limit triggered: return 429 + Retry-After: 2
      return new NextResponse(
        JSON.stringify({ error: "Rate limit exceeded. Maximum 1 request per 2 seconds." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "2",
          },
        }
      );
    }
    helperLastPing.set(helperId, now);

    // 3. Parse and validate body
    const body = await req.json();
    const parsed = locationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid location payload", details: parsed.error.issues }, { status: 400 });
    }

    const { lat, lng, accuracy_m, heading_deg, speed_mps, recorded_at } = parsed.data;

    // 4. Validate coordinates
    if (!isValidCoord(lat, lng)) {
      return NextResponse.json({ error: "Invalid coordinates (out of range or null island)" }, { status: 400 });
    }

    // 5. Reject timestamps more than 30 s off server time
    const recordedTimeMs = typeof recorded_at === "number" ? recorded_at : new Date(recorded_at).getTime();
    if (isNaN(recordedTimeMs) || Math.abs(now - recordedTimeMs) > 30000) {
      return NextResponse.json({ error: "Timestamp out of acceptable window (30s drift)" }, { status: 400 });
    }

    // 6. Check for impossible speed jumps (> 50 m/s ≈ 180 km/h)
    const prev = prevLocations.get(helperId);
    if (prev) {
      const distFromPrev = haversineMeters({ lat, lng }, { lat: prev.lat, lng: prev.lng });
      const timeDeltaMs = now - prev.ts;
      if (timeDeltaMs > 0 && !isReasonableSpeed(distFromPrev, timeDeltaMs, 50)) {
        // Suspicious jump — log and ignore this update
        console.warn(`[Location] Impossible speed for helper ${helperId}: ${distFromPrev}m in ${timeDeltaMs}ms`);
        return NextResponse.json({ ok: true, next_interval_ms: 4000, warning: "Jump too large, ignored" });
      }
    }
    prevLocations.set(helperId, { lat, lng, ts: now });

    // 7. Check if helper has an active booking (accepted or on_the_way)
    let activeBookingId: string | null = null;

    // Check in-memory / demo map first
    const memBooking = helperActiveBookings.get(helperId);
    if (memBooking && ["accepted", "on_the_way"].includes(memBooking.status)) {
      activeBookingId = memBooking.booking_id;
    }

    // Check DB
    if (!activeBookingId) {
      try {
        const dbBooking = await bookingRepo.findActiveForHelper(helperId);
        if (dbBooking) {
          activeBookingId = dbBooking.id;
        }
      } catch {
        // Ignore DB offline
      }
    }

    // If query param bookingId is passed (e.g. from simulator or active job)
    let explicitBookingId: string | null = null;
    try {
      const url = (req as any).nextUrl || new URL(req.url);
      explicitBookingId = url.searchParams.get("bookingId");
    } catch { /* ignore */ }
    if (explicitBookingId) {
      activeBookingId = explicitBookingId;
    }

    if (activeBookingId) {
      // Helper is in active booking sharing window: upsert live location
      await liveLocationRepo.upsertLiveLocation({
        booking_id: activeBookingId,
        helper_id: helperId,
        lat,
        lng,
        accuracy_m,
        heading_deg: heading_deg ?? null,
        speed_mps: speed_mps ?? null,
        recorded_at: new Date(recordedTimeMs),
      });

      // Store breadcrumb if moved > MIN_BREADCRUMB_MOVE_M
      const crumbs = breadcrumbs.get(activeBookingId) || [];
      const lastCrumb = crumbs[crumbs.length - 1];
      const shouldAddCrumb = !lastCrumb ||
        haversineMeters({ lat, lng }, { lat: lastCrumb.lat, lng: lastCrumb.lng }) >= MIN_BREADCRUMB_MOVE_M;

      if (shouldAddCrumb) {
        crumbs.push({ lat, lng, ts: now });
        // Cap breadcrumbs
        while (crumbs.length > MAX_BREADCRUMBS) crumbs.shift();
        breadcrumbs.set(activeBookingId, crumbs);
      }

      return NextResponse.json({
        ok: true,
        next_interval_ms: 4000, // 4s polling during active trip
      });
    }

    // Otherwise, helper is idle: update idle location
    await liveLocationRepo.updateHelperIdleLocation(helperId, lat, lng);

    return NextResponse.json({
      ok: true,
      next_interval_ms: 30000, // 30s polling when idle
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

/** Clear breadcrumbs for a booking (called on completion) */
export function clearBreadcrumbs(bookingId: string): void {
  breadcrumbs.delete(bookingId);
}
