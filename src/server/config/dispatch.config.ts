/**
 * Dispatch & Order Configuration Constants
 * All dispatch-related constants are defined here (none hardcoded in logic).
 */

export const DISPATCH_CONFIG = {
  /** Radius steps in kilometers for wave expansion */
  RADIUS_STEPS_KM: [2.0, 2.5, 3.5, 5.0] as const,

  /** Number of helpers to offer to simultaneously in each wave */
  OFFERS_PER_WAVE: 3,

  /** Time-To-Live in seconds for each helper offer */
  OFFER_TTL_SECONDS: 20,

  /** Hard cap: never offer to a helper whose ETA exceeds this (in minutes) */
  MAX_ETA_MINUTES: 25,

  /** Preferred ETA target (in minutes) */
  PREFERRED_ETA_MINUTES: 10,

  /** Maximum search duration in seconds before NO_HELPER_FOUND */
  MAX_SEARCH_SECONDS: 120,

  /** Helper location updates older than this (in seconds) are considered stale */
  HELPER_LOCATION_STALE_SECONDS: 30,

  /** Average travel speed in km/h for urban helpers */
  SPEED_KMPH: 18,

  /** Road detour factor over straight-line Haversine distance */
  ROAD_DETOUR_FACTOR: 1.35,

  /** Maximum allowed wrong OTP attempts before lockout */
  OTP_MAX_ATTEMPTS: 5,

  /** Lockout duration in milliseconds after 5 wrong OTP attempts (5 minutes) */
  OTP_LOCKOUT_MS: 5 * 60 * 1000,

  /** Distance threshold in meters to trigger the ARRIVED sub-state */
  ARRIVED_THRESHOLD_METERS: 50,
} as const;

export const ORDER_STATES = {
  SEARCHING: 'SEARCHING',
  ACCEPTED: 'ACCEPTED',
  CONFIRMED: 'CONFIRMED',
  NO_HELPER_FOUND: 'NO_HELPER_FOUND',
  CANCELLED: 'CANCELLED',
  // Backward compatibility / existing post-confirmed workflow
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

export type OrderState = (typeof ORDER_STATES)[keyof typeof ORDER_STATES] | 'searching' | 'accepted' | 'confirmed' | 'no_helper_found' | 'cancelled';

export const DERIVED_SUB_STATES = {
  EN_ROUTE: 'EN_ROUTE',
  ARRIVED: 'ARRIVED',
} as const;

export type DerivedSubState = (typeof DERIVED_SUB_STATES)[keyof typeof DERIVED_SUB_STATES];

export const OFFER_STATUSES = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;

export type OfferStatus = (typeof OFFER_STATUSES)[keyof typeof OFFER_STATUSES] | 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
