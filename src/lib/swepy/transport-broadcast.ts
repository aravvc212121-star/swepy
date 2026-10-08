/* ── BroadcastChannel transport ──
 * Same-browser only. Swap this one file for a hosted realtime channel
 * (WebSocket, Socket.IO, Ably, Pusher) to work across real phones.
 * This uses the browser's BroadcastChannel API so two tabs on one laptop
 * can act as user and helper.
 */

import type { SwepyTransport, EventHandler, Unsubscribe, StatusHandler, ConnectionStatus } from "./transport";
import type { RealtimeEvent } from "./types";

const CHANNEL_NAME = "swepy_realtime";

export function createBroadcastTransport(): SwepyTransport {
  const channel = new BroadcastChannel(CHANNEL_NAME);
  const handlers = new Set<EventHandler>();
  const statusHandlers = new Set<StatusHandler>();
  let status: ConnectionStatus = "connected";

  const onMessage = (e: MessageEvent) => {
    try {
      const event = e.data as RealtimeEvent;
      if (event && typeof event.type === "string") {
        handlers.forEach(h => h(event));
      }
    } catch { /* ignore malformed */ }
  };

  channel.addEventListener("message", onMessage);

  // Notify status handlers on connect
  setTimeout(() => {
    statusHandlers.forEach(h => h("connected"));
  }, 0);

  return {
    send(event: RealtimeEvent): void {
      try {
        channel.postMessage(event);
        // Also deliver to local handlers (BroadcastChannel doesn't echo to same tab)
        handlers.forEach(h => h(event));
      } catch {
        status = "disconnected";
        statusHandlers.forEach(h => h("disconnected"));
      }
    },

    subscribe(handler: EventHandler): Unsubscribe {
      handlers.add(handler);
      return () => { handlers.delete(handler); };
    },

    onStatus(handler: StatusHandler): Unsubscribe {
      statusHandlers.add(handler);
      handler(status);
      return () => { statusHandlers.delete(handler); };
    },

    destroy(): void {
      channel.removeEventListener("message", onMessage);
      channel.close();
      handlers.clear();
      statusHandlers.clear();
    },
  };
}
