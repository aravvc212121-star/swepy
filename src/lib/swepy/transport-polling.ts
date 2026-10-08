import type { SwepyTransport } from "./transport";
import type { RealtimeEvent } from "./types";

export function createPollingTransport(): SwepyTransport {
  const listeners = new Set<(e: RealtimeEvent) => void>();
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let lastSync: number | null = null;

  function startPolling() {
    if (intervalId) return;
    intervalId = setInterval(async () => {
      try {
        const url = lastSync ? `/api/messages?since=${lastSync}` : `/api/messages`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (data.events && data.events.length > 0) {
          data.events.forEach((ev: RealtimeEvent) => {
            listeners.forEach(l => l(ev));
          });
        }
        if (data.nextSince) {
          lastSync = Number(data.nextSince);
        } else if (data.events && data.events.length > 0) {
          lastSync = Date.now(); // fallback
        }
      } catch (err) {
        // ignore network errors in polling
      }
    }, 2500); // Check every 2.5 seconds
  }

  function stopPolling() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  // Start polling immediately when transport is created
  startPolling();

  return {
    send(event) {
      // Optimistically dispatch locally so the sender sees it immediately
      listeners.forEach(l => l(event));
      
      // Send to server so other devices see it
      fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      }).catch(console.error);
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },

    onStatus(fn) {
      // Simulate always connected
      fn("connected");
      return () => {};
    },

    destroy() {
      stopPolling();
      listeners.clear();
    },
  };
}
