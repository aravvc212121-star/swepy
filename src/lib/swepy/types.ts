/* ── Shared domain types ── */

import type { BookingStatus } from "./status";

/* ── Coordinates ── */
export interface LatLng {
  lat: number;
  lng: number;
}

/* ── Session ── */
export interface Session {
  user_id: string;
  role: "user" | "helper";
  name: string;
  phone: string;
}

/* ── Helper profile (online tracker) ── */
export interface OnlineHelper {
  helper_id: string;
  name: string;
  lat: number;
  lng: number;
  last_ping: number;  // Date.now()
}

/* ── Booking ── */
export interface Booking {
  id: string;
  user_id: string;
  user_name: string;
  service_name: string;
  home_size: string;
  address_short: string;  // rough area label, not exact address
  address_full: string;   // exact, revealed only after accept
  lat: number;
  lng: number;
  price: number;
  otp: string;
  status: BookingStatus;
  helper_id: string | null;
  helper_name: string | null;
  helper_lat: number | null;
  helper_lng: number | null;
  radius_step: number;      // index into CONFIG.RADIUS_STEPS_M
  rating: number | null;
  created_at: string;
  updated_at: string;
}

/* ── Earning record ── */
export interface Earning {
  id: string;
  booking_id: string;
  helper_id: string;
  service_name: string;
  home_size: string;
  amount: number;
  tip: number;
  rating: number | null;
  completed_at: string;
  created_at: string;
}

/* ── Realtime events ── */
export type RealtimeEvent =
  | { type: "helper_online";    helper_id: string; name: string; lat: number; lng: number; ts: number; sender: string }
  | { type: "helper_location";  helper_id: string; lat: number; lng: number; ts: number; sender: string }
  | { type: "helper_offline";   helper_id: string; ts: number; sender: string }
  | { type: "booking_new";      booking_id: string; service_name: string; home_size: string; price: number; distance_km: number; area_label: string; user_lat: number; user_lng: number; ts: number; sender: string }
  | { type: "booking_expand";   booking_id: string; radius_m: number; ts: number; sender: string }
  | { type: "booking_accept";   booking_id: string; helper_id: string; helper_name: string; lat: number; lng: number; ts: number; sender: string }
  | { type: "booking_assigned"; booking_id: string; helper_id: string; helper_name: string; ts: number; sender: string }
  | { type: "booking_release";  booking_id: string; helper_id: string; ts: number; sender: string }
  | { type: "booking_cancel";   booking_id: string; ts: number; sender: string }
  | { type: "job_location";     booking_id: string; helper_id: string; lat: number; lng: number; ts: number; sender: string }
  | { type: "job_status";       booking_id: string; status: BookingStatus; ts: number; sender: string };
