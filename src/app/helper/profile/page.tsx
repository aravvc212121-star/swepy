"use client";

import { useState, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHelper } from "@/lib/helper-store";
import { useSwepy } from "@/lib/swepy/provider";
import { getSession, ensureSession, clearSession } from "@/lib/swepy/session";
import type { Session } from "@/lib/swepy/types";
import { useI18n } from "@/lib/i18n";
import HelperBottomNav from "@/components/helper-bottom-nav";
import {
  IconChevronRight,
  IconCheck,
  IconClock,
  IconIdCard,
  IconUser,
  IconMapPin,
  IconShieldCheck,
  IconWallet,
  IconLanguage,
  IconClipboardList,
  IconUrgent,
  IconHelpCircle,
  IconLogout,
  type IconProps,
} from "@/components/icons";
import { HELPER_TOKENS } from "@/lib/helper-theme";

const DEFAULT_HELPER_SESSION: Session = {
  user_id: "hlp_demo",
  name: "Deepa Nair",
  role: "helper",
  phone: "+91 9876543210",
};

let cachedProfileSession: Session | null = null;
function getProfileSessionSnapshot(): Session {
  if (!cachedProfileSession) {
    cachedProfileSession = getSession() ?? ensureSession("helper");
  }
  return cachedProfileSession;
}

function getServerProfileSessionSnapshot(): Session {
  return DEFAULT_HELPER_SESSION;
}

