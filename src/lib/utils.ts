/**
 * Format a number as Indian Rupees with ₹ symbol and Indian digit grouping.
 * e.g. 12345 → "₹12,345" and 1234567 → "₹12,34,567"
 */
export function formatINR(amount: number): string {
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return formatted;
}

/**
 * Format a date string to a human-readable format.
 * e.g. "2026-10-01T12:30:00+05:30" → "1 Oct 2026, 12:30 pm"
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format home size label.
 * e.g. "2bhk" → "2 BHK"
 */
export function formatHomeSize(size: string): string {
  return size.replace("bhk", " BHK").toUpperCase();
}

/**
 * Generate a CSS class name helper (simple cn utility).
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
