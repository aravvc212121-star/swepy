/**
 * Crypto utilities — HMAC hashing for OTPs and SHA-256 for session tokens.
 * OTPs are HMAC'd with SESSION_SECRET so even a DB leak doesn't expose them.
 */

import { createHmac, createHash } from 'crypto';

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET is not set');
  return s;
}

/** HMAC-SHA256 a value with the app secret. Used for OTP hashing. */
export function hmacHash(value: string): string {
  return createHmac('sha256', getSecret()).update(value).digest('hex');
}

/** SHA-256 hash. Used for session token hashing (the token itself is the secret). */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
