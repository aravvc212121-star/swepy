/* ── Realtime transport interface ──
 * Screens call send() and subscribe() only.
 * DB-READY: Replace the implementation file (transport-broadcast.ts) with
 * a WebSocket/SSE/Ably/Pusher client that implements this same interface.
 */

import type { RealtimeEvent } from "./types";

export type ConnectionStatus = "connected" | "disconnected";
export type EventHandler = (event: RealtimeEvent) => void;
export type Unsubscribe = () => void;
export type StatusHandler = (status: ConnectionStatus) => void;

export interface SwepyTransport {
  /** Send a typed event to all listeners. */
  send(event: RealtimeEvent): void;

  /** Subscribe to incoming events. Returns an unsubscribe function. */
  subscribe(handler: EventHandler): Unsubscribe;

  /** Register a connection status callback. */
  onStatus(handler: StatusHandler): Unsubscribe;

  /** Clean up resources. */
  destroy(): void;
}
