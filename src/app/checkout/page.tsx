"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { demoAddress, servicePrices, addons } from "@/lib/mock-data";
import { formatINR } from "@/lib/utils";
import {
  IconArrowLeft,
  IconBolt,
  IconCalendar,
  IconMapPin,
  IconEdit,
  IconTicket,
  IconChevronRight,
} from "@/components/icons";
import { useI18n } from "@/lib/i18n";
import { usePaymentStore, getMethodLabel } from "@/lib/payment-store";
import PaymentSheet from "@/components/payment-sheet";

const ALL_SLOTS = ["7:00 am", "8:00 am", "9:00 am", "10:00 am", "11:00 am", "12:00 pm", "2:00 pm", "3:00 pm", "4:00 pm", "5:00 pm", "6:00 pm", "7:00 pm"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function CheckoutPage() {
  const { t } = useI18n();
  const [mode, setMode] = useState<"instant" | "schedule">("instant");
  const [coupon, setCoupon] = useState("");
  const [notes, setNotes] = useState("");
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const payment = usePaymentStore();
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Build next 7 days
  const dates = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      return d;
    });
  }, []);

  // Slots disabled for today if the time has already passed (with 30 min buffer)
  const disabledSlots = useMemo(() => {
    if (selectedDateIdx !== 0) return new Set<string>();
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes() + 30;
    return new Set(
      ALL_SLOTS.filter((slot) => {
        const [time, ampm] = slot.split(" ");
        const [h, m] = time.split(":").map(Number);
        const slotMins = ((h % 12) + (ampm === "pm" ? 12 : 0)) * 60 + m;
        return slotMins <= nowMins;
      })
    );
  }, [selectedDateIdx]);

  // Mock: Minor clean, 2 BHK, no add-ons
  const price = servicePrices[1];
  const addonItem = addons[0];
  const total = price.price + addonItem.price;

  return (
    <div className="bg-app-bg min-h-dvh" style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}>
      {/* Header */}
      <div className="px-4 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3 py-3">
          <Link href="/" className="w-11 h-11 flex items-center justify-center rounded-full no-select" style={{ border: "0.5px solid var(--surface-border)" }} data-pressable="" aria-label={t("common.back")}>
            <IconArrowLeft size={20} className="text-ink" />
          </Link>
          <h1 className="text-[17px] font-medium text-ink">{t("checkout.title")}</h1>
        </div>
      </div>

      {/* Timing mode */}
      <div className="px-4 mt-2">
        <p className="text-[13px] font-medium text-ink mb-3">{t("checkout.whenNeedHelp")}</p>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("instant")}
            className="flex-1 rounded-[14px] p-3.5 text-left"
            style={{
              backgroundColor: mode === "instant" ? "var(--teal-soft)" : "var(--surface)",
              border: `0.5px solid ${mode === "instant" ? "var(--teal)" : "var(--surface-border)"}`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <IconBolt size={16} className="text-teal" />
              <span className="text-[13px] font-medium" style={{ color: mode === "instant" ? "var(--teal-dark)" : "var(--ink)" }}>
                {t("checkout.instant")}
              </span>
            </div>
            <p className="text-[11px] text-ink-muted">{t("checkout.instantDesc")}</p>
          </button>
          <button
            onClick={() => setMode("schedule")}
            className="flex-1 rounded-[14px] p-3.5 text-left"
            style={{
              backgroundColor: mode === "schedule" ? "var(--teal-soft)" : "var(--surface)",
              border: `0.5px solid ${mode === "schedule" ? "var(--teal)" : "var(--surface-border)"}`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <IconCalendar size={16} className="text-teal" />
              <span className="text-[13px] font-medium" style={{ color: mode === "schedule" ? "var(--teal-dark)" : "var(--ink)" }}>
                {t("checkout.scheduleForLater")}
              </span>
            </div>
            <p className="text-[11px] text-ink-muted">{t("checkout.scheduleDesc")}</p>
          </button>
        </div>
      </div>

      {/* Schedule slots (shown when schedule is selected) */}
      {mode === "schedule" && (
        <div className="px-4 mt-3 space-y-3">
          {/* Date picker row */}
          <div className="bg-surface rounded-[14px] p-4" style={{ border: "0.5px solid var(--surface-border)" }}>
            <p className="text-[13px] text-ink-muted mb-3">{t("checkout.selectDate")}</p>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {dates.map((d, i) => {
                const isSelected = i === selectedDateIdx;
                return (
                  <button
                    key={i}
                    onClick={() => { setSelectedDateIdx(i); setSelectedSlot(null); }}
                    className="flex flex-col items-center gap-0.5 rounded-[12px] px-3 py-2.5 shrink-0 transition-colors"
                    style={{
                      backgroundColor: isSelected ? "var(--teal)" : "var(--app-bg)",
                      border: `0.5px solid ${isSelected ? "var(--teal)" : "var(--surface-border)"}`,
                      minWidth: "52px",
                    }}
                  >
                    <span className="text-[10px]" style={{ color: isSelected ? "rgba(255,255,255,0.75)" : "var(--ink-muted)" }}>
                      {i === 0 ? t("checkout.today") : DAY_LABELS[d.getDay()]}
                    </span>
                    <span className="text-[16px] font-semibold" style={{ color: isSelected ? "white" : "var(--ink)" }}>
                      {d.getDate()}
                    </span>
                    <span className="text-[10px]" style={{ color: isSelected ? "rgba(255,255,255,0.75)" : "var(--ink-muted)" }}>
                      {MONTH_LABELS[d.getMonth()]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time slot grid */}
          <div className="bg-surface rounded-[14px] p-4" style={{ border: "0.5px solid var(--surface-border)" }}>
            <p className="text-[13px] text-ink-muted mb-3">{t("checkout.selectTimeSlot")}</p>
            <div className="grid grid-cols-3 gap-2">
              {ALL_SLOTS.map((slot) => {
                const isSelected = slot === selectedSlot;
                const isDisabled = disabledSlots.has(slot);
                return (
                  <button
                    key={slot}
                    disabled={isDisabled}
                    onClick={() => setSelectedSlot(slot)}
                    className="py-2.5 rounded-[10px] text-[12px] font-medium transition-colors"
                    style={{
                      backgroundColor: isSelected ? "var(--teal)" : isDisabled ? "var(--app-bg)" : "var(--app-bg)",
                      border: `0.5px solid ${isSelected ? "var(--teal)" : "var(--surface-border)"}`,
                      color: isSelected ? "white" : isDisabled ? "var(--ink-muted)" : "var(--ink)",
                      opacity: isDisabled ? 0.4 : 1,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                    }}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Address */}
      <div className="px-4 mt-4">
        <div className="bg-surface rounded-[14px] p-4 flex items-center gap-3" style={{ border: "0.5px solid var(--surface-border)" }}>
          <IconMapPin size={20} className="text-brand-rose shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-ink">{demoAddress.label}</p>
            <p className="text-[12px] text-ink-muted truncate">{demoAddress.full_address}</p>
          </div>
          <button type="button" aria-label={t("location.edit")} data-pressable="" className="w-11 h-11 flex items-center justify-center no-select">
            <IconEdit size={18} className="text-ink-muted" />
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="px-4 mt-3">
        <div className="bg-surface rounded-[14px] p-4" style={{ border: "0.5px solid var(--surface-border)" }}>
          <p className="text-[13px] text-ink-muted mb-2">{t("checkout.notesForHelper")}</p>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("checkout.notesPlaceholder")}
            className="w-full text-ink bg-transparent outline-none placeholder:text-ink-muted/50"
            style={{ fontSize: "16px" }}
          />
        </div>
      </div>

      {/* Coupon */}
      <div className="px-4 mt-3">
        <div className="bg-surface rounded-[14px] p-4 flex items-center gap-3" style={{ border: "0.5px solid var(--surface-border)" }}>
          <IconTicket size={20} className="text-ink-muted" />
          <input
            type="text"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            placeholder={t("checkout.enterCoupon")}
            className="flex-1 text-ink bg-transparent outline-none placeholder:text-ink-muted/50"
            style={{ fontSize: "16px" }}
          />
          <button type="button" className="text-[13px] font-medium text-brand-rose min-h-[44px] min-w-[44px] flex items-center justify-center" data-pressable="">{t("checkout.apply")}</button>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="px-4 mt-4">
        <div className="bg-surface rounded-[14px] p-4" style={{ border: "0.5px solid var(--surface-border)" }}>
          <p className="text-[13px] font-medium text-ink mb-3">{t("checkout.priceBreakdown")}</p>
          <div className="space-y-2">
            <div className="flex justify-between text-[13px]">
              <span className="text-ink-muted">Minor clean · 2 BHK · 60 min</span>
              <span className="text-ink">{formatINR(price.price)}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-ink-muted">Washroom × 1</span>
              <span className="text-ink">{formatINR(addonItem.price)}</span>
            </div>
            <div className="pt-2 mt-1 flex justify-between text-[14px]" style={{ borderTop: "0.5px solid var(--surface-border)" }}>
              <span className="font-medium text-ink">{t("checkout.total")}</span>
              <span className="font-medium text-ink">{formatINR(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment method */}
      <div className="px-4 mt-4">
        <p className="text-[13px] font-medium text-ink mb-3">{t("checkout.payWith")}</p>
        <button
          onClick={() => setShowPaymentSheet(true)}
          className="w-full flex items-center justify-between py-3 px-4 rounded-[14px]"
          style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}
        >
          <span className="text-[14px] font-medium text-ink">{getMethodLabel(payment, payment.selected)}</span>
          <IconChevronRight size={18} className="text-ink-muted" />
        </button>
      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface px-4 py-3 z-10" style={{ borderTop: "0.5px solid var(--surface-border)", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        <Link
          href="/searching"
          className="w-full flex items-center justify-center py-3.5 rounded-[12px] text-[14px] font-medium text-white"
          style={{ backgroundColor: "var(--brand-rose)" }}
        >
          {t("checkout.bookHelper")} · {formatINR(total)}
        </Link>
      </div>

      {/* Payment Sheet */}
      {showPaymentSheet && <PaymentSheet onClose={() => setShowPaymentSheet(false)} />}
    </div>
  );
}
