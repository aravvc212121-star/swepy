"use client";

/* ── SwepyProvider: gives all screens access to the store and transport ── */

import { createContext, useContext, useRef, useEffect, useState, type ReactNode } from "react";
import type { SwepyStore } from "./store";
import type { SwepyTransport } from "./transport";
import { createBrowserStore } from "./store-browser";
import { createPollingTransport } from "./transport-polling";
import type { Booking, Earning } from "./types";

interface SwepyCtx {
  store: SwepyStore;
  transport: SwepyTransport;
  ready: boolean;
}

/* No-op store for SSR/prerender — never stores anything */
const NOOP_STORE: SwepyStore = {
  createBooking(b) { return { ...b, updated_at: "" } as Booking; },
  getBooking() { return null; },
  updateBooking() { return null; },
  listBookingsForUser() { return []; },
  listBookingsForHelper() { return []; },
  getActiveBookingForUser() { return null; },
  getActiveBookingForHelper() { return null; },
  appendEarning(e) { return e; },
  listEarningsForHelper() { return []; },
};

/* No-op transport for SSR/prerender */
const NOOP_TRANSPORT: SwepyTransport = {
  send() {},
  subscribe() { return () => {}; },
  onStatus() { return () => {}; },
  destroy() {},
};

const Ctx = createContext<SwepyCtx>({
  store: NOOP_STORE,
  transport: NOOP_TRANSPORT,
  ready: false,
});

export function SwepyProvider({ children }: { children: ReactNode }) {
  const ref = useRef<{ store: SwepyStore; transport: SwepyTransport } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ref.current) {
      ref.current = {
        store: createBrowserStore(),
        transport: createPollingTransport(),
      };
    }
    setReady(true);
    return () => {
      ref.current?.transport.destroy();
    };
  }, []);

  const value: SwepyCtx = {
    store: ref.current?.store ?? NOOP_STORE,
    transport: ref.current?.transport ?? NOOP_TRANSPORT,
    ready,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSwepy(): SwepyCtx {
  return useContext(Ctx);
}
