"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export type ProfileData = {
  name: string;
  phone: string;
  email: string;
  avatar: string | null; // data URL or null
};

const STORAGE_KEY = "swepy_profile";

const SEED: ProfileData = {
  name: "Priya",
  phone: "+919876543210",
  email: "",
  avatar: null,
};

function loadProfile(): ProfileData {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...SEED, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return SEED;
}

function saveProfile(data: ProfileData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded */ }
}

type ProfileContextValue = ProfileData & {
  updateProfile: (patch: Partial<ProfileData>) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ProfileData>(() => loadProfile());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveProfile(data);
  }, [data, hydrated]);

  const updateProfile = useCallback((patch: Partial<ProfileData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  return (
    <ProfileContext.Provider value={{ ...data, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfileStore() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfileStore must be used within ProfileProvider");
  return ctx;
}
