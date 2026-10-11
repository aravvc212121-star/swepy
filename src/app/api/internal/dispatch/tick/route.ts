import { NextRequest, NextResponse } from "next/server.js";
import { liveLocationRepo } from "@/server/repositories/live-location.repository";

export async function POST(req: NextRequest) {
  try {
    const internalKey = process.env.INTERNAL_API_KEY;
    const providedKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");

    if (internalKey && providedKey && internalKey !== providedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cleanup live rows older than 10 minutes (600,000 ms)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const cleanedCount = await liveLocationRepo.cleanupStaleLocations(tenMinutesAgo);

    return NextResponse.json({
      success: true,
      cleaned_count: cleanedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Tick failed" }, { status: 500 });
  }
}
