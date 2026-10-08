"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

// ── Types ──
export type UpiProvider = "gpay" | "phonepe" | "paytm" | "bhim";

export type SavedUpi = {
  id: string;
  provider: UpiProvider;
  upiId: string;
};

export type SavedCard = {
  id: string;
  brand: "visa" | "mastercard" | "rupay" | "amex" | "unknown";
  last4: string;
  expiry: string; // MM/YY
  name: string;
};

export type PaymentMethodSelection =
  | { type: "upi_provider"; provider: UpiProvider }
  | { type: "upi_custom"; id: string }
  | { type: "card"; id: string }
  | { type: "pay_after" };

export type PaymentState = {
  savedUpis: SavedUpi[];
  savedCards: SavedCard[];
  selected: PaymentMethodSelection | null;
};

const STORAGE_KEY = "swepy_payment";

const SEED: PaymentState = {
  savedUpis: [],
  savedCards: [],
  selected: { type: "upi_provider", provider: "gpay" },
};

function loadState(): PaymentState {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...SEED, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return SEED;
}

function saveState(state: PaymentState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* quota */ }
}

// ── Luhn check ──
export function luhnCheck(num: string): boolean {
  const digits = num.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

// ── Card brand detection ──
export function detectCardBrand(num: string): SavedCard["brand"] {
  const d = num.replace(/\D/g, "");
  if (/^4/.test(d)) return "visa";
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return "mastercard";
  if (/^3[47]/.test(d)) return "amex";
  if (/^(60|65|81|82|508)/.test(d) || /^353800/.test(d)) return "rupay";
  return "unknown";
}

// ── UPI validation ──
export function validateUpi(upiId: string): boolean {
  return /^[\w.\-]+@[\w]+$/.test(upiId);
}

// ── Readable method label ──
export function getMethodLabel(
  state: PaymentState,
  sel: PaymentMethodSelection | null
): string {
  if (!sel) return "UPI, cards";
  switch (sel.type) {
    case "upi_provider": {
      const labels: Record<UpiProvider, string> = {
        gpay: "Google Pay",
        phonepe: "PhonePe",
        paytm: "Paytm",
        bhim: "BHIM",
      };
      return `UPI · ${labels[sel.provider]}`;
    }
    case "upi_custom": {
      const found = state.savedUpis.find((u) => u.id === sel.id);
      return found ? `UPI · ${found.upiId}` : "UPI";
    }
    case "card": {
      const card = state.savedCards.find((c) => c.id === sel.id);
      return card ? `${card.brand.toUpperCase()} •••• ${card.last4}` : "Card";
    }
    case "pay_after":
      return "Pay after service";
  }
}

// ── Context ──
type PaymentActions = {
  select: (sel: PaymentMethodSelection) => void;
  addUpi: (upi: SavedUpi) => void;
  removeUpi: (id: string) => void;
  addCard: (card: SavedCard) => void;
  removeCard: (id: string) => void;
};

const PaymentContext = createContext<(PaymentState & PaymentActions) | null>(null);

export function PaymentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PaymentState>(() => loadState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  const select = useCallback((sel: PaymentMethodSelection) => {
    setState((prev) => ({ ...prev, selected: sel }));
  }, []);

  const addUpi = useCallback((upi: SavedUpi) => {
    setState((prev) => ({ ...prev, savedUpis: [...prev.savedUpis, upi] }));
  }, []);

  const removeUpi = useCallback((id: string) => {
    setState((prev) => {
      const newUpis = prev.savedUpis.filter((u) => u.id !== id);
      let newSel = prev.selected;
      if (newSel?.type === "upi_custom" && newSel.id === id) {
        newSel = { type: "upi_provider", provider: "gpay" };
      }
      return { ...prev, savedUpis: newUpis, selected: newSel };
    });
  }, []);

  const addCard = useCallback((card: SavedCard) => {
    setState((prev) => ({ ...prev, savedCards: [...prev.savedCards, card] }));
  }, []);

  const removeCard = useCallback((id: string) => {
    setState((prev) => {
      const newCards = prev.savedCards.filter((c) => c.id !== id);
      let newSel = prev.selected;
      if (newSel?.type === "card" && newSel.id === id) {
        newSel = { type: "upi_provider", provider: "gpay" };
      }
      return { ...prev, savedCards: newCards, selected: newSel };
    });
  }, []);

  return (
    <PaymentContext.Provider
      value={{ ...state, select, addUpi, removeUpi, addCard, removeCard }}
    >
      {children}
    </PaymentContext.Provider>
  );
}

export function usePaymentStore() {
  const ctx = useContext(PaymentContext);
  if (!ctx) throw new Error("usePaymentStore must be used within PaymentProvider");
  return ctx;
}
