/* ── Browser localStorage implementation ──
 * This is the TEMPORARY implementation of SwepyStore.
 * DB-READY: Replace this entire file with a real database client
 * (e.g. Prisma, Drizzle, or direct SQL) that implements the same SwepyStore interface.
 */

import type { SwepyStore } from "./store";
import type { Booking, Earning } from "./types";
import { isActive } from "./status";

const BOOKINGS_KEY = "swepy_bookings";
const EARNINGS_KEY = "swepy_earnings";

function now(): string {
  return new Date().toISOString();
}

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeList<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

function purgeDemoBookings(): void {
  try {
    const raw = localStorage.getItem(BOOKINGS_KEY);
    if (!raw) return;
    const all = JSON.parse(raw);
    if (Array.isArray(all)) {
      const cleaned = all.filter(
        (b: Booking) => b.id !== "demo" && !b.id.startsWith("demo_") && b.user_id !== "customer_demo"
      );
      if (cleaned.length !== all.length) {
        localStorage.setItem(BOOKINGS_KEY, JSON.stringify(cleaned));
      }
    }
  } catch { /* ignore */ }
}

export function createBrowserStore(): SwepyStore {
  // Automatically purge any stale demo bookings on store initialization
  purgeDemoBookings();

  return {
    createBooking(b) {
      const booking: Booking = { ...b, updated_at: now() };
      const all = readList<Booking>(BOOKINGS_KEY);
      all.unshift(booking);
      writeList(BOOKINGS_KEY, all);
      return booking;
    },

    getBooking(id) {
      if (id === "demo" || id.startsWith("demo_")) return null;
      return readList<Booking>(BOOKINGS_KEY).find(b => b.id === id) ?? null;
    },

    updateBooking(id, patch) {
      const all = readList<Booking>(BOOKINGS_KEY);
      const idx = all.findIndex(b => b.id === id);
      if (idx === -1) return null;
      all[idx] = { ...all[idx], ...patch, updated_at: now() };
      writeList(BOOKINGS_KEY, all);
      return all[idx];
    },

    listBookingsForUser(userId) {
      const all = readList<Booking>(BOOKINGS_KEY).filter(
        b => b.id !== "demo" && !b.id.startsWith("demo_") && b.user_id !== "customer_demo"
      );
      if (!userId || userId === "all" || userId === "customer") return all;
      return all.filter(b => b.user_id === userId || !b.user_id || b.user_id === "customer");
    },

    getAllBookings() {
      return readList<Booking>(BOOKINGS_KEY).filter(
        b => b.id !== "demo" && !b.id.startsWith("demo_") && b.user_id !== "customer_demo"
      );
    },

    listBookingsForHelper(helperId) {
      return readList<Booking>(BOOKINGS_KEY).filter(
        b => b.helper_id === helperId && b.id !== "demo" && !b.id.startsWith("demo_")
      );
    },

    getActiveBookingForUser(userId) {
      return (
        readList<Booking>(BOOKINGS_KEY).find(
          b =>
            (b.user_id === userId || b.user_id === "customer") &&
            b.id !== "demo" &&
            !b.id.startsWith("demo_") &&
            b.user_id !== "customer_demo" &&
            isActive(b.status)
        ) ?? null
      );
    },

    getActiveBookingForHelper(helperId) {
      return (
        readList<Booking>(BOOKINGS_KEY).find(
          b =>
            b.helper_id === helperId &&
            b.id !== "demo" &&
            !b.id.startsWith("demo_") &&
            b.user_id !== "customer_demo" &&
            isActive(b.status)
        ) ?? null
      );
    },

    appendEarning(e) {
      const all = readList<Earning>(EARNINGS_KEY);
      all.unshift(e);
      writeList(EARNINGS_KEY, all);
      return e;
    },

    listEarningsForHelper(helperId) {
      return readList<Earning>(EARNINGS_KEY).filter(e => e.helper_id === helperId);
    },
  };
}
