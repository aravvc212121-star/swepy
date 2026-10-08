"use client";

import { useHelper } from "@/lib/helper-store";
import HelperBottomNav from "@/components/helper-bottom-nav";

export default function RatingsPage() {
  const { ratings } = useHelper();
  const maxDist = Math.max(...ratings.distribution, 1);

  return (
    <>
      <div className="w-full max-w-[430px] mx-auto min-h-dvh bg-app-bg" style={{ paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}>
        {/* Header */}
        <div className="home-wash px-4 text-center" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 24px)", paddingBottom: 48 }}>
          <p className="text-[36px] font-medium text-white">{ratings.average.toFixed(1)}</p>
          <div className="flex items-center justify-center gap-1 mb-1">
            {[1, 2, 3, 4, 5].map(s => (
              <svg key={s} width="20" height="20" viewBox="0 0 24 24" fill={s <= Math.round(ratings.average) ? "#fff" : "none"} stroke="#fff" strokeWidth="1.5">
                <path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z" />
              </svg>
            ))}
          </div>
          <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>{ratings.total_count} ratings</p>
        </div>

        <div className="px-4 -mt-6">
          {/* Distribution */}
          <div className="rounded-[14px] p-4 mb-4" style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}>
            {[5, 4, 3, 2, 1].map(star => (
              <div key={star} className="flex items-center gap-2 mb-1.5">
                <span className="text-[12px] text-ink-muted w-3 text-right">{star}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--step-inactive)" }}>
                  <div className="h-full rounded-full" style={{
                    backgroundColor: "var(--teal)",
                    width: `${(ratings.distribution[star - 1] / maxDist) * 100}%`,
                  }} />
                </div>
                <span className="text-[12px] text-ink-muted w-5">{ratings.distribution[star - 1]}</span>
              </div>
            ))}
          </div>

          {/* Stat cards */}
          <div className="flex gap-2 mb-4">
            {[
              { label: "On time", value: `${ratings.on_time_pct}%` },
              { label: "Accepted", value: `${ratings.acceptance_pct}%` },
              { label: "Completed", value: `${ratings.completion_pct}%` },
            ].map(s => (
              <div key={s.label} className="flex-1 rounded-[14px] py-3 text-center"
                style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}>
                <p className="text-[18px] font-medium text-ink">{s.value}</p>
                <p className="text-[11px] text-ink-muted">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Recent feedback */}
          <p className="text-[14px] font-medium text-ink mb-3">Recent feedback</p>
          <div className="flex flex-col gap-3">
            {ratings.recent_feedback.map((f, i) => (
              <div key={i} className="rounded-[14px] p-4" style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[14px] font-medium text-ink">{f.customer_first_name}</p>
                  <span className="text-[12px] font-medium" style={{ color: "var(--amber)" }}>
                    {"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}
                  </span>
                </div>
                {f.comment && <p className="text-[13px] text-ink-muted">{f.comment}</p>}
                <p className="text-[11px] text-ink-muted mt-1">{f.date}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <HelperBottomNav />
    </>
  );
}
