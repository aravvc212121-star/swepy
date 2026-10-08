/* ── Swepy demo configuration ── */

export const CONFIG = {
  /** Radius steps in meters for helper search */
  RADIUS_STEPS_M: [1000, 2000],
  /** Seconds to wait at each radius before widening */
  STEP_TIMEOUT_S: 30,
  /** Drop a helper if no ping for this many seconds */
  HELPER_STALE_S: 20,
  /** Seconds between location pings */
  LOCATION_PING_S: 3,
  /** Road-distance multiplier over straight-line distance */
  ETA_ROAD_FACTOR: 1.3,
  /** Assumed helper travel speed in km/h */
  ETA_SPEED_KMH: 10,
  /** Length of start/end OTP */
  OTP_LENGTH: 4,
} as const;
