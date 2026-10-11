import { sql } from "../db/client";
import { RouteGeometry } from "../services/routing/routing.types";

export interface LiveLocationRecord {
  booking_id: string;
  helper_id: string;
  lat: number;
  lng: number;
  accuracy_m: number;
  heading_deg: number | null;
  speed_mps: number | null;
  recorded_at: Date;
  updated_at: Date;
}

export interface RouteRecord {
  booking_id: string;
  geometry: RouteGeometry;
  distance_m: number;
  duration_s: number;
  source: "ors" | "straight_line";
  computed_at: Date;
}

export interface ILiveLocationRepository {
  upsertLiveLocation(loc: {
    booking_id: string;
    helper_id: string;
    lat: number;
    lng: number;
    accuracy_m: number;
    heading_deg?: number | null;
    speed_mps?: number | null;
    recorded_at: Date;
  }): Promise<void>;
  getLiveLocation(bookingId: string): Promise<LiveLocationRecord | null>;
  deleteLiveLocation(bookingId: string): Promise<void>;
  saveRoute(route: {
    booking_id: string;
    geometry: RouteGeometry;
    distance_m: number;
    duration_s: number;
    source: "ors" | "straight_line";
    computed_at: Date;
  }): Promise<void>;
  getRoute(bookingId: string): Promise<RouteRecord | null>;
  deleteRoute(bookingId: string): Promise<void>;
  updateHelperIdleLocation(helperId: string, lat: number, lng: number): Promise<void>;
  cleanupStaleLocations(cutoffTime: Date): Promise<number>;
}

// In-Memory store for local development or fallback
class InMemoryLiveLocationRepository implements ILiveLocationRepository {
  private liveLocations = new Map<string, LiveLocationRecord>();
  private routes = new Map<string, RouteRecord>();
  private helperLastIdleUpdate = new Map<string, number>();

  async upsertLiveLocation(loc: {
    booking_id: string;
    helper_id: string;
    lat: number;
    lng: number;
    accuracy_m: number;
    heading_deg?: number | null;
    speed_mps?: number | null;
    recorded_at: Date;
  }): Promise<void> {
    this.liveLocations.set(loc.booking_id, {
      ...loc,
      heading_deg: loc.heading_deg ?? null,
      speed_mps: loc.speed_mps ?? null,
      updated_at: new Date(),
    });
  }

  async getLiveLocation(bookingId: string): Promise<LiveLocationRecord | null> {
    return this.liveLocations.get(bookingId) || null;
  }

  async deleteLiveLocation(bookingId: string): Promise<void> {
    this.liveLocations.delete(bookingId);
  }

  async saveRoute(route: {
    booking_id: string;
    geometry: RouteGeometry;
    distance_m: number;
    duration_s: number;
    source: "ors" | "straight_line";
    computed_at: Date;
  }): Promise<void> {
    this.routes.set(route.booking_id, route);
  }

  async getRoute(bookingId: string): Promise<RouteRecord | null> {
    return this.routes.get(bookingId) || null;
  }

  async deleteRoute(bookingId: string): Promise<void> {
    this.routes.delete(bookingId);
  }

  async updateHelperIdleLocation(helperId: string, lat: number, lng: number): Promise<void> {
    const now = Date.now();
    const lastUpdate = this.helperLastIdleUpdate.get(helperId) || 0;
    // Throttle helper idle updates to at most once every 15 s
    if (now - lastUpdate >= 15000) {
      this.helperLastIdleUpdate.set(helperId, now);
    }
  }

  async cleanupStaleLocations(cutoffTime: Date): Promise<number> {
    let deletedCount = 0;
    const cutoffMs = cutoffTime.getTime();
    for (const [bookingId, loc] of this.liveLocations.entries()) {
      if (loc.updated_at.getTime() < cutoffMs) {
        this.liveLocations.delete(bookingId);
        this.routes.delete(bookingId);
        deletedCount++;
      }
    }
    return deletedCount;
  }
}

// Postgres repository implementation
class PostgresLiveLocationRepository implements ILiveLocationRepository {
  private helperLastIdleUpdate = new Map<string, number>();

