"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const STORAGE_KEY = "swepy_diwali_decor";

type DiwaliPreference = {
  /** true = show Diwali decorations, false = normal interface */
  enabled: boolean;
  toggleDecor: () => void;
};

const DiwaliPreferenceCtx = createContext<DiwaliPreference>({
  enabled: true,
  toggleDecor: () => {},
});

export function DiwaliPreferenceProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(true);

  /* Hydrate from localStorage once on mount */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setEnabled(stored === "true");
      }
    } catch {
      /* SSR / private browsing — ignore */
    }
  }, []);

  const toggleDecor = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <DiwaliPreferenceCtx.Provider value={{ enabled, toggleDecor }}>
      {children}
    </DiwaliPreferenceCtx.Provider>
  );
}

export function useDiwaliPreference() {
  return useContext(DiwaliPreferenceCtx);
}
