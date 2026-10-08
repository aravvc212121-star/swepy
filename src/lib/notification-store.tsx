"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export type NotificationPrefs = {
  master: boolean;
  bookingUpdates: boolean;
  payments: boolean;
  reminders: boolean;
  offers: boolean;
  channels: {
    push: boolean;
    whatsapp: boolean;
    sms: boolean;
  };
};

const STORAGE_KEY = "swepy_notifications";

const SEED: NotificationPrefs = {
  master: true,
  bookingUpdates: true,
  payments: true,
  reminders: true,
  offers: false,
  channels: {
    push: true,
    whatsapp: true,
    sms: false,
  },
};

function loadPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...SEED, ...parsed, channels: { ...SEED.channels, ...parsed.channels } };
    }
  } catch { /* ignore */ }
  return SEED;
}

function savePrefs(prefs: NotificationPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch { /* quota */ }
}

export function getNotificationSummary(prefs: NotificationPrefs): { count: number; total: number } {
  if (!prefs.master) return { count: 0, total: 4 };
  const cats = [prefs.bookingUpdates, prefs.payments, prefs.reminders, prefs.offers];
  return { count: cats.filter(Boolean).length, total: 4 };
}

type NotifActions = {
  setMaster: (on: boolean) => void;
  toggleCategory: (key: "bookingUpdates" | "payments" | "reminders" | "offers") => void;
  toggleChannel: (key: "push" | "whatsapp" | "sms") => boolean; // returns false if would leave all off
  permissionState: NotificationPermission | "unsupported";
  requestPermission: () => Promise<NotificationPermission>;
};

const NotifContext = createContext<(NotificationPrefs & NotifActions) | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => loadPrefs());
  const [hydrated, setHydrated] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    setHydrated(true);
    if (typeof Notification !== "undefined") {
      setPermissionState(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (hydrated) savePrefs(prefs);
  }, [prefs, hydrated]);

  const setMaster = useCallback((on: boolean) => {
    setPrefs((prev) => ({ ...prev, master: on }));
  }, []);

  const toggleCategory = useCallback(
    (key: "bookingUpdates" | "payments" | "reminders" | "offers") => {
      setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    []
  );

  const toggleChannel = useCallback(
    (key: "push" | "whatsapp" | "sms"): boolean => {
      let allowed = true;
      setPrefs((prev) => {
        const newChannels = { ...prev.channels, [key]: !prev.channels[key] };
        // At least one must stay on
        const onCount = Object.values(newChannels).filter(Boolean).length;
        if (onCount === 0) {
          allowed = false;
          return prev;
        }
        return { ...prev, channels: newChannels };
      });
      return allowed;
    },
    []
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "denied" as NotificationPermission;
    const result = await Notification.requestPermission();
    setPermissionState(result);
    return result;
  }, []);

  return (
    <NotifContext.Provider
      value={{
        ...prefs,
        setMaster,
        toggleCategory,
        toggleChannel,
        permissionState,
        requestPermission,
      }}
    >
      {children}
    </NotifContext.Provider>
  );
}

export function useNotificationStore() {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error("useNotificationStore must be used within NotificationProvider");
  return ctx;
}