  async upsertLiveLocation(loc: {
    booking_id: string;
    helper_id: string;
    lat: number;
    lng: number;
    accuracy_m: number;
    heading_deg?: number | null;
    speed_mps?: number | null;
    recorded_at: Date;
  }): Promise<void> {
    await sql`
      INSERT INTO booking_live_locations (
        booking_id, helper_id, lat, lng, accuracy_m, heading_deg, speed_mps, recorded_at, updated_at
      ) VALUES (
        ${loc.booking_id},
        ${loc.helper_id},
        ${loc.lat},
        ${loc.lng},
        ${loc.accuracy_m},
        ${loc.heading_deg ?? null},
        ${loc.speed_mps ?? null},
        ${loc.recorded_at},
        NOW()
      )
      ON CONFLICT (booking_id) DO UPDATE SET
        helper_id = EXCLUDED.helper_id,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        accuracy_m = EXCLUDED.accuracy_m,
        heading_deg = EXCLUDED.heading_deg,
        speed_mps = EXCLUDED.speed_mps,
        recorded_at = EXCLUDED.recorded_at,
        updated_at = NOW();
    `;
  }

  async getLiveLocation(bookingId: string): Promise<LiveLocationRecord | null> {
    const rows = await sql<LiveLocationRecord[]>`
      SELECT booking_id, helper_id, lat, lng, accuracy_m, heading_deg, speed_mps, recorded_at, updated_at
      FROM booking_live_locations
      WHERE booking_id = ${bookingId}
      LIMIT 1;
    `;
    return rows[0] || null;
  }

  async deleteLiveLocation(bookingId: string): Promise<void> {
    await sql`
      DELETE FROM booking_live_locations
      WHERE booking_id = ${bookingId};
    `;
  }

  async saveRoute(route: {
    booking_id: string;
    geometry: RouteGeometry;
    distance_m: number;
    duration_s: number;
    source: "ors" | "straight_line";
    computed_at: Date;
  }): Promise<void> {
    await sql`
      INSERT INTO booking_routes (
        booking_id, geometry, distance_m, duration_s, source, computed_at
      ) VALUES (
        ${route.booking_id},
        ${JSON.stringify(route.geometry)},
        ${route.distance_m},
        ${route.duration_s},
        ${route.source},
        ${route.computed_at}
      )
      ON CONFLICT (booking_id) DO UPDATE SET
        geometry = EXCLUDED.geometry,
        distance_m = EXCLUDED.distance_m,
        duration_s = EXCLUDED.duration_s,
        source = EXCLUDED.source,
        computed_at = EXCLUDED.computed_at;
    `;
  }

  async getRoute(bookingId: string): Promise<RouteRecord | null> {
    const rows = await sql<any[]>`
      SELECT booking_id, geometry, distance_m, duration_s, source, computed_at
      FROM booking_routes
      WHERE booking_id = ${bookingId}
      LIMIT 1;
    `;
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      booking_id: r.booking_id,
      geometry: typeof r.geometry === "string" ? JSON.parse(r.geometry) : r.geometry,
      distance_m: r.distance_m,
      duration_s: r.duration_s,
      source: r.source,
      computed_at: r.computed_at,
    };
  }

  async deleteRoute(bookingId: string): Promise<void> {
    await sql`
      DELETE FROM booking_routes
      WHERE booking_id = ${bookingId};
    `;
  }

  async updateHelperIdleLocation(helperId: string, lat: number, lng: number): Promise<void> {
    const now = Date.now();
    const lastUpdate = this.helperLastIdleUpdate.get(helperId) || 0;
    // Throttle helper idle updates to at most once every 15 s
    if (now - lastUpdate < 15000) {
      return;
    }
    this.helperLastIdleUpdate.set(helperId, now);

    await sql`
      UPDATE helpers
      SET last_lat = ${lat},
          last_lng = ${lng},
          last_location_at = NOW()
      WHERE user_id = ${helperId};
    `;
  }

  async cleanupStaleLocations(cutoffTime: Date): Promise<number> {
    const deletedLocs = await sql`
      DELETE FROM booking_live_locations
      WHERE updated_at < ${cutoffTime}
      RETURNING booking_id;
    `;
    if (deletedLocs.length > 0) {
      const ids = deletedLocs.map((r: any) => r.booking_id);
      await sql`
        DELETE FROM booking_routes
        WHERE booking_id IN ${sql(ids)};
      `;
    }
    return deletedLocs.length;
  }
}

