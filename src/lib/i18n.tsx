"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import en from "@/data/i18n/en.json";
import hi from "@/data/i18n/hi.json";

export type Locale = "en" | "hi";

const dictionaries: Record<Locale, Record<string, string>> = {
  en: flatten(en),
  hi: flatten(hi),
};

/** Flatten nested JSON into dot-separated keys: { nav: { home: "Home" } } → { "nav.home": "Home" } */
function flatten(
  obj: Record<string, unknown>,
  prefix = ""
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      Object.assign(result, flatten(val as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = String(val);
    }
  }
  return result;
}

const STORAGE_KEY = "swepy_locale";

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (dateStr: string) => string;
  formatNumber: (n: number) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getIntlLocale(locale: Locale): string {
  return locale === "hi" ? "hi-IN" : "en-IN";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return "en";
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored === "en" || stored === "hi") {
        document.documentElement.lang = stored;
        return stored;
      }
    } catch { /* ignore */ }
    return "en";
  });

  // Hydrate from localStorage
  useEffect(() => {
    // Only needed for hydration sync if required, otherwise can be removed.
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    document.documentElement.lang = l;
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      let str =
        dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replaceAll(`{{${k}}}`, String(v));
        }
      }
      return str;
    },
    [locale]
  );

  const formatCurrency = useCallback(
    (amount: number) =>
      new Intl.NumberFormat(getIntlLocale(locale), {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount),
    [locale]
  );

  const formatDate = useCallback(
    (dateStr: string) =>
      new Date(dateStr).toLocaleDateString(getIntlLocale(locale), {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    [locale]
  );

  const formatNumber = useCallback(
    (n: number) =>
      new Intl.NumberFormat(getIntlLocale(locale)).format(n),
    [locale]
  );

  return (
    <I18nContext.Provider
      value={{ locale, setLocale, t, formatCurrency, formatDate, formatNumber }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
