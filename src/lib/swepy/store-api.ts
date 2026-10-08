import type { SwepyStore } from "./store";
import type { Booking, Earning } from "./types";
import { isActive } from "./status";

export function createApiStore(): SwepyStore {
  return {
    createBooking(b) {
      // Optimistic return
      const booking = { ...b, updated_at: new Date().toISOString() } as Booking;
      fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(b)
      }).catch(console.error);
      return booking;
    },

    getBooking(id) {
      // Since this is synchronous in the interface, we can't easily fetch here.
      // The UI component needs to use useEffect to fetch.
      // This is a known limitation of the synchronous store interface.
      // We will rely on real-time events to update state, and return a mock for now.
      return null;
    },

    updateBooking(id, patch) {
      fetch(`/api/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      }).catch(console.error);
      return null;
    },

    listBookingsForUser(userId) {
      return [];
    },

    listBookingsForHelper(helperId) {
      return [];
    },

    getActiveBookingForUser(userId) {
      return null;
    },

    getActiveBookingForHelper(helperId) {
      return null;
    },

    appendEarning(e) {
      return e;
    },

    listEarningsForHelper(helperId) {
      return [];
    },
  };
}
