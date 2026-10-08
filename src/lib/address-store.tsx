"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

// ── Data model ──
export type Address = {
  id: string;
  label: string;
  type: "home" | "work" | "other";
  line: string;
  lat?: number;
  lng?: number;
};

type AddressState = {
  addresses: Address[];
  currentId: string;
};

type AddressActions = {
  selectAddress: (id: string) => void;
  addAddress: (address: Address) => void;
  updateAddress: (id: string, patch: Partial<Omit<Address, "id">>) => void;
  deleteAddress: (id: string) => void;
  currentAddress: Address | undefined;
};

const STORAGE_KEY = "swepy_addresses";

const SEED: AddressState = {
  addresses: [
    { id: "addr_1", label: "Home", type: "home", line: "Tower B 402, Sunrise Heights, Sector 18", lat: 28.57, lng: 77.32 },
    { id: "addr_2", label: "Work", type: "work", line: "4th floor, Orbit Tech Park, Sector 62", lat: 28.62, lng: 77.37 },
    { id: "addr_3", label: "Mom's place", type: "other", line: "House 27, Green Avenue, Block C", lat: 28.53, lng: 77.29 },
  ],
  currentId: "addr_1",
};

function loadState(): AddressState {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AddressState;
      if (parsed.addresses?.length) return parsed;
    }
  } catch { /* ignore */ }
  return SEED;
}

function saveState(state: AddressState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* quota exceeded, ignore */ }
}

// ── Context ──
const AddressContext = createContext<(AddressState & AddressActions) | null>(null);

export function AddressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AddressState>(() => loadState());
  const [hydrated, setHydrated] = useState(false);

  // Set hydrated to true on mount to allow client-side-only rendering logic
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Persist on change (skip initial mount)
  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  const selectAddress = useCallback((id: string) => {
    setState((prev) => {
      if (!prev.addresses.find((a) => a.id === id)) return prev;
      return { ...prev, currentId: id };
    });
  }, []);

  const addAddress = useCallback((address: Address) => {
    setState((prev) => ({
      addresses: [...prev.addresses, address],
      currentId: prev.currentId,
    }));
  }, []);

  const updateAddress = useCallback((id: string, patch: Partial<Omit<Address, "id">>) => {
    setState((prev) => ({
      ...prev,
      addresses: prev.addresses.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  }, []);

  const deleteAddress = useCallback((id: string) => {
    setState((prev) => {
      const remaining = prev.addresses.filter((a) => a.id !== id);
      let newCurrentId = prev.currentId;
      if (id === prev.currentId) {
        newCurrentId = remaining.length > 0 ? remaining[0].id : "";
      }
      return { addresses: remaining, currentId: newCurrentId };
    });
  }, []);

  const currentAddress = state.addresses.find((a) => a.id === state.currentId);

  return (
    <AddressContext.Provider
      value={{
        ...state,
        selectAddress,
        addAddress,
        updateAddress,
        deleteAddress,
        currentAddress,
      }}
    >
      {children}
    </AddressContext.Provider>
  );
}

export function useAddressStore() {
  const ctx = useContext(AddressContext);
  if (!ctx) throw new Error("useAddressStore must be used within AddressProvider");
  return ctx;
}
