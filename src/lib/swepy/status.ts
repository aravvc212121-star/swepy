/* ── Booking status state machine ── */

export type BookingStatus =
  | "searching"
  | "accepted"
  | "on_the_way"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "expired";

/** Allowed transitions: from -> set of valid next statuses */
const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  searching:   ["accepted", "cancelled", "expired"],
  accepted:    ["on_the_way", "cancelled", "searching"],  // searching = helper released
  on_the_way:  ["arrived", "cancelled"],
  arrived:     ["in_progress"],
  in_progress: ["completed"],
  completed:   [],
  cancelled:   [],
  expired:     ["searching"],  // retry
};

/** Returns true if transitioning from `current` to `next` is allowed. */
export function canTransition(current: BookingStatus, next: BookingStatus): boolean {
  return TRANSITIONS[current]?.includes(next) ?? false;
}

/** Throws if the transition is invalid, otherwise returns the new status. */
export function transition(current: BookingStatus, next: BookingStatus): BookingStatus {
  if (!canTransition(current, next)) {
    throw new Error(`Invalid status transition: ${current} -> ${next}`);
  }
  return next;
}

/** Statuses considered "active" (booking is in progress). */
export function isActive(s: BookingStatus): boolean {
  return s === "searching" || s === "accepted" || s === "on_the_way" || s === "arrived" || s === "in_progress";
}

/** Statuses considered terminal. */
export function isTerminal(s: BookingStatus): boolean {
  return s === "completed" || s === "cancelled" || s === "expired";
}
