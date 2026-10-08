/* ── Data store interface ──
 * DB-READY: Every method has a comment describing the future database query.
 * Screens import from this file only; never touch storage directly.
 */

import type { Booking, Earning } from "./types";
import type { BookingStatus } from "./status";

export interface SwepyStore {
  /* ── Bookings ── */

  /** DB-READY: INSERT INTO bookings (...) RETURNING * */
  createBooking(b: Omit<Booking, "updated_at">): Booking;

  /** DB-READY: SELECT * FROM bookings WHERE id = $1 */
  getBooking(id: string): Booking | null;

  /** DB-READY: UPDATE bookings SET ... WHERE id = $1 RETURNING * */
  updateBooking(id: string, patch: Partial<Booking>): Booking | null;

  /** DB-READY: SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC */
  listBookingsForUser(userId: string): Booking[];

  /** DB-READY: SELECT * FROM bookings WHERE helper_id = $1 ORDER BY created_at DESC */
  listBookingsForHelper(helperId: string): Booking[];

  /** DB-READY: SELECT * FROM bookings WHERE user_id = $1 AND status NOT IN ('completed','cancelled','expired') LIMIT 1 */
  getActiveBookingForUser(userId: string): Booking | null;

  /** DB-READY: SELECT * FROM bookings WHERE helper_id = $1 AND status NOT IN ('completed','cancelled','expired') LIMIT 1 */
  getActiveBookingForHelper(helperId: string): Booking | null;

  /* ── Earnings ── */

  /** DB-READY: INSERT INTO earnings (...) RETURNING * */
  appendEarning(e: Earning): Earning;

  /** DB-READY: SELECT * FROM earnings WHERE helper_id = $1 ORDER BY completed_at DESC */
  listEarningsForHelper(helperId: string): Earning[];
}
