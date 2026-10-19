import { sql } from '../db/client';

export interface HelperRecord {
  user_id: string;
  city_id?: string;
  full_name: string;
  phone_e164?: string;
  status: 'active' | 'suspended' | 'pending';
  verification_status: 'verified' | 'unverified';
  is_online: boolean;
  online_since?: string | null;
  last_lat?: number | null;
  last_lng?: number | null;
  last_location_at?: string | Date | null;
  rating_avg?: number;
  rating_count?: number;
  jobs_completed?: number;
}

// Global in-memory helper store for dev/simulation/tests
const g = globalThis as any;
if (!g.__swepyHelpers) g.__swepyHelpers = new Map<string, HelperRecord>();

export class HelperRepository {
  private memHelpers = g.__swepyHelpers as Map<string, HelperRecord>;

  clear(): void {
    this.memHelpers.clear();
  }

  async getOnlineHelpersInCity(cityId?: string): Promise<HelperRecord[]> {
    if (process.env.USE_IN_MEMORY_DB !== 'true') {
      try {
        const rows = await sql`
          SELECT h.*, u.full_name, u.phone_e164
          FROM helpers h
          JOIN users u ON h.user_id = u.id
          WHERE (${cityId ?? null}::text IS NULL OR h.city_id = ${cityId})
            AND h.is_online = TRUE
            AND h.status = 'active'
        `;
        if (rows && rows.length > 0) return rows as unknown as HelperRecord[];
      } catch {
        // DB offline
      }
    }

    const online: HelperRecord[] = [];
    for (const h of this.memHelpers.values()) {
      if (h.is_online && h.status === 'active') {
        if (!cityId || !h.city_id || h.city_id === cityId) {
          online.push(h);
        }
      }
    }
    return online;
  }

  async getAllOnlineHelpers(): Promise<HelperRecord[]> {
    return this.getOnlineHelpersInCity();
  }

  async setOnlineStatus(
    helperId: string,
    isOnline: boolean,
    lat?: number,
    lng?: number,
    h3Cell?: string
  ): Promise<void> {
    const existing = this.memHelpers.get(helperId) || {
      user_id: helperId,
      full_name: 'Helper ' + helperId,
      status: 'active',
      verification_status: 'verified',
      is_online: isOnline,
    };

    const updated: HelperRecord = {
      ...existing,
      is_online: isOnline,
      online_since: isOnline ? new Date().toISOString() : null,
      last_lat: lat !== undefined ? lat : existing.last_lat,
      last_lng: lng !== undefined ? lng : existing.last_lng,
      last_location_at: lat !== undefined ? new Date().toISOString() : existing.last_location_at,
    };
    this.memHelpers.set(helperId, updated);

    if (process.env.USE_IN_MEMORY_DB !== 'true') {
      try {
        await sql`
          UPDATE helpers
          SET is_online = ${isOnline},
              online_since = CASE WHEN ${isOnline} = TRUE THEN NOW() ELSE NULL END,
              last_lat = COALESCE(${lat ?? null}, last_lat),
              last_lng = COALESCE(${lng ?? null}, last_lng),
              last_h3_cell = COALESCE(${h3Cell ?? null}, last_h3_cell),
              last_location_at = NOW()
          WHERE user_id = ${helperId}
        `;
      } catch {
        // DB offline
      }
    }
  }

  async registerOrUpdateHelper(record: Partial<HelperRecord> & { user_id: string }): Promise<HelperRecord> {
    const existing = this.memHelpers.get(record.user_id) || {
      user_id: record.user_id,
      full_name: record.full_name || 'Helper ' + record.user_id,
      status: 'active',
      verification_status: 'verified',
      is_online: true,
      last_location_at: new Date().toISOString(),
    };

    const updated: HelperRecord = {
      ...existing,
      ...record,
      last_location_at: record.last_location_at || existing.last_location_at || new Date().toISOString(),
    };
    this.memHelpers.set(record.user_id, updated);
    return updated;
  }

  async hasActiveBooking(helperId: string): Promise<boolean> {
    // Check in-memory bookings first
    const memBookings = (g.__swepyBookings as Map<string, any>) || new Map();
    for (const b of memBookings.values()) {
      if (b.helper_id === helperId) {
        const s = String(b.status).toUpperCase();
        if (s === 'ACCEPTED' || s === 'CONFIRMED' || s === 'ON_THE_WAY' || s === 'IN_PROGRESS') {
          return true;
        }
      }
    }

    if (process.env.USE_IN_MEMORY_DB !== 'true') {
      try {
        const rows = await sql`
          SELECT id FROM bookings
          WHERE helper_id = ${helperId}
            AND status IN ('ACCEPTED', 'accepted', 'CONFIRMED', 'confirmed', 'on_the_way', 'in_progress')
          LIMIT 1
        `;
        return rows.length > 0;
      } catch {
        // DB offline
      }
    }

    return false;
  }

  async getHelper(helperId: string): Promise<HelperRecord | null> {
    const mem = this.memHelpers.get(helperId);
    if (mem) return mem;

    if (process.env.USE_IN_MEMORY_DB !== 'true') {
      try {
        const rows = await sql`
          SELECT h.*, u.full_name, u.phone_e164
          FROM helpers h
          JOIN users u ON h.user_id = u.id
          WHERE h.user_id = ${helperId}
        `;
        if (rows && rows[0]) return rows[0] as unknown as HelperRecord;
      } catch {
        // DB offline
      }
    }

    return null;
  }

  createOrUpdateSimulationHelper(data: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    is_online?: boolean;
    last_location_update?: string;
  }): HelperRecord & { id: string } {
    const record: any = {
      id: data.id,
      user_id: data.id,
      full_name: data.name,
      status: 'active',
      verification_status: 'verified',
      is_online: data.is_online !== undefined ? data.is_online : true,
      last_lat: data.lat,
      last_lng: data.lng,
      last_location_at: data.last_location_update || new Date().toISOString(),
    };
    this.memHelpers.set(data.id, record);
    return record;
  }
}

export const helperRepo = new HelperRepository();