// Resilient Hybrid Repository: uses Postgres if available, falls back to in-memory gracefully
export class HybridLiveLocationRepository implements ILiveLocationRepository {
  private pgRepo = new PostgresLiveLocationRepository();
  private memRepo = new InMemoryLiveLocationRepository();
  private useMemoryOnly: boolean | null = null;

  private async canUsePostgres(): Promise<boolean> {
    if (this.useMemoryOnly === true) return false;
    if (process.env.USE_IN_MEMORY_DB === "true") {
      this.useMemoryOnly = true;
      return false;
    }
    try {
      // Test quick ping once if undecided
      if (this.useMemoryOnly === null) {
        await sql`SELECT 1`;
        this.useMemoryOnly = false;
      }
      return true;
    } catch {
      this.useMemoryOnly = true;
      return false;
    }
  }

  async upsertLiveLocation(loc: any): Promise<void> {
    if (await this.canUsePostgres()) {
      try {
        await this.pgRepo.upsertLiveLocation(loc);
        return;
      } catch (e) {
        this.useMemoryOnly = true;
      }
    }
    await this.memRepo.upsertLiveLocation(loc);
  }

  async getLiveLocation(bookingId: string): Promise<LiveLocationRecord | null> {
    if (await this.canUsePostgres()) {
      try {
        return await this.pgRepo.getLiveLocation(bookingId);
      } catch {
        this.useMemoryOnly = true;
      }
    }
    return this.memRepo.getLiveLocation(bookingId);
  }

  async deleteLiveLocation(bookingId: string): Promise<void> {
    if (await this.canUsePostgres()) {
      try {
        await this.pgRepo.deleteLiveLocation(bookingId);
      } catch {
        this.useMemoryOnly = true;
      }
    }
    await this.memRepo.deleteLiveLocation(bookingId);
  }

  async saveRoute(route: any): Promise<void> {
    if (await this.canUsePostgres()) {
      try {
        await this.pgRepo.saveRoute(route);
        return;
      } catch {
        this.useMemoryOnly = true;
      }
    }
    await this.memRepo.saveRoute(route);
  }

  async getRoute(bookingId: string): Promise<RouteRecord | null> {
    if (await this.canUsePostgres()) {
      try {
        return await this.pgRepo.getRoute(bookingId);
      } catch {
        this.useMemoryOnly = true;
      }
    }
    return this.memRepo.getRoute(bookingId);
  }

  async deleteRoute(bookingId: string): Promise<void> {
    if (await this.canUsePostgres()) {
      try {
        await this.pgRepo.deleteRoute(bookingId);
      } catch {
        this.useMemoryOnly = true;
      }
    }
    await this.memRepo.deleteRoute(bookingId);
  }

  async updateHelperIdleLocation(helperId: string, lat: number, lng: number): Promise<void> {
    if (await this.canUsePostgres()) {
      try {
        await this.pgRepo.updateHelperIdleLocation(helperId, lat, lng);
        return;
      } catch {
        this.useMemoryOnly = true;
      }
    }
    await this.memRepo.updateHelperIdleLocation(helperId, lat, lng);
  }

  async cleanupStaleLocations(cutoffTime: Date): Promise<number> {
    if (await this.canUsePostgres()) {
      try {
        return await this.pgRepo.cleanupStaleLocations(cutoffTime);
      } catch {
        this.useMemoryOnly = true;
      }
    }
    return this.memRepo.cleanupStaleLocations(cutoffTime);
  }
}

// Global singleton
export const liveLocationRepo = new HybridLiveLocationRepository();
