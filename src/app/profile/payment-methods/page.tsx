"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import {
  usePaymentStore,
  validateUpi,
  luhnCheck,
  detectCardBrand,
  type UpiProvider,
  type SavedCard,
} from "@/lib/payment-store";
import { IconArrowLeft, IconPlus, IconX } from "@/components/icons";
import { GPayLogo, PhonePeLogo, PaytmLogo, BhimLogo } from "@/components/payment-logos";

const UPI_PROVIDERS: { key: UpiProvider; logo: React.ReactNode }[] = [
  { key: "gpay", logo: <GPayLogo size={36} /> },
  { key: "phonepe", logo: <PhonePeLogo size={36} /> },
  { key: "paytm", logo: <PaytmLogo size={36} /> },
  { key: "bhim", logo: <BhimLogo size={36} /> },
];

function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel: string;
  cancelLabel: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />
      <div
        className="relative w-full max-w-[430px] bg-white rounded-t-[20px] p-5"
        style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))" }}
      >
        <h3 className="text-[16px] font-medium text-ink mb-2">{title}</h3>
        <p className="text-[13px] text-ink-muted mb-5">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-[12px] text-[14px] font-medium"
            style={{ border: "0.5px solid var(--surface-border)", color: "var(--ink)" }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-11 rounded-[12px] text-[14px] font-medium text-white"
            style={{ backgroundColor: "var(--brand-rose)" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function RadioDot({ active }: { active: boolean }) {
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
      style={{
        border: `2px solid ${active ? "var(--brand-rose)" : "var(--surface-border)"}`,
      }}
    >
      {active && (
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--brand-rose)" }} />
      )}
    </div>
  );
}

export default function PaymentMethodsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const store = usePaymentStore();

  const [showUpiInput, setShowUpiInput] = useState(false);
  const [upiValue, setUpiValue] = useState("");
  const [upiError, setUpiError] = useState("");
  const [upiVerifying, setUpiVerifying] = useState(false);

  const [showCardSheet, setShowCardSheet] = useState(false);
  const [cardNum, setCardNum] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  const [confirmRemove, setConfirmRemove] = useState<{
    type: "upi" | "card";
    id: string;
    label: string;
  } | null>(null);

  const isSelected = (type: string, id?: string) => {
    if (!store.selected) return false;
    if (type === "upi_provider") return store.selected.type === "upi_provider" && store.selected.provider === id;
    if (type === "upi_custom") return store.selected.type === "upi_custom" && store.selected.id === id;
    if (type === "card") return store.selected.type === "card" && store.selected.id === id;
    if (type === "pay_after") return store.selected.type === "pay_after";
    return false;
  };

  const handleAddUpi = async () => {
    if (!validateUpi(upiValue)) {
      setUpiError(t("paymentMethods.upiInvalid"));
      return;
    }
    setUpiError("");
    setUpiVerifying(true);
    // Mock verify
    await new Promise((r) => setTimeout(r, 1200));
    const id = `upi_${Date.now()}`;
    store.addUpi({ id, provider: "gpay", upiId: upiValue.trim() });
    store.select({ type: "upi_custom", id });
    setUpiValue("");
    setShowUpiInput(false);
    setUpiVerifying(false);
  };

  const handleAddCard = () => {
    const errors: Record<string, string> = {};
    const cleanNum = cardNum.replace(/\s/g, "");
    if (!luhnCheck(cleanNum)) errors.num = t("paymentMethods.cardInvalid");
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      errors.expiry = t("paymentMethods.expiryInvalid");
    } else {
      const [mm, yy] = cardExpiry.split("/").map(Number);
      if (mm < 1 || mm > 12) errors.expiry = t("paymentMethods.expiryInvalid");
      const now = new Date();
      const expDate = new Date(2000 + yy, mm);
      if (expDate <= now) errors.expiry = t("paymentMethods.expiryInvalid");
    }
    if (!cardName.trim()) errors.name = t("paymentMethods.nameRequired");
    if (Object.keys(errors).length) {
      setCardErrors(errors);
      return;
    }

    const brand = detectCardBrand(cleanNum);
    const last4 = cleanNum.slice(-4);
    const id = `card_${Date.now()}`;
    const card: SavedCard = { id, brand, last4, expiry: cardExpiry, name: cardName.trim() };
    store.addCard(card);
    store.select({ type: "card", id });
    setCardNum("");
    setCardExpiry("");
    setCardName("");
    setCardErrors({});
    setShowCardSheet(false);
  };

  const getSelectedLabel = (): string => {
    if (!store.selected) return "";
    switch (store.selected.type) {
      case "upi_provider": {
        const labels: Record<UpiProvider, string> = {
          gpay: t("paymentMethods.googlePay"),
          phonepe: t("paymentMethods.phonePe"),
          paytm: t("paymentMethods.paytm"),
          bhim: t("paymentMethods.bhim"),
        };
        return labels[store.selected.provider];
      }
      case "upi_custom": {
        const selectedId = store.selected && store.selected.type === "upi_custom" ? store.selected.id : "";
        const u = store.savedUpis.find((x) => x.id === selectedId);
        return u?.upiId ?? "UPI";
      }
      case "card": {
        const c = store.savedCards.find((x) => x.id === (store.selected as { id: string }).id);
        return c ? `${c.brand.toUpperCase()} •••• ${c.last4}` : "Card";
      }
      case "pay_after":
        return t("paymentMethods.payAfterService");
    }
  };

  return (
    <div
      className="bg-app-bg min-h-dvh w-full max-w-[430px] mx-auto"
      style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
    >
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
            {t("paymentMethods.title")}
          </h1>
        </div>
      </div>

      {/* Pay via UPI */}
      <div className="px-4 mt-2">
        <p className="text-[13px] font-medium text-ink mb-3">
          {t("paymentMethods.payViaUpi")}
        </p>
        <div
          className="bg-white rounded-[14px] overflow-hidden"
          style={{ border: "0.5px solid var(--surface-border)" }}
        >
          {UPI_PROVIDERS.map((p, i) => (
            <button
              key={p.key}
              type="button"
              onClick={() => store.select({ type: "upi_provider", provider: p.key })}
              className="w-full flex items-center gap-3 px-4 py-3.5 min-h-[48px]"
              style={
                i < UPI_PROVIDERS.length - 1
                  ? { borderBottom: "0.5px solid var(--surface-border)" }
                  : undefined
              }
              data-pressable=""
            >
              <div className="w-9 h-9 shrink-0 flex items-center justify-center">
                {p.logo}
              </div>
              <span className="text-[14px] font-medium text-ink flex-1 text-left">
                {t(`paymentMethods.${p.key === "gpay" ? "googlePay" : p.key === "phonepe" ? "phonePe" : p.key}`)}
              </span>
              <RadioDot active={isSelected("upi_provider", p.key)} />
            </button>
          ))}

          {/* Custom UPI IDs */}
          {store.savedUpis.map((upi) => (
            <div
              key={upi.id}
              className="flex items-center gap-3 px-4 py-3.5 min-h-[48px]"
              style={{ borderTop: "0.5px solid var(--surface-border)" }}
            >
              <button
                type="button"
                onClick={() => store.select({ type: "upi_custom", id: upi.id })}
                className="flex items-center gap-3 flex-1"
                data-pressable=""
              >
                <div
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[13px] font-semibold shrink-0"
                  style={{ backgroundColor: "var(--teal-soft)", color: "var(--teal-dark)" }}
                >
                  @
                </div>
                <span className="text-[14px] text-ink text-left">{upi.upiId}</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmRemove({ type: "upi", id: upi.id, label: upi.upiId })}
                className="w-8 h-8 flex items-center justify-center shrink-0"
                aria-label={t("paymentMethods.removeBtn")}
              >
                <IconX size={16} className="text-ink-muted" />
              </button>
              <RadioDot active={isSelected("upi_custom", upi.id)} />
            </div>
          ))}

          {/* Add new UPI */}
          <button
            type="button"
            onClick={() => setShowUpiInput(!showUpiInput)}
            className="w-full flex items-center gap-3 px-4 py-3.5 min-h-[48px]"
            style={{ borderTop: "0.5px solid var(--surface-border)" }}
            data-pressable=""
          >
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ border: "1px dashed var(--surface-border)" }}>
              <IconPlus size={16} className="text-ink-muted" />
            </div>
            <span className="text-[14px] font-medium" style={{ color: "var(--brand-rose)" }}>
              {t("paymentMethods.addNewUpi")}
            </span>
          </button>

          {showUpiInput && (
            <div className="px-4 py-3" style={{ borderTop: "0.5px solid var(--surface-border)" }}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={upiValue}
                  onChange={(e) => { setUpiValue(e.target.value); setUpiError(""); }}
                  placeholder={t("paymentMethods.upiPlaceholder")}
                  className="flex-1 h-11 px-3 rounded-[10px] bg-app-bg outline-none text-ink"
                  style={{ fontSize: "16px", border: `0.5px solid ${upiError ? "var(--brand-rose)" : "var(--surface-border)"}` }}
                />
                <button
                  type="button"
                  onClick={handleAddUpi}
                  disabled={upiVerifying || !upiValue.trim()}
                  className="h-11 px-4 rounded-[10px] text-[13px] font-medium text-white"
                  style={{ backgroundColor: upiVerifying || !upiValue.trim() ? "var(--surface-border)" : "var(--brand-rose)" }}
                >
                  {upiVerifying ? t("paymentMethods.verifying") : t("paymentMethods.addCardBtn")}
                </button>
              </div>
              {upiError && (
                <p className="text-[12px] mt-1" style={{ color: "var(--brand-rose)" }}>{upiError}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="px-4 mt-5">
        <p className="text-[13px] font-medium text-ink mb-3">
          {t("paymentMethods.cards")}
        </p>
        <div
          className="bg-white rounded-[14px] overflow-hidden"
          style={{ border: "0.5px solid var(--surface-border)" }}
        >
          {store.savedCards.map((card, i) => (
            <div
              key={card.id}
              className="flex items-center gap-3 px-4 py-3.5 min-h-[48px]"
              style={i > 0 ? { borderTop: "0.5px solid var(--surface-border)" } : undefined}
            >
              <button
                type="button"
                onClick={() => store.select({ type: "card", id: card.id })}
                className="flex items-center gap-3 flex-1"
                data-pressable=""
              >
                <div
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[11px] font-bold shrink-0 uppercase"
                  style={{ backgroundColor: "var(--teal-soft)", color: "var(--teal-dark)" }}
                >
                  {card.brand === "visa" ? "V" : card.brand === "mastercard" ? "MC" : card.brand === "amex" ? "AX" : card.brand === "rupay" ? "RP" : "?"}
                </div>
                <div className="text-left">
                  <p className="text-[14px] font-medium text-ink">
                    {card.brand.toUpperCase()} •••• {card.last4}
                  </p>
                  <p className="text-[12px] text-ink-muted">
                    {t("paymentMethods.expires")} {card.expiry}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setConfirmRemove({ type: "card", id: card.id, label: `${card.brand.toUpperCase()} •••• ${card.last4}` })}
                className="w-8 h-8 flex items-center justify-center shrink-0"
                aria-label={t("paymentMethods.removeBtn")}
              >
                <IconX size={16} className="text-ink-muted" />
              </button>
              <RadioDot active={isSelected("card", card.id)} />
            </div>
          ))}

          <button
            type="button"
            onClick={() => setShowCardSheet(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 min-h-[48px]"
            style={store.savedCards.length > 0 ? { borderTop: "0.5px solid var(--surface-border)" } : undefined}
            data-pressable=""
          >
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ border: "1px dashed var(--surface-border)" }}>
              <IconPlus size={16} className="text-ink-muted" />
            </div>
            <span className="text-[14px] font-medium" style={{ color: "var(--brand-rose)" }}>
              {t("paymentMethods.addCard")}
            </span>
          </button>
        </div>
      </div>

      {/* Pay after service */}
      <div className="px-4 mt-5">
        <p className="text-[13px] font-medium text-ink mb-3">
          {t("paymentMethods.payAfterService")}
        </p>
        <button
          type="button"
          onClick={() => store.select({ type: "pay_after" })}
          className="w-full bg-white rounded-[14px] flex items-center gap-3 px-4 py-3.5 min-h-[48px]"
          style={{ border: "0.5px solid var(--surface-border)" }}
          data-pressable=""
        >
          <div className="flex-1 text-left">
            <p className="text-[14px] font-medium text-ink">
              {t("paymentMethods.payAfterService")}
            </p>
            <p className="text-[12px] text-ink-muted">
              {t("paymentMethods.payAfterDesc")}
            </p>
          </div>
          <RadioDot active={isSelected("pay_after")} />
        </button>
      </div>

      {/* Bottom CTA */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white px-4 py-3 z-10"
        style={{ borderTop: "0.5px solid var(--surface-border)", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full h-12 rounded-[12px] text-[15px] font-medium text-white"
          style={{ backgroundColor: "var(--brand-rose)" }}
          data-pressable=""
        >
          {t("paymentMethods.useMethod", { method: getSelectedLabel() })}
        </button>
      </div>

      {/* Add Card Sheet */}
      {showCardSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCardSheet(false)} />
          <div
            className="relative w-full max-w-[430px] bg-white rounded-t-[20px] p-5"
            style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-medium text-ink">
                {t("paymentMethods.addCard")}
              </h3>
              <button
                type="button"
                onClick={() => setShowCardSheet(false)}
                className="w-8 h-8 flex items-center justify-center"
                aria-label={t("common.close")}
              >
                <IconX size={18} className="text-ink-muted" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cardNum}
                  onChange={(e) => {
                    // Format as groups of 4
                    const raw = e.target.value.replace(/\D/g, "").slice(0, 19);
                    setCardNum(raw.replace(/(.{4})/g, "$1 ").trim());
                    setCardErrors((prev) => ({ ...prev, num: "" }));
                  }}
                  placeholder={t("paymentMethods.cardNumber")}
                  className="w-full h-12 px-4 rounded-[12px] bg-app-bg outline-none text-ink"
                  style={{ fontSize: "16px", border: `0.5px solid ${cardErrors.num ? "var(--brand-rose)" : "var(--surface-border)"}` }}
                />
                {cardErrors.num && <p className="text-[12px] mt-1" style={{ color: "var(--brand-rose)" }}>{cardErrors.num}</p>}
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cardExpiry}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, "").slice(0, 4);
                      if (val.length >= 3) val = val.slice(0, 2) + "/" + val.slice(2);
                      setCardExpiry(val);
                      setCardErrors((prev) => ({ ...prev, expiry: "" }));
                    }}
                    placeholder={t("paymentMethods.expiry")}
                    className="w-full h-12 px-4 rounded-[12px] bg-app-bg outline-none text-ink"
                    style={{ fontSize: "16px", border: `0.5px solid ${cardErrors.expiry ? "var(--brand-rose)" : "var(--surface-border)"}` }}
                  />
                  {cardErrors.expiry && <p className="text-[12px] mt-1" style={{ color: "var(--brand-rose)" }}>{cardErrors.expiry}</p>}
                </div>
              </div>
              <div>
                <input
                  type="text"
                  value={cardName}
                  onChange={(e) => {
                    setCardName(e.target.value);
                    setCardErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  placeholder={t("paymentMethods.nameOnCard")}
                  className="w-full h-12 px-4 rounded-[12px] bg-app-bg outline-none text-ink"
                  style={{ fontSize: "16px", border: `0.5px solid ${cardErrors.name ? "var(--brand-rose)" : "var(--surface-border)"}` }}
                />
                {cardErrors.name && <p className="text-[12px] mt-1" style={{ color: "var(--brand-rose)" }}>{cardErrors.name}</p>}
              </div>

              {cardNum.replace(/\s/g, "").length >= 6 && (
                <p className="text-[12px] text-ink-muted">
                  {detectCardBrand(cardNum).toUpperCase()}
                </p>
              )}

              <button
                type="button"
                onClick={handleAddCard}
                className="w-full h-12 rounded-[12px] text-[15px] font-medium text-white mt-2"
                style={{ backgroundColor: "var(--brand-rose)" }}
                data-pressable=""
              >
                {t("paymentMethods.addCardBtn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm remove dialog */}
      {confirmRemove && (
        <ConfirmDialog
          title={t("paymentMethods.removeTitle")}
          message={t("paymentMethods.removeConfirm", { method: confirmRemove.label })}
          cancelLabel={t("paymentMethods.cancel")}
          confirmLabel={t("paymentMethods.removeBtn")}
          onCancel={() => setConfirmRemove(null)}
          onConfirm={() => {
            if (confirmRemove.type === "upi") store.removeUpi(confirmRemove.id);
            else store.removeCard(confirmRemove.id);
            setConfirmRemove(null);
          }}
        />
      )}
    </div>
  );
}
