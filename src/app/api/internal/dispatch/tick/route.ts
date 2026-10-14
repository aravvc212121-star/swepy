import { NextRequest, NextResponse } from "next/server.js";
import { liveLocationRepo } from "@/server/repositories/live-location.repository";
import { bookingService } from "@/server/services/booking.service";

/**
 * POST /api/internal/dispatch/tick — periodic maintenance task.
 * 1. Expire stale searching bookings (default 120s timeout, configurable via SEARCH_TIMEOUT_MS)
 * 2. Clean up stale live location rows (older than 10 minutes)
 */
export async function POST(req: NextRequest) {
  try {
    const internalKey = process.env.INTERNAL_API_KEY;
    const providedKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");

    if (internalKey && providedKey && internalKey !== providedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Expire stale searching bookings
    const searchTimeoutMs = Number(process.env.SEARCH_TIMEOUT_MS) || 120_000;
    let expiredCount = 0;
    try {
      expiredCount = await bookingService.expireStaleSearching(searchTimeoutMs);
    } catch (err: any) {
      console.warn("[Tick] Failed to expire stale bookings:", err.message);
    }

    // 2. Cleanup live rows older than 10 minutes (600,000 ms)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    let cleanedCount = 0;
    try {
      cleanedCount = await liveLocationRepo.cleanupStaleLocations(tenMinutesAgo);
    } catch (err: any) {
      console.warn("[Tick] Failed to cleanup stale locations:", err.message);
    }

    return NextResponse.json({
      success: true,
      expired_count: expiredCount,
      cleaned_count: cleanedCount,
      search_timeout_ms: searchTimeoutMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Tick failed" }, { status: 500 });
  }
}