function subscribeProfileSession(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export default function HelperProfilePage() {
  const router = useRouter();
  const { profile } = useHelper();
  const { store } = useSwepy();
  const { t, formatCurrency, locale, setLocale } = useI18n();

  const session = useSyncExternalStore(subscribeProfileSession, getProfileSessionSnapshot, getServerProfileSessionSnapshot);
  const earnings = useMemo(() => store.listEarningsForHelper(session.user_id), [store, session.user_id]);

  const [showAllEarnings, setShowAllEarnings] = useState(false);

  // Single signed-in helper identity
  const helperName = session?.name || profile.full_name || "Deepa Nair";
  const avatarInitial = helperName.charAt(0).toUpperCase();
  const helperId = profile.id || "hlp_demo";

  // Verification items calculation
  const approved = profile.kyc_status === "approved";
  const verificationItems: {
    label: string;
    key: string;
    status: "verified" | "waiting" | "needs_action";
    icon: React.ComponentType<IconProps>;
  }[] = [
    {
      label: t("helper.panCard"),
      key: "pan",
      status: profile.id_type === "pan" && approved ? "verified" : "waiting",
      icon: IconIdCard,
    },
    {
      label: t("helper.faceCheck"),
      key: "face",
      status: profile.face_verified ? "verified" : "waiting",
      icon: IconUser,
    },
    {
      label: t("helper.address"),
      key: "address",
      status: profile.current_address ? "verified" : "waiting",
      icon: IconMapPin,
    },
    {
      label: t("helper.policeVerification"),
      key: "police",
      status: profile.police_verification ? (approved ? "verified" : "waiting") : "waiting",
      icon: IconShieldCheck,
    },
    {
      label: t("helper.payoutAccount"),
      key: "payout",
      status: profile.payout_account?.verified ? "verified" : "waiting",
      icon: IconWallet,
    },
  ];

  // All verified check: NEVER show "Verified" while any check is waiting
  const allVerified = verificationItems.every(item => item.status === "verified");

  const [currentTime] = useState(() => Date.now());

  const todayStr = useMemo(() => new Date(currentTime).toDateString(), [currentTime]);
  const weekAgo = useMemo(() => currentTime - 7 * 86400000, [currentTime]);
  const todayEarnings = useMemo(() => earnings.filter(e => new Date(e.completed_at).toDateString() === todayStr), [earnings, todayStr]);
  const weekEarnings = useMemo(() => earnings.filter(e => new Date(e.completed_at).getTime() > weekAgo), [earnings, weekAgo]);
  const todayTotal = useMemo(() => todayEarnings.reduce((s, e) => s + e.amount, 0), [todayEarnings]);
  const weekTotal = useMemo(() => weekEarnings.reduce((s, e) => s + e.amount, 0), [weekEarnings]);

  const displayEarnings = showAllEarnings ? earnings : earnings.slice(0, 3);

  const handleLogout = () => {
    clearSession();
    try {
      localStorage.removeItem("swepy_helper_online");
    } catch { /* ignore */ }
    router.push("/login");
  };

  const toggleLanguage = () => {
    setLocale(locale === "en" ? "hi" : "en");
  };

  return (
    <>
      <main
        className="w-full max-w-[430px] mx-auto min-h-dvh flex flex-col"
        style={{
          backgroundColor: HELPER_TOKENS.colors.pageBg,
          paddingLeft: HELPER_TOKENS.layout.pagePadding,
          paddingRight: HELPER_TOKENS.layout.pagePadding,
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 20px)",
          paddingBottom: HELPER_TOKENS.layout.scrollPaddingBottom,
        }}
      >
        {/* 1. HEADER */}
        <header className="flex items-center gap-3.5 mb-5">
          {/* 56px avatar: blush, brand initial */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 select-none shadow-xs"
            style={{
              backgroundColor: HELPER_TOKENS.colors.blush,
              color: HELPER_TOKENS.colors.brand,
              fontSize: "18px",
              fontWeight: 500,
            }}
            aria-hidden="true"
          >
            {avatarInitial}
          </div>

          <div className="flex-1 min-w-0">
            <h1
              className="text-[18px] truncate leading-tight"
              style={{
                fontWeight: 500,
                color: HELPER_TOKENS.colors.ink,
              }}
            >
              {helperName}
            </h1>
            <p
              className="text-[12px] leading-tight mt-0.5 mb-1.5"
              style={{
                fontWeight: 400,
                color: HELPER_TOKENS.colors.secondary,
              }}
            >
              ID {helperId}
            </p>

            {/* Verification Status Chip: Verified (sage) OR Verification pending (saffron with clock) */}
            {allVerified ? (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] select-none"
                style={{
                  backgroundColor: HELPER_TOKENS.colors.status.onlineTint,
                  color: HELPER_TOKENS.colors.status.onlineText,
                  borderRadius: HELPER_TOKENS.radius.pill,
                  fontWeight: 500,
                }}
              >
                <IconCheck size={14} strokeWidth={2} style={{ color: HELPER_TOKENS.colors.status.onlineIcon }} />
                <span>{t("helper.verified")}</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] select-none"
                style={{
                  backgroundColor: HELPER_TOKENS.colors.status.pendingTint,
                  color: HELPER_TOKENS.colors.status.pendingText,
                  borderRadius: HELPER_TOKENS.radius.pill,
                  fontWeight: 500,
                }}
              >
                <IconClock size={14} strokeWidth={1.5} style={{ color: HELPER_TOKENS.colors.status.pendingText }} />
                <span>{t("helper.verificationPending")}</span>
              </span>
            )}
          </div>
        </header>

        {/* 2. EARNINGS SECTION */}
        <section className="mb-4">
          <h2
            className="text-[12px] uppercase tracking-wider mb-2"
            style={{
              color: HELPER_TOKENS.colors.secondary,
              fontWeight: 500,
            }}
          >
            {t("helper.earnings")}
          </h2>

          <div
            style={{
              backgroundColor: HELPER_TOKENS.colors.cardBg,
              borderRadius: HELPER_TOKENS.radius.card,
              border: `1px solid ${HELPER_TOKENS.colors.hairline}`,
              overflow: "hidden",
            }}
          >
            {/* Two equal columns separated by a hairline */}
            <div className="grid grid-cols-2 divide-x" style={{ borderColor: HELPER_TOKENS.colors.innerHairline }}>
              {/* This week */}
              <div className="p-4 flex flex-col justify-between">
                <span
                  className="text-[12px] mb-1"
                  style={{ color: HELPER_TOKENS.colors.secondary, fontWeight: 400 }}
                >
                  {t("helper.thisWeek")}
                </span>
                <span
                  className="text-[26px] leading-tight tabular-nums mb-1"
                  style={{ color: HELPER_TOKENS.colors.ink, fontWeight: 500 }}
                >
                  {formatCurrency(weekTotal)}
                </span>
                <span
                  className="text-[12px] tabular-nums"
                  style={{ color: HELPER_TOKENS.colors.secondary, fontWeight: 400 }}
                >
                  {t("helper.nJobs", { count: weekEarnings.length })}
                </span>
              </div>

              {/* Today */}
              <div className="p-4 flex flex-col justify-between">
                <span
                  className="text-[12px] mb-1"
                  style={{ color: HELPER_TOKENS.colors.secondary, fontWeight: 400 }}
                >
                  {t("helper.today")}
                </span>
                <span
                  className="text-[26px] leading-tight tabular-nums mb-1"
                  style={{ color: HELPER_TOKENS.colors.ink, fontWeight: 500 }}
                >
                  {formatCurrency(todayTotal)}
                </span>
                <span
                  className="text-[12px] tabular-nums"
                  style={{ color: HELPER_TOKENS.colors.secondary, fontWeight: 400 }}
                >
                  {t("helper.nJobs", { count: todayEarnings.length })}
                </span>
              </div>
            </div>

            {/* Below: centered 'No completed jobs yet' if empty */}
            {earnings.length === 0 ? (
              <div
                className="py-3 px-4 text-center border-t"
                style={{ borderColor: HELPER_TOKENS.colors.innerHairline }}
              >
                <p
                  className="text-[12px]"
                  style={{ color: HELPER_TOKENS.colors.secondary, fontWeight: 400 }}
                >
                  {t("helper.noCompletedJobs")}
                </p>
              </div>
            ) : (
              <div className="border-t" style={{ borderColor: HELPER_TOKENS.colors.innerHairline }}>
                {displayEarnings.map((e, i) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between px-4 py-3"
                    style={{
                      borderBottom: i < displayEarnings.length - 1 ? `1px solid ${HELPER_TOKENS.colors.innerHairline}` : "none",
                    }}
                  >
                    <div>
                      <p className="text-[13px] font-medium text-ink leading-tight">
                        {e.service_name} · {e.home_size}
                      </p>
                      <p className="text-[12px] text-ink-muted mt-0.5 tabular-nums">
                        {new Date(e.completed_at).toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                        {e.tip > 0 ? ` · ${t("helper.tip")} ${formatCurrency(e.tip)}` : ""}
                        {e.rating ? ` · ${"★".repeat(e.rating)}` : ""}
                      </p>
                    </div>
                    <p
                      className="text-[14px] font-medium tabular-nums"
                      style={{ color: HELPER_TOKENS.colors.status.onlineText }}
                    >
                      {formatCurrency(e.amount)}
                    </p>
                  </div>
                ))}
                {earnings.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAllEarnings(!showAllEarnings)}
                    className="w-full py-2.5 text-[13px] font-medium text-center border-t outline-none cursor-pointer transition-colors"
                    style={{
                      color: HELPER_TOKENS.colors.brand,
                      borderColor: HELPER_TOKENS.colors.innerHairline,
                      backgroundColor: "transparent",
                    }}
                  >
                    {showAllEarnings ? t("helper.showLess") : t("helper.viewAllJobs", { count: earnings.length })}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 3. VERIFICATION STATUS */}
        <section className="mb-4">
          <h2
            className="text-[12px] uppercase tracking-wider mb-2"
            style={{
              color: HELPER_TOKENS.colors.secondary,
              fontWeight: 500,
            }}
          >
            {t("helper.verificationStatus")}
          </h2>

          <div
            style={{
              backgroundColor: HELPER_TOKENS.colors.cardBg,
              borderRadius: HELPER_TOKENS.radius.card,
              border: `1px solid ${HELPER_TOKENS.colors.hairline}`,
              overflow: "hidden",
            }}
          >
            {verificationItems.map((item, idx) => {
              const IconComp = item.icon;
              const isLast = idx === verificationItems.length - 1;

              // Chip styles: Waiting = saffron tint; Verified = sage tint; Rejected or needs action = danger tint
              const isVerified = item.status === "verified";
              const isNeedsAction = item.status === "needs_action";

              const chipBg = isVerified
                ? HELPER_TOKENS.colors.status.onlineTint
                : isNeedsAction
                ? HELPER_TOKENS.colors.status.dangerTint
                : HELPER_TOKENS.colors.status.pendingTint;

              const chipColor = isVerified
                ? HELPER_TOKENS.colors.status.onlineText
                : isNeedsAction
                ? HELPER_TOKENS.colors.status.danger
                : HELPER_TOKENS.colors.status.pendingText;

              const chipLabel = isVerified
                ? t("helper.verified")
                : isNeedsAction
                ? t("helper.needsAction")
                : t("helper.waiting");

              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between px-4 py-3 min-h-[50px]"
                  style={{
                    borderBottom: isLast ? "none" : `1px solid ${HELPER_TOKENS.colors.innerHairline}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* 30px blush rounded square with an outline icon */}
                    <div
                      className="w-[30px] h-[30px] flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: HELPER_TOKENS.colors.blush,
                        borderRadius: HELPER_TOKENS.radius.innerTile,
                      }}
                      aria-hidden="true"
                    >
                      <IconComp size={18} strokeWidth={1.5} style={{ color: HELPER_TOKENS.colors.brand }} />
                    </div>
                    <span
                      className="text-[14px]"
                      style={{
                        color: HELPER_TOKENS.colors.ink,
                        fontWeight: 400,
                      }}
                    >
                      {item.label}
                    </span>
                  </div>

                  {/* Status chip on the right */}
                  <span
                    className="px-2.5 py-0.5 text-[12px] select-none"
                    style={{
                      backgroundColor: chipBg,
                      color: chipColor,
                      borderRadius: HELPER_TOKENS.radius.pill,
                      fontWeight: 500,
                    }}
                  >
                    {chipLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. LIST CARD */}
        <section className="mb-4">
          <div
            style={{
              backgroundColor: HELPER_TOKENS.colors.cardBg,
              borderRadius: HELPER_TOKENS.radius.card,
              border: `1px solid ${HELPER_TOKENS.colors.hairline}`,
              overflow: "hidden",
            }}
          >
            {/* Language row (tappable to switch / open language) */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="w-full flex items-center justify-between px-4 h-[50px] min-h-[44px] border-0 outline-none cursor-pointer text-left transition-colors"
              style={{
                backgroundColor: "transparent",
                borderBottom: `1px solid ${HELPER_TOKENS.colors.innerHairline}`,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-[30px] h-[30px] flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: HELPER_TOKENS.colors.blush,
                    borderRadius: HELPER_TOKENS.radius.innerTile,
                  }}
                  aria-hidden="true"
                >
                  <IconLanguage size={18} strokeWidth={1.5} style={{ color: HELPER_TOKENS.colors.brand }} />
                </div>
                <span
                  className="text-[14px]"
                  style={{ color: HELPER_TOKENS.colors.ink, fontWeight: 400 }}
                >
                  {t("helper.language")}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[13px]"
                  style={{ color: HELPER_TOKENS.colors.secondary, fontWeight: 400 }}
                >
                  {t("helper.languageValue")}
                </span>
                <IconChevronRight size={16} strokeWidth={1.5} style={{ color: HELPER_TOKENS.colors.secondary }} />
              </div>
            </button>

            {/* Payout account */}
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 h-[50px] min-h-[44px] border-0 outline-none cursor-pointer text-left transition-colors"
              style={{
                backgroundColor: "transparent",
                borderBottom: `1px solid ${HELPER_TOKENS.colors.innerHairline}`,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-[30px] h-[30px] flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: HELPER_TOKENS.colors.blush,
                    borderRadius: HELPER_TOKENS.radius.innerTile,
                  }}
                  aria-hidden="true"
                >
                  <IconWallet size={18} strokeWidth={1.5} style={{ color: HELPER_TOKENS.colors.brand }} />
                </div>
                <span
                  className="text-[14px]"
                  style={{ color: HELPER_TOKENS.colors.ink, fontWeight: 400 }}
                >
                  {t("helper.payoutAccount")}
                </span>
              </div>
              <IconChevronRight size={16} strokeWidth={1.5} style={{ color: HELPER_TOKENS.colors.secondary }} />
            </button>

            {/* Documents */}
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 h-[50px] min-h-[44px] border-0 outline-none cursor-pointer text-left transition-colors"
              style={{
                backgroundColor: "transparent",
                borderBottom: `1px solid ${HELPER_TOKENS.colors.innerHairline}`,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-[30px] h-[30px] flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: HELPER_TOKENS.colors.blush,
                    borderRadius: HELPER_TOKENS.radius.innerTile,
                  }}
                  aria-hidden="true"
                >
                  <IconClipboardList size={18} strokeWidth={1.5} style={{ color: HELPER_TOKENS.colors.brand }} />
                </div>
                <span
                  className="text-[14px]"
                  style={{ color: HELPER_TOKENS.colors.ink, fontWeight: 400 }}
                >
                  {t("helper.documents")}
                </span>
              </div>
              <IconChevronRight size={16} strokeWidth={1.5} style={{ color: HELPER_TOKENS.colors.secondary }} />
            </button>

            {/* Safety and SOS (danger tint square and icon) */}
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 h-[50px] min-h-[44px] border-0 outline-none cursor-pointer text-left transition-colors"
              style={{
                backgroundColor: "transparent",
                borderBottom: `1px solid ${HELPER_TOKENS.colors.innerHairline}`,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-[30px] h-[30px] flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: HELPER_TOKENS.colors.status.dangerTint,
                    borderRadius: HELPER_TOKENS.radius.innerTile,
                  }}
                  aria-hidden="true"
                >
                  <IconUrgent size={18} strokeWidth={1.5} style={{ color: HELPER_TOKENS.colors.status.danger }} />
                </div>
                <span
                  className="text-[14px]"
                  style={{ color: HELPER_TOKENS.colors.ink, fontWeight: 400 }}
                >
                  {t("helper.safetySos")}
                </span>
              </div>
              <IconChevronRight size={16} strokeWidth={1.5} style={{ color: HELPER_TOKENS.colors.secondary }} />
            </button>

            {/* Help and support */}
            <Link
              href="/help"
              className="w-full flex items-center justify-between px-4 h-[50px] min-h-[44px] no-underline text-left transition-colors"
              style={{
                backgroundColor: "transparent",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-[30px] h-[30px] flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: HELPER_TOKENS.colors.blush,
                    borderRadius: HELPER_TOKENS.radius.innerTile,
                  }}
                  aria-hidden="true"
                >
                  <IconHelpCircle size={18} strokeWidth={1.5} style={{ color: HELPER_TOKENS.colors.brand }} />
                </div>
                <span
                  className="text-[14px]"
                  style={{ color: HELPER_TOKENS.colors.ink, fontWeight: 400 }}
                >
                  {t("helper.helpSupport")}
                </span>
              </div>
              <IconChevronRight size={16} strokeWidth={1.5} style={{ color: HELPER_TOKENS.colors.secondary }} />
            </Link>
          </div>
        </section>

        {/* 5. CONTROLS BELOW: LOG OUT & VERSION */}
        <div className="mb-4">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full h-12 flex items-center justify-center gap-2 cursor-pointer outline-none transition-colors duration-200 select-none shadow-xs"
            style={{
              backgroundColor: HELPER_TOKENS.colors.cardBg,
              borderRadius: HELPER_TOKENS.radius.card,
              border: `1px solid ${HELPER_TOKENS.colors.hairline}`,
              color: HELPER_TOKENS.colors.status.danger,
              fontWeight: 500,
              fontSize: "14px",
              minHeight: "44px",
            }}
          >
            <IconLogout size={18} strokeWidth={1.5} style={{ color: HELPER_TOKENS.colors.status.danger }} />
            <span>{t("helper.logout")}</span>
          </button>
        </div>

        {/* Version info */}
        <footer className="text-center pb-2 select-none">
          <p
            className="text-[12px]"
            style={{
              color: HELPER_TOKENS.colors.secondary,
              fontWeight: 400,
            }}
          >
            {t("helper.version", { version: process.env.NEXT_PUBLIC_APP_VERSION || "v1.0.0" })}
          </p>
        </footer>
      </main>
      <HelperBottomNav />
    </>
  );
}
