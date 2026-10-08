"use client";

import { useState, useEffect } from "react";
import { useHelper } from "@/lib/helper-store";
import { useSwepy } from "@/lib/swepy/provider";
import { getSession } from "@/lib/swepy/session";
import type { Earning } from "@/lib/swepy";
import HelperBottomNav from "@/components/helper-bottom-nav";
import { IconChevronRight, IconCheck } from "@/components/icons";
import Link from "next/link";

function formatINR(n: number) { return "₹" + n.toLocaleString("en-IN"); }

function Badge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; border: string; label: string }> = {
    verified: { bg: "var(--sage-soft)", color: "var(--sage-text)", border: "var(--sage)", label: "Verified" },
    in_progress: { bg: "var(--teal-soft)", color: "var(--teal-dark)", border: "var(--teal)", label: "In progress" },
    waiting: { bg: "var(--amber-soft)", color: "var(--ink)", border: "var(--amber-border)", label: "Waiting" },
  };
  const s = map[status] || map.waiting;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-[8px] text-[11px] font-medium"
      style={{ backgroundColor: s.bg, color: s.color, border: `0.5px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

/* Wallet icon */
const IconWallet = ({ size = 24, style }: { size?: number; style?: React.CSSProperties }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
    <path d="M17 8v-3a1 1 0 0 0 -1 -1h-10a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3m0 4v3a1 1 0 0 1 -1 1h-12a2 2 0 0 1 -2 -2v-12" />
    <path d="M20 12v4h-4a2 2 0 0 1 0 -4h4" />
  </svg>
);

const MENU_ITEMS = [
  { label: "Payout account", href: "#" },
  { label: "Documents", href: "#" },
  { label: "Safety and SOS", href: "#" },
  { label: "Help and support", href: "/help" },
];

export default function HelperProfilePage() {
  const { profile } = useHelper();
  const { store } = useSwepy();
  const session = getSession();
  const approved = profile.kyc_status === "approved";

  // Earnings data
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [showAllEarnings, setShowAllEarnings] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!session) return;
    setEarnings(store.listEarningsForHelper(session.user_id));
  }, [session, store]);

  if (!mounted) return null;

  const today = new Date().toDateString();
  const weekAgo = Date.now() - 7 * 86400000;
  const todayEarnings = earnings.filter(e => new Date(e.completed_at).toDateString() === today);
  const weekEarnings = earnings.filter(e => new Date(e.completed_at).getTime() > weekAgo);
  const todayTotal = todayEarnings.reduce((s, e) => s + e.amount, 0);
  const weekTotal = weekEarnings.reduce((s, e) => s + e.amount, 0);
  const weekTips = weekEarnings.reduce((s, e) => s + e.tip, 0);

  const verificationItems = [
    { label: "PAN card", status: profile.id_type === "pan" && approved ? "verified" : profile.id_type === "pan" ? "in_progress" : "waiting" },
    { label: "Face check", status: profile.face_verified ? "verified" : "waiting" },
    { label: "Address", status: profile.current_address ? "verified" : "waiting" },
    { label: "Police verification", status: profile.police_verification ? (approved ? "verified" : "in_progress") : "waiting" },
    { label: "Payout account", status: profile.payout_account?.verified ? "verified" : profile.payout_account ? "in_progress" : "waiting" },
  ];

  const displayEarnings = showAllEarnings ? earnings : earnings.slice(0, 3);

  return (
    <>
      <div className="w-full max-w-[430px] mx-auto min-h-dvh bg-app-bg px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 20px)", paddingBottom: "calc(96px + env(safe-area-inset-bottom, 0px))" }}>

        {/* Header */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-[20px] font-medium text-white shrink-0"
            style={{ backgroundColor: "var(--brand-rose)" }}>
            {profile.avatar_initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[18px] font-medium text-ink truncate">{profile.full_name || "Helper"}</p>
              {approved && <Badge status="verified" />}
            </div>
            <p className="text-[13px] text-ink-muted">ID: {profile.id}</p>
          </div>
        </div>

        {/* ── Earnings section ── */}
        <p className="text-[14px] font-medium text-ink mb-2">Earnings</p>
        <div className="rounded-[14px] overflow-hidden mb-4" style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}>
          {/* Summary row */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[13px] text-ink-muted">This week</p>
                <p className="text-[22px] font-medium text-ink">{formatINR(weekTotal)}</p>
                <p className="text-[12px] text-ink-muted">
                  {weekEarnings.length} job{weekEarnings.length !== 1 ? "s" : ""}{weekTips > 0 ? ` · ${formatINR(weekTips)} tips` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[13px] text-ink-muted">Today</p>
                <p className="text-[18px] font-medium text-ink">{formatINR(todayTotal)}</p>
                <p className="text-[12px] text-ink-muted">{todayEarnings.length} job{todayEarnings.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
          </div>

          {/* Job list */}
          {earnings.length > 0 && (
            <>
              <div style={{ borderTop: "0.5px solid var(--surface-border)" }}>
                {displayEarnings.map((e, i) => (
                  <div key={e.id} className="flex items-center justify-between px-4 py-3"
                    style={i < displayEarnings.length - 1 ? { borderBottom: "0.5px solid var(--surface-border)" } : undefined}>
                    <div>
                      <p className="text-[13px] font-medium text-ink">{e.service_name} · {e.home_size}</p>
                      <p className="text-[11px] text-ink-muted">
                        {new Date(e.completed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        {e.tip > 0 ? ` · Tip ${formatINR(e.tip)}` : ""}
                        {e.rating ? ` · ${"★".repeat(e.rating)}` : ""}
                      </p>
                    </div>
                    <p className="text-[14px] font-medium" style={{ color: "var(--sage-text)" }}>{formatINR(e.amount)}</p>
                  </div>
                ))}
              </div>
              {earnings.length > 3 && (
                <button type="button" onClick={() => setShowAllEarnings(!showAllEarnings)}
                  className="w-full py-2.5 text-[13px] font-medium no-select"
                  style={{ color: "var(--brand-rose)", borderTop: "0.5px solid var(--surface-border)" }}>
                  {showAllEarnings ? "Show less" : `View all ${earnings.length} jobs`}
                </button>
              )}
            </>
          )}

          {earnings.length === 0 && (
            <div className="px-4 pb-4">
              <p className="text-[13px] text-ink-muted text-center">No completed jobs yet</p>
            </div>
          )}
        </div>

        {/* Verification card */}
        <p className="text-[14px] font-medium text-ink mb-2">Verification status</p>
        <div className="rounded-[14px] overflow-hidden mb-4" style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}>
          {verificationItems.map((item, i) => (
            <div key={item.label} className="flex items-center justify-between px-4 py-3"
              style={i < verificationItems.length - 1 ? { borderBottom: "0.5px solid var(--surface-border)" } : undefined}>
              <span className="text-[14px] text-ink">{item.label}</span>
              <Badge status={item.status} />
            </div>
          ))}
        </div>

        {/* Language card */}
        <p className="text-[14px] font-medium text-ink mb-2">Language</p>
        <div className="rounded-[14px] p-4 mb-4 flex items-center justify-between"
          style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}>
          <span className="text-[14px] text-ink">
            {profile.languages.length > 0
              ? profile.languages.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(", ")
              : "Not set"}
          </span>
          <IconChevronRight size={16} className="text-ink-muted" />
        </div>

        {/* Menu list */}
        <div className="rounded-[14px] overflow-hidden mb-4" style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}>
          {MENU_ITEMS.map((item, i) => (
            <Link key={item.label} href={item.href}
              className="flex items-center justify-between px-4 py-3.5 no-underline min-h-[48px]"
              style={i < MENU_ITEMS.length - 1 ? { borderBottom: "0.5px solid var(--surface-border)" } : undefined}>
              <span className="text-[14px] text-ink">{item.label}</span>
              <IconChevronRight size={16} className="text-ink-muted" />
            </Link>
          ))}
        </div>

        {/* Log out */}
        <button type="button" data-pressable=""
          className="w-full h-12 rounded-[12px] text-[15px] font-medium no-select mb-4"
          style={{ border: "1px solid var(--surface-border)", color: "#B3261E" }}>
          Log out
        </button>

        {/* Version info */}
        <div className="mb-4 text-center">
          <p className="text-[12px] text-ink-muted">
            Version {process.env.NEXT_PUBLIC_APP_VERSION || "v1.0.0"}
          </p>
        </div>
      </div>
      <HelperBottomNav />
    </>
  );
}
