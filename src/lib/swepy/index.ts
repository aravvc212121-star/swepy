/* ── Swepy domain barrel export ── */

export { CONFIG } from "./config";
export { type BookingStatus, canTransition, transition, isActive, isTerminal } from "./status";
export type { Session, LatLng, OnlineHelper, Booking, Earning, RealtimeEvent } from "./types";
export { getSession, createSession, clearSession, getDemoHelperNames } from "./session";
export type { SwepyStore } from "./store";
export { createBrowserStore } from "./store-browser";
export type { SwepyTransport, ConnectionStatus, EventHandler, Unsubscribe } from "./transport";
export { createBroadcastTransport } from "./transport-broadcast";
export { haversine, pickHelpersInRadius, computeEta, generateOtp, formatDistance, formatEta } from "./matching";
export { SwepyProvider, useSwepy } from "./provider";
