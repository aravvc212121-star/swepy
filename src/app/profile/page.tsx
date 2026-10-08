"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/app-shell";
import BottomNav from "@/components/bottom-nav";
import { PageTitle, Card, ListCard, ListCardRow } from "@/components/ui";
import {
  IconUser,
  IconEdit,
  IconMapPin,
  IconWallet,
  IconLanguage,
  IconLogout,
  IconChevronRight,
  IconBolt,
  IconBell,
  IconHelpCircle,
} from "@/components/icons";
import { useI18n } from "@/lib/i18n";
import { useProfileStore } from "@/lib/profile-store";
import { usePaymentStore, getMethodLabel } from "@/lib/payment-store";
import { useNotificationStore, getNotificationSummary } from "@/lib/notification-store";
import { demoAddress } from "@/lib/mock-data";
import { useTheme } from "@/lib/theme-store";

/* ── Dark mode toggle icon (sun/moon) ── */
function SunIcon({ size = 20 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" /><path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" /><path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" /><path d="M20 12h2" />
      <path d="M6.34 17.66l-1.41 1.41" /><path d="M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ size = 20 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" />
    </svg>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const profile = useProfileStore();
  const payment = usePaymentStore();
  const notifs = useNotificationStore();
  const { theme, toggleTheme } = useTheme();
  const [isStandaloneMode, setIsStandaloneMode] = useState(true);

  useEffect(() => {
    setIsStandaloneMode(
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    );
  }, []);

  const notifSummary = getNotificationSummary(notifs);
  const notifSubtitle = notifs.master
    ? t("notifications.summaryOn", { count: String(notifSummary.count), total: String(notifSummary.total) })
    : t("notifications.summaryOff");
  const paymentSubtitle = getMethodLabel(payment, payment.selected);

  return (
    <>
      <AppShell>
        <PageTitle>{t("profile.title")}</PageTitle>

        {/* User info card */}
        <button
          type="button"
          onClick={() => router.push("/profile/edit")}
          className="w-full text-left"
          data-pressable=""
        >
          <Card>
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                style={{ backgroundColor: "var(--teal-soft)" }}
              >
                {profile.avatar ? (
                  <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <IconUser size={22} style={{ color: "var(--teal-dark)" }} />
                )}
              </div>
              {/* Name + phone */}
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-medium" style={{ color: "var(--ink)" }}>
                  {profile.name}
                </p>
                <p className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
                  {profile.phone}
                </p>
              </div>
              {/* Edit button */}
              <div
                className="w-11 h-11 flex items-center justify-center rounded-full shrink-0"
                style={{ border: "0.5px solid var(--surface-border)" }}
              >
                <IconEdit size={18} className="text-ink-muted" />
              </div>
            </div>
          </Card>
        </button>

        {/* Addresses + Payment methods */}
        <div className="mt-3">
          <ListCard>
            <ListCardRow onClick={() => {}}>
              <IconMapPin size={20} className="text-teal shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                  {t("profile.savedAddresses")}
                </p>
                <p className="text-[12px]" style={{ color: "var(--ink-muted)" }}>
                  {demoAddress.label}, {demoAddress.tower} {demoAddress.flat}
                </p>
              </div>
              <IconChevronRight size={16} className="text-ink-muted shrink-0" />
            </ListCardRow>
            <ListCardRow last onClick={() => router.push("/profile/payment-methods")}>
              <IconWallet size={20} className="text-teal shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                  {t("profile.paymentMethods")}
                </p>
                <p className="text-[12px]" style={{ color: "var(--ink-muted)" }}>
                  {paymentSubtitle}
                </p>
              </div>
              <IconChevronRight size={16} className="text-ink-muted shrink-0" />
            </ListCardRow>
          </ListCard>
        </div>

        {/* Support & Notifications */}
        <div className="mt-3">
          <ListCard>
            <ListCardRow onClick={() => router.push("/profile/notifications")}>
              <IconBell size={20} className="text-teal shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                  {t("profile.notifications")}
                </p>
                <p className="text-[12px]" style={{ color: "var(--ink-muted)" }}>
                  {notifSubtitle}
                </p>
              </div>
              <IconChevronRight size={16} className="text-ink-muted shrink-0" />
            </ListCardRow>
            <ListCardRow last onClick={() => router.push("/help")}>
              <IconHelpCircle size={20} className="text-teal shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                  {t("profile.helpSupport")}
                </p>
              </div>
              <IconChevronRight size={16} className="text-ink-muted shrink-0" />
            </ListCardRow>
          </ListCard>
        </div>

        {/* Language + Theme card */}
        <div className="mt-3">
          <Card>
            {/* Language row */}
            <div className="flex items-center gap-2 mb-3">
              <IconLanguage size={20} className="text-ink-muted" />
              <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                {t("profile.language")}
              </span>
            </div>
            <div className="flex gap-2 mb-4">
              {([
                { key: "en" as const, label: "English" },
                { key: "hi" as const, label: "हिन्दी" },
              ]).map((lang) => {
                const isSelected = locale === lang.key;
                return (
                  <button
                    key={lang.key}
                    type="button"
                    onClick={() => setLocale(lang.key)}
                    data-pressable=""
                    className="flex-1 h-11 rounded-[10px] text-[13px] font-medium no-select"
                    style={{
                      backgroundColor: isSelected ? "var(--teal-soft)" : "var(--surface)",
                      border: `0.5px solid ${isSelected ? "var(--teal)" : "var(--surface-border)"}`,
                      color: isSelected ? "var(--teal-dark)" : "var(--ink)",
                    }}
                  >
                    {lang.label}
                  </button>
                );
              })}
            </div>

            {/* Dark mode row */}
            <div className="pt-3" style={{ borderTop: "0.5px solid var(--surface-border)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {theme === "dark" ? (
                    <MoonIcon size={20} />
                  ) : (
                    <SunIcon size={20} />
                  )}
                  <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                    {t("profile.darkMode")}
                  </span>
                </div>
                {/* Toggle switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={theme === "dark"}
                  aria-label={t("profile.darkMode")}
                  onClick={toggleTheme}
                  className="relative w-[52px] h-[30px] rounded-full transition-colors duration-200 shrink-0"
                  style={{
                    backgroundColor: theme === "dark" ? "var(--brand-rose)" : "var(--step-inactive)",
                  }}
                >
                  <div
                    className="absolute top-[3px] w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200"
                    style={{
                      transform: theme === "dark" ? "translateX(24px)" : "translateX(3px)",
                    }}
                  />
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Install app (hidden when already standalone) */}
        {!isStandaloneMode && (
          <div className="mt-3">
            <ListCard>
              <ListCardRow last onClick={() => {}}>
                <IconBolt size={20} className="text-teal shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                    {t("profile.installApp")}
                  </p>
                  <p className="text-[12px]" style={{ color: "var(--ink-muted)" }}>
                    {t("profile.installAppDesc")}
                  </p>
                </div>
                <IconChevronRight size={16} className="text-ink-muted shrink-0" />
              </ListCardRow>
            </ListCard>
          </div>
        )}

        {/* Logout */}
        <div className="mt-3">
          <ListCard>
            <ListCardRow last onClick={() => {}}>
              <IconLogout size={20} style={{ color: "#B3295B" }} />
              <span className="text-[14px] font-medium" style={{ color: "#B3295B" }}>
                {t("profile.logout")}
              </span>
            </ListCardRow>
          </ListCard>
        </div>
      </AppShell>

      <BottomNav />
    </>
  );
}
