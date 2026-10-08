"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useNotificationStore } from "@/lib/notification-store";
import { IconArrowLeft, IconCheck, IconLock } from "@/components/icons";

function Toast({ message, visible }: { message: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-60 px-4 py-2.5 rounded-[12px] text-[13px] font-medium text-white flex items-center gap-2"
      style={{ backgroundColor: "#1F1A24" }}
    >
      <IconCheck size={16} /> {message}
    </div>
  );
}

function Toggle({
  on,
  disabled,
  onToggle,
  ariaLabel,
}: {
  on: boolean;
  disabled?: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onToggle}
      className="relative w-[44px] h-[26px] rounded-full shrink-0 transition-colors"
      style={{
        backgroundColor: on ? "var(--brand-rose)" : "var(--surface-border)",
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <div
        className="absolute top-[3px] w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
        style={{ left: on ? "21px" : "3px" }}
      />
    </button>
  );
}

export default function NotificationsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const store = useNotificationStore();
  const [showToast, setShowToast] = useState(false);
  const [channelWarning, setChannelWarning] = useState(false);

  const flash = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1500);
  };

  const handleMasterToggle = async () => {
    const newVal = !store.master;
    if (newVal && store.permissionState !== "granted" && store.permissionState !== "unsupported") {
      const result = await store.requestPermission();
      if (result === "denied") {
        // Still allow toggling on since we have WhatsApp/SMS fallback
      }
    }
    store.setMaster(newVal);
    flash();
  };

  const categoryDisabled = !store.master;

  return (
    <div
      className="bg-app-bg min-h-dvh w-full max-w-[430px] mx-auto"
      style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}
    >
      <Toast message={t("notifications.saved")} visible={showToast} />

      {/* Header */}
      <div className="px-4 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3 py-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-11 h-11 flex items-center justify-center rounded-full no-select"
            style={{ border: "0.5px solid var(--surface-border)" }}
            aria-label={t("common.back")}
            data-pressable=""
          >
            <IconArrowLeft size={20} className="text-ink" />
          </button>
          <h1 className="text-[17px] font-medium text-ink">
            {t("notifications.title")}
          </h1>
        </div>
      </div>

      {/* Master toggle */}
      <div className="px-4 mt-2">
        <div
          className="bg-white rounded-[14px] px-4 py-4 flex items-center justify-between"
          style={{ border: "0.5px solid var(--surface-border)" }}
        >
          <span className="text-[15px] font-medium text-ink">
            {t("notifications.allowNotifications")}
          </span>
          <Toggle
            on={store.master}
            onToggle={handleMasterToggle}
            ariaLabel={t("notifications.allowNotifications")}
          />
        </div>

        {/* Permission denied note */}
        {store.master && store.permissionState === "denied" && (
          <p className="text-[12px] mt-2 px-1" style={{ color: "var(--brand-rose)" }}>
            {t("notifications.permissionDenied")}
          </p>
        )}
      </div>

      {/* Category toggles */}
      <div className="px-4 mt-4">
        <div
          className="bg-white rounded-[14px] overflow-hidden"
          style={{
            border: "0.5px solid var(--surface-border)",
            opacity: categoryDisabled ? 0.5 : 1,
          }}
        >
          {/* Booking updates */}
          <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "0.5px solid var(--surface-border)" }}>
            <div>
              <p className="text-[14px] font-medium text-ink">{t("notifications.bookingUpdates")}</p>
              <p className="text-[12px] text-ink-muted">{t("notifications.bookingUpdatesDesc")}</p>
            </div>
            <Toggle
              on={store.bookingUpdates}
              disabled={categoryDisabled}
              onToggle={() => { store.toggleCategory("bookingUpdates"); flash(); }}
              ariaLabel={t("notifications.bookingUpdates")}
            />
          </div>

          {/* Payments */}
          <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "0.5px solid var(--surface-border)" }}>
            <p className="text-[14px] font-medium text-ink">{t("notifications.payments")}</p>
            <Toggle
              on={store.payments}
              disabled={categoryDisabled}
              onToggle={() => { store.toggleCategory("payments"); flash(); }}
              ariaLabel={t("notifications.payments")}
            />
          </div>

          {/* Reminders */}
          <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "0.5px solid var(--surface-border)" }}>
            <div>
              <p className="text-[14px] font-medium text-ink">{t("notifications.reminders")}</p>
              <p className="text-[12px] text-ink-muted">{t("notifications.remindersDesc")}</p>
            </div>
            <Toggle
              on={store.reminders}
              disabled={categoryDisabled}
              onToggle={() => { store.toggleCategory("reminders"); flash(); }}
              ariaLabel={t("notifications.reminders")}
            />
          </div>

          {/* Offers */}
          <div className="flex items-center justify-between px-4 py-3.5">
            <p className="text-[14px] font-medium text-ink">{t("notifications.offers")}</p>
            <Toggle
              on={store.offers}
              disabled={categoryDisabled}
              onToggle={() => { store.toggleCategory("offers"); flash(); }}
              ariaLabel={t("notifications.offers")}
            />
          </div>
        </div>
      </div>

      {/* Safety alerts (always on) */}
      <div className="px-4 mt-3">
        <div
          className="bg-white rounded-[14px] px-4 py-3.5 flex items-center gap-3"
          style={{ border: "0.5px solid var(--surface-border)", opacity: 0.6 }}
        >
          <IconLock size={18} className="text-ink-muted shrink-0" />
          <div className="flex-1">
            <p className="text-[14px] font-medium text-ink">{t("notifications.safetyAlerts")}</p>
            <p className="text-[12px] text-ink-muted">{t("notifications.safetyDesc")}</p>
          </div>
          <Toggle on={true} disabled onToggle={() => {}} ariaLabel={t("notifications.safetyAlerts")} />
        </div>
      </div>

      {/* Channels */}
      <div className="px-4 mt-5">
        <p className="text-[13px] font-medium text-ink mb-3">
          {t("notifications.sendMeOn")}
        </p>
        <div
          className="bg-white rounded-[14px] overflow-hidden"
          style={{
            border: "0.5px solid var(--surface-border)",
            opacity: categoryDisabled ? 0.5 : 1,
          }}
        >
          {(["push", "whatsapp", "sms"] as const).map((ch, i) => (
            <div
              key={ch}
              className="flex items-center justify-between px-4 py-3.5"
              style={i < 2 ? { borderBottom: "0.5px solid var(--surface-border)" } : undefined}
            >
              <p className="text-[14px] font-medium text-ink">
                {t(`notifications.${ch}`)}
              </p>
              <Toggle
                on={store.channels[ch]}
                disabled={categoryDisabled}
                onToggle={() => {
                  const ok = store.toggleChannel(ch);
                  if (!ok) {
                    setChannelWarning(true);
                    setTimeout(() => setChannelWarning(false), 2500);
                  } else {
                    flash();
                  }
                }}
                ariaLabel={t(`notifications.${ch}`)}
              />
            </div>
          ))}
        </div>
        {channelWarning && (
          <p className="text-[12px] mt-2 px-1" style={{ color: "var(--brand-rose)" }}>
            {t("notifications.channelRequired")}
          </p>
        )}
      </div>
    </div>
  );
}
