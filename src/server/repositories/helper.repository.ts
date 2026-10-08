import { sql } from '../db/client';

export class HelperRepository {
  async getOnlineHelpersInCity(cityId: string): Promise<any[]> {
    const rows = await sql`
      SELECT h.*, u.full_name, u.phone_e164
      FROM helpers h
      JOIN users u ON h.user_id = u.id
      WHERE h.city_id = ${cityId}
        AND h.is_online = TRUE
        AND h.status = 'active'
        AND h.verification_status = 'verified'
    `;
    return rows;
  }

  async setOnlineStatus(helperId: string, isOnline: boolean, lat?: number, lng?: number, h3Cell?: string): Promise<void> {
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
  }
}
