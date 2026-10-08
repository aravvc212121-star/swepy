/**
 * Interfaces for pluggable infrastructure — swap implementations later.
 * These interfaces sit in front of what will change when moving to production.
 */

/** OTP delivery (SMS, WhatsApp, etc.) */
export interface OtpSender {
  send(phoneE164: string, otp: string): Promise<void>;
}

/** Realtime push to connected clients (polling, SSE, WebSocket) */
export interface RealtimeGateway {
  publish(channel: string, event: string, payload: unknown): Promise<void>;
}

/** Background job queue */
export interface JobQueue {
  enqueue(jobType: string, payload: unknown, options?: { delayMs?: number }): Promise<void>;
}

/** Clock abstraction for testability */
export interface Clock {
  now(): Date;
  nowMs(): number;
}

/** ID generation */
export interface IdGenerator {
  uuid(): string;
  startCode(): string;
  otp6(): string;
  sessionToken(): string;
}
