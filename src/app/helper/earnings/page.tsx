"use client";

import { useState, useEffect } from "react";
import { useSwepy } from "@/lib/swepy/provider";
import { getSession } from "@/lib/swepy/session";
import type { Earning } from "@/lib/swepy";
import HelperBottomNav from "@/components/helper-bottom-nav";

function formatINR(n: number) { return "₹" + n.toLocaleString("en-IN"); }

export default function EarningsPage() {
  const { store } = useSwepy();
  const session = getSession();
  const [earnings, setEarnings] = useState<Earning[]>([]);

  useEffect(() => {
    if (!session) return;
    setEarnings(store.listEarningsForHelper(session.user_id));
  }, [session, store]);

  // Compute today and this week
  const today = new Date().toDateString();
  const weekAgo = Date.now() - 7 * 86400000;
  const todayEarnings = earnings.filter(e => new Date(e.completed_at).toDateString() === today);
  const weekEarnings = earnings.filter(e => new Date(e.completed_at).getTime() > weekAgo);

  const todayTotal = todayEarnings.reduce((s, e) => s + e.amount, 0);
  const weekTotal = weekEarnings.reduce((s, e) => s + e.amount, 0);
  const weekTips = weekEarnings.reduce((s, e) => s + e.tip, 0);

  if (!session || session.role !== "helper") {
    return (
      <div className="w-full max-w-[430px] mx-auto min-h-dvh flex items-center justify-center bg-app-bg px-4">
        <p className="text-[14px] text-ink-muted text-center">
          Go to <a href="/demo" className="underline" style={{ color: "var(--brand-rose)" }}>/demo</a> and pick "Helper".
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-[430px] mx-auto min-h-dvh bg-app-bg" style={{ paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}>
        {/* Header */}
        <div className="px-4" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 20px)" }}>
          <p className="text-[13px] text-ink-muted mb-1">This week</p>
          <p className="text-[28px] font-medium text-ink">{formatINR(weekTotal)}</p>
          <p className="text-[13px] text-ink-muted mb-5">
            {weekEarnings.length} job{weekEarnings.length !== 1 ? "s" : ""}{weekTips > 0 ? ` · ${formatINR(weekTips)} in tips` : ""}
          </p>
        </div>

        <div className="px-4">
          {/* Today card */}
          <div className="rounded-[14px] p-4 mb-4 flex items-center justify-between"
            style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}>
            <div>
              <p className="text-[14px] font-medium text-ink">Today</p>
              <p className="text-[12px] text-ink-muted">{todayEarnings.length} job{todayEarnings.length !== 1 ? "s" : ""}</p>
            </div>
            <p className="text-[18px] font-medium text-ink">{formatINR(todayTotal)}</p>
          </div>

          {/* Completed jobs */}
          <p className="text-[14px] font-medium text-ink mb-3">Completed jobs</p>
          {earnings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[14px] text-ink-muted">No completed jobs yet. Accept and finish a job to see earnings here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {earnings.map(e => (
                <div key={e.id} className="rounded-[14px] p-4"
                  style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[14px] font-medium text-ink">{e.service_name} · {e.home_size}</p>
                    <p className="text-[14px] font-medium" style={{ color: "var(--sage-text)" }}>{formatINR(e.amount)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] text-ink-muted">
                      {new Date(e.completed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      {e.tip > 0 ? ` · Tip ${formatINR(e.tip)}` : ""}
                    </p>
                    {e.rating && (
                      <span className="text-[12px] font-medium" style={{ color: "var(--amber)" }}>
                        {"★".repeat(e.rating)}{"☆".repeat(5 - e.rating)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <HelperBottomNav />
    </>
  );
}
