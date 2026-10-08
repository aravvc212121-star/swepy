/**
 * UUIDv7 generator — time-ordered UUIDs for primary keys.
 * Sortable by creation time, globally unique, no DB extension required.
 */

import { randomBytes } from 'crypto';

/**
 * Generate a UUIDv7 (RFC 9562) — 48-bit Unix timestamp ms + 74 random bits.
 * Format: xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
 */
export function uuidv7(): string {
  const now = BigInt(Date.now());
  const bytes = new Uint8Array(16);

  // Fill with random bytes first
  const rand = randomBytes(16);
  bytes.set(rand);

  // Bytes 0-5: 48-bit timestamp (big-endian)
  bytes[0] = Number((now >> BigInt(40)) & BigInt(0xFF));
  bytes[1] = Number((now >> BigInt(32)) & BigInt(0xFF));
  bytes[2] = Number((now >> BigInt(24)) & BigInt(0xFF));
  bytes[3] = Number((now >> BigInt(16)) & BigInt(0xFF));
  bytes[4] = Number((now >> BigInt(8)) & BigInt(0xFF));
  bytes[5] = Number(now & BigInt(0xFF));

  // Byte 6: version 7 (0111xxxx)
  bytes[6] = (bytes[6] & 0x0F) | 0x70;

  // Byte 8: variant 10xxxxxx
  bytes[8] = (bytes[8] & 0x3F) | 0x80;

  // Format as UUID string
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/** Generate a random 4-digit numeric code (for start_code). */
export function generateStartCode(): string {
  const min = 1000;
  const max = 9999;
  return String(min + (randomBytes(2).readUInt16BE() % (max - min + 1)));
}

/** Generate a 6-digit OTP. */
export function generateOtp6(): string {
  const min = 100000;
  const max = 999999;
  return String(min + (randomBytes(3).readUIntBE(0, 3) % (max - min + 1)));
}

/** Generate a random 32-byte token (for session tokens). */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}
