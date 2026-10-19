import { NextRequest, NextResponse } from "next/server.js";
import { liveLocationRepo } from "@/server/repositories/live-location.repository";
import { bookingService } from "@/server/services/booking.service";

/**
 * POST /api/internal/dispatch/tick — periodic maintenance & sweeper task.
 * 1. Sweeps stale offers and expires stale searching orders (120s limit)
 * 2. Cleans up stale live location rows older than 10 minutes
 */
export async function POST(req: NextRequest) {
  try {
    const internalKey = process.env.INTERNAL_API_KEY;
    const providedKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");

    if (internalKey && providedKey && internalKey !== providedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Sweeper for stale offers and searching orders
    let sweepResult = { expiredOffers: 0, expiredOrders: 0 };
    try {
      sweepResult = await bookingService.sweepStaleOrders();
    } catch (err: any) {
      console.warn("[Tick] Failed to sweep stale orders:", err.message);
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
      expired_offers: sweepResult.expiredOffers,
      expired_orders: sweepResult.expiredOrders,
      cleaned_live_rows: cleanedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Tick failed" }, { status: 500 });
  }
}
