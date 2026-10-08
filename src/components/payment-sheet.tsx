"use client";

import { useRef, useEffect, useState } from "react";
import { usePaymentStore, getMethodLabel, detectCardBrand, luhnCheck, validateUpi, type PaymentMethodSelection, type UpiProvider } from "@/lib/payment-store";
import { IconX, IconCheck, IconChevronRight, IconPlus } from "@/components/icons";
import { useDragToDismiss } from "@/lib/use-drag-to-dismiss";
import { GPayLogo, PhonePeLogo, PaytmLogo, BhimLogo, VisaLogo, MastercardLogo, RupayLogo, AmexLogo } from "@/components/payment-logos";
import { useI18n } from "@/lib/i18n";

export default function PaymentSheet({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const payment = usePaymentStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { sheetRef, handlePointerDown, handlePointerMove, handlePointerUp } = useDragToDismiss({
    enabled: true,
    onDismiss: onClose,
    contentScrollRef: scrollRef,
  });

  const [mode, setMode] = useState<"list" | "add_card" | "add_upi">("list");
  
  // Card form state
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const brand = detectCardBrand(cardNumber);
  const cardValid = luhnCheck(cardNumber) && expiry.length === 5 && cvv.length >= 3 && cardName.length > 0;

  // UPI form state
  const [upiId, setUpiId] = useState("");
  const upiValid = validateUpi(upiId);

  const handleSelect = (sel: PaymentMethodSelection) => {
    payment.select(sel);
    onClose();
  };

  const handleAddCard = () => {
    if (!cardValid) return;
    const id = "card_" + Math.random().toString(36).slice(2, 9);
    payment.addCard({
      id,
      brand,
      last4: cardNumber.replace(/\D/g, "").slice(-4),
      expiry,
      name: cardName,
    });
    payment.select({ type: "card", id });
    onClose();
  };

  const handleAddUpi = () => {
    if (!upiValid) return;
    const id = "upi_" + Math.random().toString(36).slice(2, 9);
    payment.addUpi({
      id,
      provider: "gpay", // Default or extract from domain if needed
      upiId,
    });
    payment.select({ type: "upi_custom", id });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />

        <div
          ref={sheetRef}
          onPointerDown={e => handlePointerDown(e, false)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-full max-w-[430px] rounded-t-[24px] flex flex-col bg-app-bg shadow-sheet"
          style={{ height: "85dvh", transform: "translateY(0)", touchAction: "none" }}
        >
          {/* Drag handle */}
          <div 
            onPointerDown={e => handlePointerDown(e, true)}
            className="absolute top-0 left-0 right-0 h-8 flex justify-center items-center z-10 touch-none cursor-grab active:cursor-grabbing"
          >
            <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "var(--surface-border)" }} />
          </div>

          <div className="flex items-center justify-between px-4 pt-6 pb-2">
            <h2 className="text-[18px] font-medium text-ink">
              {mode === "list" ? "Payment options" : mode === "add_card" ? "Add credit or debit card" : "Add UPI ID"}
            </h2>
            <button
              onClick={() => mode === "list" ? onClose() : setMode("list")}
              className="w-8 h-8 flex items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--surface)" }}
            >
              <IconX size={18} className="text-ink-muted" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-8 touch-pan-y hide-scrollbar" onPointerDown={e => e.stopPropagation()}>
            {mode === "list" && (
              <div className="flex flex-col gap-6 mt-4">
                
                {/* Pay after service */}
                <div>
                  <p className="text-[13px] font-medium text-ink-muted mb-2 uppercase tracking-wide">Pay later</p>
                  <button
                    onClick={() => handleSelect({ type: "pay_after" })}
                    className="w-full flex items-center justify-between p-4 rounded-[14px]"
                    style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}
                  >
                    <span className="text-[15px] font-medium text-ink">Pay after service</span>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ 
                        border: payment.selected?.type === "pay_after" ? "none" : "1.5px solid var(--surface-border)",
                        backgroundColor: payment.selected?.type === "pay_after" ? "var(--teal)" : "transparent"
                      }}>
                      {payment.selected?.type === "pay_after" && <IconCheck size={12} className="text-white" />}
                    </div>
                  </button>
                </div>

                {/* UPI options */}
                <div>
                  <p className="text-[13px] font-medium text-ink-muted mb-2 uppercase tracking-wide">UPI</p>
                  <div className="rounded-[14px] overflow-hidden" style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}>
                    {(["gpay", "phonepe", "paytm", "bhim"] as const).map((provider, i) => {
                      const isSelected = payment.selected?.type === "upi_provider" && payment.selected.provider === provider;
                      return (
                        <button
                          key={provider}
                          onClick={() => handleSelect({ type: "upi_provider", provider })}
                          className="w-full flex items-center justify-between p-4"
                          style={{ borderBottom: i < 3 ? "0.5px solid var(--surface-border)" : "none" }}
                        >
                          <div className="flex items-center gap-3">
                            {provider === "gpay" && <GPayLogo />}
                            {provider === "phonepe" && <PhonePeLogo />}
                            {provider === "paytm" && <PaytmLogo />}
                            {provider === "bhim" && <BhimLogo />}
                            <span className="text-[15px] font-medium text-ink">
                              {provider === "gpay" ? "Google Pay" : provider === "phonepe" ? "PhonePe" : provider === "paytm" ? "Paytm" : "BHIM"}
                            </span>
                          </div>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ 
                              border: isSelected ? "none" : "1.5px solid var(--surface-border)",
                              backgroundColor: isSelected ? "var(--teal)" : "transparent"
                            }}>
                            {isSelected && <IconCheck size={12} className="text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Custom saved UPIs */}
                  {payment.savedUpis.map(upi => {
                    const isSelected = payment.selected?.type === "upi_custom" && payment.selected.id === upi.id;
                    return (
                      <div key={upi.id} className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => handleSelect({ type: "upi_custom", id: upi.id })}
                          className="flex-1 flex items-center justify-between p-4 rounded-[14px]"
                          style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}
                        >
                          <span className="text-[15px] font-medium text-ink">{upi.upiId}</span>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ 
                              border: isSelected ? "none" : "1.5px solid var(--surface-border)",
                              backgroundColor: isSelected ? "var(--teal)" : "transparent"
                            }}>
                            {isSelected && <IconCheck size={12} className="text-white" />}
                          </div>
                        </button>
                        <button 
                          onClick={() => payment.removeUpi(upi.id)}
                          className="w-10 h-10 flex items-center justify-center rounded-full bg-surface"
                        >
                          <IconX size={16} className="text-ink-muted" />
                        </button>
                      </div>
                    );
                  })}

                  <button
                    onClick={() => setMode("add_upi")}
                    className="w-full flex items-center gap-3 p-4 mt-2 rounded-[14px]"
                    style={{ border: "1px dashed var(--surface-border)" }}
                  >
                    <IconPlus size={20} className="text-teal" style={{ color: "var(--teal)" }} />
                    <span className="text-[15px] font-medium" style={{ color: "var(--teal)" }}>Add new UPI ID</span>
                  </button>
                </div>

                {/* Cards */}
                <div>
                  <p className="text-[13px] font-medium text-ink-muted mb-2 uppercase tracking-wide">Credit & Debit Cards</p>
                  {payment.savedCards.map(card => {
                    const isSelected = payment.selected?.type === "card" && payment.selected.id === card.id;
                    return (
                      <div key={card.id} className="mb-2 flex items-center gap-2">
                        <button
                          onClick={() => handleSelect({ type: "card", id: card.id })}
                          className="flex-1 flex items-center justify-between p-4 rounded-[14px]"
                          style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}
                        >
                          <div className="flex items-center gap-3">
                            {card.brand === "visa" && <VisaLogo />}
                            {card.brand === "mastercard" && <MastercardLogo />}
                            {card.brand === "rupay" && <RupayLogo />}
                            {card.brand === "amex" && <AmexLogo />}
                            {card.brand === "unknown" && <div className="w-8 h-5 bg-step-inactive rounded" />}
                            <span className="text-[15px] font-medium text-ink">•••• {card.last4}</span>
                          </div>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ 
                              border: isSelected ? "none" : "1.5px solid var(--surface-border)",
                              backgroundColor: isSelected ? "var(--teal)" : "transparent"
                            }}>
                            {isSelected && <IconCheck size={12} className="text-white" />}
                          </div>
                        </button>
                        <button 
                          onClick={() => payment.removeCard(card.id)}
                          className="w-10 h-10 flex items-center justify-center rounded-full bg-surface"
                        >
                          <IconX size={16} className="text-ink-muted" />
                        </button>
                      </div>
                    );
                  })}

                  <button
                    onClick={() => setMode("add_card")}
                    className="w-full flex items-center gap-3 p-4 rounded-[14px]"
                    style={{ border: "1px dashed var(--surface-border)" }}
                  >
                    <IconPlus size={20} className="text-teal" style={{ color: "var(--teal)" }} />
                    <span className="text-[15px] font-medium" style={{ color: "var(--teal)" }}>Add new card</span>
                  </button>
                </div>
              </div>
            )}

            {mode === "add_upi" && (
              <div className="mt-4">
                <div className="mb-6">
                  <label className="text-[12px] font-medium text-ink-muted mb-1.5 block">UPI ID</label>
                  <input
                    type="text"
                    placeholder="name@okbank"
                    value={upiId}
                    onChange={e => setUpiId(e.target.value.toLowerCase())}
                    className="w-full h-12 rounded-[12px] px-4 text-[15px] text-ink outline-none"
                    style={{ backgroundColor: "var(--surface)", border: "1px solid var(--surface-border)" }}
                  />
                  {!upiValid && upiId.length > 0 && (
                    <p className="text-[11px] mt-1.5" style={{ color: "#B3261E" }}>Please enter a valid UPI ID</p>
                  )}
                </div>
                <button
                  onClick={handleAddUpi}
                  disabled={!upiValid}
                  className="w-full h-12 rounded-[12px] text-[15px] font-medium text-white transition-opacity"
                  style={{ backgroundColor: "var(--brand-rose)", opacity: upiValid ? 1 : 0.5 }}
                >
                  Verify and save
                </button>
              </div>
            )}

            {mode === "add_card" && (
              <div className="mt-4 flex flex-col gap-4">
                <div>
                  <label className="text-[12px] font-medium text-ink-muted mb-1.5 block">Card number</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0000 0000 0000 0000"
                      value={cardNumber}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, "");
                        let formatted = val.match(/.{1,4}/g)?.join(" ") || "";
                        if (val.length > 19) formatted = formatted.slice(0, 23);
                        setCardNumber(formatted);
                      }}
                      className="w-full h-12 rounded-[12px] pl-12 pr-4 text-[15px] text-ink outline-none"
                      style={{ backgroundColor: "var(--surface)", border: "1px solid var(--surface-border)" }}
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      {brand === "visa" && <VisaLogo />}
                      {brand === "mastercard" && <MastercardLogo />}
                      {brand === "rupay" && <RupayLogo />}
                      {brand === "amex" && <AmexLogo />}
                      {brand === "unknown" && <div className="w-8 h-5 bg-step-inactive rounded" />}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[12px] font-medium text-ink-muted mb-1.5 block">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={e => {
                        let val = e.target.value.replace(/\D/g, "");
                        if (val.length >= 2) val = val.slice(0, 2) + "/" + val.slice(2, 4);
                        setExpiry(val);
                      }}
                      className="w-full h-12 rounded-[12px] px-4 text-[15px] text-ink outline-none"
                      style={{ backgroundColor: "var(--surface)", border: "1px solid var(--surface-border)" }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[12px] font-medium text-ink-muted mb-1.5 block">CVV</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="123"
                      value={cvv}
                      onChange={e => setCvv(e.target.value.replace(/\D/g, ""))}
                      className="w-full h-12 rounded-[12px] px-4 text-[15px] text-ink outline-none"
                      style={{ backgroundColor: "var(--surface)", border: "1px solid var(--surface-border)" }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-medium text-ink-muted mb-1.5 block">Name on card</label>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={cardName}
                    onChange={e => setCardName(e.target.value)}
                    className="w-full h-12 rounded-[12px] px-4 text-[15px] text-ink outline-none"
                    style={{ backgroundColor: "var(--surface)", border: "1px solid var(--surface-border)" }}
                  />
                </div>

                <button
                  onClick={handleAddCard}
                  disabled={!cardValid}
                  className="w-full h-12 mt-2 rounded-[12px] text-[15px] font-medium text-white transition-opacity"
                  style={{ backgroundColor: "var(--brand-rose)", opacity: cardValid ? 1 : 0.5 }}
                >
                  Save card
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
