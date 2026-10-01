"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IconX, IconCalendar } from "@/components/icons";
import Link from "next/link";

export default function SearchingPage() {
  const router = useRouter();
  const [radius, setRadius] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  // Simulate widening search radius
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= 15) {
          setTimedOut(true);
          clearInterval(interval);
        }
        return next;
      });
      setRadius((prev) => Math.min(5, prev + 0.5));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-navigate to booked page after 6s (simulating helper found)
  useEffect(() => {
    if (timedOut) return;
    const timeout = setTimeout(() => {
      router.push("/booking/bk_20261001_001");
    }, 6000);
    return () => clearTimeout(timeout);
  }, [router, timedOut]);

  return (
    <div className="mobile-frame bg-app-bg min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-4 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between py-3">
          <div />
          <Link
            href="/"
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{ border: "0.5px solid var(--surface-border)" }}
          >
            <IconX size={18} className="text-ink-muted" />
          </Link>
        </div>
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {!timedOut ? (
          <>
            {/* Pulsing circles */}
            <div className="relative w-40 h-40 mb-8">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: "2px solid var(--teal)",
                    opacity: 0.15 - i * 0.04,
                    animation: `pulse-ring 2s ease-out ${i * 0.6}s infinite`,
                  }}
                />
              ))}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "var(--teal-soft)" }}
                >
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: "var(--teal)" }}
                  />
                </div>
              </div>
            </div>

            <h2 className="text-[18px] font-medium text-ink text-center mb-2">
              Finding your helper
            </h2>
            <p className="text-[13px] text-ink-muted text-center">
              Searching within {radius.toFixed(1)} km
            </p>
          </>
        ) : (
          <>
            {/* Timeout fallback */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: "var(--amber-soft)", border: "0.5px solid var(--amber-border)" }}
            >
              <IconCalendar size={28} className="text-amber" />
            </div>

            <h2 className="text-[18px] font-medium text-ink text-center mb-2">
              No helpers nearby right now
            </h2>
            <p className="text-[13px] text-ink-muted text-center mb-6">
              All helpers are currently busy. You can schedule for later or try again in a few minutes.
            </p>

            <div className="w-full space-y-3">
              <Link
                href="/checkout"
                className="w-full flex items-center justify-center py-3.5 rounded-[12px] text-[14px] font-medium text-white"
                style={{ backgroundColor: "var(--brand-rose)" }}
              >
                Schedule for later
              </Link>
              <Link
                href="/"
                className="w-full flex items-center justify-center py-3.5 rounded-[12px] text-[14px] font-medium text-ink"
                style={{ border: "0.5px solid var(--surface-border)" }}
              >
                Cancel
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Pulse animation keyframes */}
      <style jsx>{`
        @keyframes pulse-ring {
          0% {
            transform: scale(0.5);
            opacity: 0.3;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
