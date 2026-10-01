"use client";

import { useState } from "react";
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

export default function CheckoutPage() {
  const [mode, setMode] = useState<"instant" | "schedule">("instant");
  const [coupon, setCoupon] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card">("upi");

  // Mock: Minor clean, 2 BHK, no add-ons
  const price = servicePrices[1];
  const addonItem = addons[0];
  const total = price.price + addonItem.price;

  return (
    <div className="bg-app-bg min-h-dvh" style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}>
      {/* Header */}
      <div className="px-4 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3 py-3">
          <Link href="/" className="w-11 h-11 flex items-center justify-center rounded-full no-select" style={{ border: "0.5px solid var(--surface-border)" }} data-pressable="" aria-label="Back">
            <IconArrowLeft size={20} className="text-ink" />
          </Link>
          <h1 className="text-[17px] font-medium text-ink">Checkout</h1>
        </div>
      </div>

      {/* Timing mode */}
      <div className="px-4 mt-2">
        <p className="text-[13px] font-medium text-ink mb-3">When do you need help?</p>
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
                Instant
              </span>
            </div>
            <p className="text-[11px] text-ink-muted">Helper in about 10 min</p>
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
                Schedule for later
              </span>
            </div>
            <p className="text-[11px] text-ink-muted">Pick date and time</p>
          </button>
        </div>
      </div>

      {/* Schedule slots (shown when schedule is selected) */}
      {mode === "schedule" && (
        <div className="px-4 mt-3">
          <div className="bg-surface rounded-[14px] p-4" style={{ border: "0.5px solid var(--surface-border)" }}>
            <p className="text-[13px] text-ink-muted mb-3">Select a time slot</p>
            <div className="grid grid-cols-3 gap-2">
              {["9:00 am", "10:00 am", "11:00 am", "2:00 pm", "3:00 pm", "4:00 pm"].map((slot) => (
                <button
                  key={slot}
                  className="py-2 rounded-[10px] text-[12px] font-medium text-ink bg-surface"
                  style={{ border: "0.5px solid var(--surface-border)" }}
                >
                  {slot}
                </button>
              ))}
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
          <button type="button" aria-label="Edit address" data-pressable="" className="w-11 h-11 flex items-center justify-center no-select">
            <IconEdit size={18} className="text-ink-muted" />
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="px-4 mt-3">
        <div className="bg-surface rounded-[14px] p-4" style={{ border: "0.5px solid var(--surface-border)" }}>
          <p className="text-[13px] text-ink-muted mb-2">Notes for the helper</p>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="E.g. please start with the kitchen"
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
            placeholder="Enter coupon code"
            className="flex-1 text-ink bg-transparent outline-none placeholder:text-ink-muted/50"
            style={{ fontSize: "16px" }}
          />
          <button type="button" className="text-[13px] font-medium text-brand-rose min-h-[44px] min-w-[44px] flex items-center justify-center" data-pressable="">Apply</button>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="px-4 mt-4">
        <div className="bg-surface rounded-[14px] p-4" style={{ border: "0.5px solid var(--surface-border)" }}>
          <p className="text-[13px] font-medium text-ink mb-3">Price breakdown</p>
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
              <span className="font-medium text-ink">Total</span>
              <span className="font-medium text-ink">{formatINR(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment method */}
      <div className="px-4 mt-4">
        <p className="text-[13px] font-medium text-ink mb-3">Pay with</p>
        <div className="flex gap-2">
          {(["upi", "card"] as const).map((method) => (
            <button
              key={method}
              onClick={() => setPaymentMethod(method)}
              className="flex-1 py-3 rounded-[14px] text-[13px] font-medium"
              style={{
                backgroundColor: paymentMethod === method ? "var(--teal-soft)" : "var(--surface)",
                border: `0.5px solid ${paymentMethod === method ? "var(--teal)" : "var(--surface-border)"}`,
                color: paymentMethod === method ? "var(--teal-dark)" : "var(--ink)",
              }}
            >
              {method === "upi" ? "UPI" : "Card"}
            </button>
          ))}
        </div>
      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface px-4 py-3 z-10" style={{ borderTop: "0.5px solid var(--surface-border)", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        <Link
          href="/booking/bk_20261001_001"
          className="w-full flex items-center justify-center py-3.5 rounded-[12px] text-[14px] font-medium text-white"
          style={{ backgroundColor: "var(--brand-rose)" }}
        >
          Book helper · {formatINR(total)}
        </Link>
      </div>
    </div>
  );
}
