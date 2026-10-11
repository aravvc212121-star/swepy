import type { HomeSize } from "./types";

export interface OrderDraft {
  serviceId: string;
  serviceName: string;
  homeSize: HomeSize;
  extensions: number;
  addonIds: string[];
  addonNames: string[];
  basePrice: number;
  addonsTotal: number;
  extensionsTotal: number;
  totalPrice: number;
  notes?: string;
  updatedAt?: number;
}

const STORAGE_KEY = "swepy_order_draft";

export const DEFAULT_ORDER_DRAFT: OrderDraft = {
  serviceId: "svc_minor",
  serviceName: "Minor clean",
  homeSize: "2bhk",
  extensions: 0,
  addonIds: [],
  addonNames: [],
  basePrice: 249,
  addonsTotal: 0,
  extensionsTotal: 0,
  totalPrice: 249,
  notes: "",
};

export function saveOrderDraft(draft: Partial<OrderDraft>): void {
  if (typeof window === "undefined") return;
  try {
    const current = getOrderDraft();
    const merged = { ...current, ...draft, updatedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch { /* ignore */ }
}

export function getOrderDraft(): OrderDraft {
  if (typeof window === "undefined") return DEFAULT_ORDER_DRAFT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_ORDER_DRAFT, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_ORDER_DRAFT;
}
