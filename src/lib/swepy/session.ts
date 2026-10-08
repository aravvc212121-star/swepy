/* ── Demo session ──
 * AUTH-READY: replace with real authentication (e.g. NextAuth, Clerk, or a custom JWT flow).
 * getSession() is the only function screens call.
 */

import type { Session } from "./types";

const STORAGE_KEY = "swepy_session";

const DEMO_HELPERS = [
  "Sunita Sharma",
  "Ravi Kumar",
  "Priya Patel",
  "Amit Verma",
  "Deepa Nair",
];

function generateId(): string {
  return "u_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function generatePhone(): string {
  return "+91 98" + Math.floor(10000000 + Math.random() * 90000000);
}

/** Load session from storage, or null. */
export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Session;
  } catch { /* ignore */ }
  return null;
}

/** Create and persist a new demo session. */
export function createSession(role: "user" | "helper", name?: string): Session {
  const session: Session = {
    user_id: generateId(),
    role,
    name: name || (role === "helper" ? DEMO_HELPERS[Math.floor(Math.random() * DEMO_HELPERS.length)] : "Demo User"),
    phone: generatePhone(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

/** Clear the demo session. */
export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Get list of demo helper names (for seed / picker UI). */
export function getDemoHelperNames(): string[] {
  return [...DEMO_HELPERS];
}
