import { sql } from '../db/client';
import { uuidv7 } from '../lib/id';

export interface OtpChallenge {
  id: string;
  phone_e164: string;
  code_hash: string;
  attempts: number;
  max_attempts: number;
  expires_at: Date;
  consumed_at: Date | null;
}

export interface User {
  id: string;
  role: string;
  phone_e164: string;
  full_name: string;
}

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
}

export class AuthRepository {
  async createOtpChallenge(phone: string, hash: string, expiresAt: Date): Promise<string> {
    const id = uuidv7();
    await sql`
      INSERT INTO otp_challenges (id, phone_e164, code_hash, expires_at)
      VALUES (${id}, ${phone}, ${hash}, ${expiresAt})
    `;
    return id;
  }

  async getLatestChallenge(phone: string): Promise<OtpChallenge | null> {
    const rows = await sql<OtpChallenge[]>`
      SELECT * FROM otp_challenges
      WHERE phone_e164 = ${phone}
        AND consumed_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return rows[0] || null;
  }

  async incrementChallengeAttempts(id: string): Promise<void> {
    await sql`UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = ${id}`;
  }

  async consumeChallenge(id: string): Promise<void> {
    await sql`UPDATE otp_challenges SET consumed_at = NOW() WHERE id = ${id}`;
  }

  async upsertUserByPhone(phone: string, role: string): Promise<User> {
    const id = uuidv7();
    const rows = await sql<User[]>`
      INSERT INTO users (id, phone_e164, role, phone_verified_at)
      VALUES (${id}, ${phone}, ${role}, NOW())
      ON CONFLICT (phone_e164) DO UPDATE
      SET last_login_at = NOW()
      RETURNING id, role, phone_e164, full_name
    `;
    return rows[0];
  }

  async createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<Session> {
    const id = uuidv7();
    const rows = await sql<Session[]>`
      INSERT INTO sessions (id, user_id, token_hash, expires_at)
      VALUES (${id}, ${userId}, ${tokenHash}, ${expiresAt})
      RETURNING id, user_id, token_hash, expires_at
    `;
    return rows[0];
  }

  async getSessionByTokenHash(tokenHash: string): Promise<(Session & { user: User }) | null> {
    const rows = await sql<any[]>`
      SELECT s.id, s.user_id, s.token_hash, s.expires_at,
             u.id as u_id, u.role, u.phone_e164, u.full_name
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token_hash = ${tokenHash}
        AND s.expires_at > NOW()
        AND s.revoked_at IS NULL
        AND u.deleted_at IS NULL
    `;
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      user_id: r.user_id,
      token_hash: r.token_hash,
      expires_at: r.expires_at,
      user: {
        id: r.u_id,
        role: r.role,
        phone_e164: r.phone_e164,
        full_name: r.full_name,
      }
    };
  }

  async revokeSession(tokenHash: string): Promise<void> {
    await sql`UPDATE sessions SET revoked_at = NOW() WHERE token_hash = ${tokenHash}`;
  }
}
