"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type {
  HelperProfile, KycStatus, IdType, Language, Experience,
  Skill, ShiftSlot, Gender, EmergencyContact, PayoutAccount,
  HelperAddress, KycDocument, HelperJob, HelperEarnings, HelperRatings,
} from "./helper-types";
import { HELPER_CONFIG } from "./helper-types";

const STORAGE_KEY = "swepy_helper";

const EMPTY_PROFILE: HelperProfile = {
  id: "hlp_demo",
  full_name: "",
  date_of_birth: "",
  gender: undefined,
  languages: [],
  experience: "new",
  skills: [],
  kyc_status: "draft",
  id_type: undefined,
  documents: [],
  current_address: undefined,
  permanent_address: undefined,
  same_as_current: true,
  service_radius_km: 5,
  face_verified: false,
  min_daily_amount: HELPER_CONFIG.min_daily_default,
  preferred_shifts: [],
  days_per_week: 6,
  emergency_contact: undefined,
  payout_account: undefined,
  police_verification: null,
  consents: { code_of_conduct: false, background_check: false, privacy_policy: false, face_data: false },
  avatar_initial: "S",
  onboarding_step: 0,
};

// ── Mock data ──
const MOCK_JOBS: HelperJob[] = [
  {
    id: "job_001", status: "request", service_name: "Minor clean", home_size: "2 BHK",
    duration_min: 90, addons: ["Utensils"], address_short: "Tower B, Sunrise Heights, Sector 18",
    distance_km: 1.2, eta_min: 8, customer_first_name: "Priya", payout: 180,
    created_at: new Date().toISOString(),
  },
  {
    id: "job_002", status: "completed", service_name: "Major clean", home_size: "3 BHK",
    duration_min: 180, addons: [], address_short: "Flat 201, Green Park",
    distance_km: 2.5, eta_min: 12, customer_first_name: "Rahul", payout: 350, tip: 50, rating: 5,
    feedback: "Very thorough cleaning, left the house spotless",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    completed_at: new Date(Date.now() - 82800000).toISOString(),
  },
  {
    id: "job_003", status: "completed", service_name: "Bathroom clean", home_size: "1 BHK",
    duration_min: 60, addons: [], address_short: "House 12, MG Road",
    distance_km: 0.8, eta_min: 5, customer_first_name: "Anil", payout: 120, rating: 4,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    completed_at: new Date(Date.now() - 169200000).toISOString(),
  },
  {
    id: "job_004", status: "completed", service_name: "Kitchen clean", home_size: "2 BHK",
    duration_min: 75, addons: ["Utensils"], address_short: "Apt 5B, Silver Oaks",
    distance_km: 3.1, eta_min: 15, customer_first_name: "Meera", payout: 200, tip: 30, rating: 5,
    feedback: "Great work, very punctual",
    created_at: new Date(Date.now() - 259200000).toISOString(),
    completed_at: new Date(Date.now() - 255600000).toISOString(),
  },
];

const MOCK_EARNINGS: HelperEarnings = {
  total_7_days: 1520,
  jobs_count: 8,
  tips_total: 130,
  guarantee_amount: 800,
  guarantee_earned: 520,
  daily_earnings: [
    { day: "Mon", amount: 350 }, { day: "Tue", amount: 200 }, { day: "Wed", amount: 180 },
    { day: "Thu", amount: 290 }, { day: "Fri", amount: 0 }, { day: "Sat", amount: 320 },
    { day: "Sun", amount: 180 },
  ],
  next_payout_date: "2026-10-10",
  next_payout_amount: 1520,
};

const MOCK_RATINGS: HelperRatings = {
  average: 4.7,
  total_count: 42,
  distribution: [1, 1, 3, 8, 29],
  on_time_pct: 94,
  acceptance_pct: 88,
  completion_pct: 97,
  recent_feedback: [
    { customer_first_name: "Priya", rating: 5, comment: "Very thorough cleaning", date: "2026-10-04" },
    { customer_first_name: "Rahul", rating: 5, comment: "Great work, very punctual", date: "2026-10-03" },
    { customer_first_name: "Meera", rating: 4, comment: "Good but could improve dusting", date: "2026-10-02" },
    { customer_first_name: "Anil", rating: 4, date: "2026-10-01" },
  ],
};

// ── Context ──
type HelperStore = {
  profile: HelperProfile;
  jobs: HelperJob[];
  earnings: HelperEarnings;
  ratings: HelperRatings;
  isOnline: boolean;
  updateProfile: (patch: Partial<HelperProfile>) => void;
  setOnline: (v: boolean) => void;
  acceptJob: (id: string) => void;
  declineJob: (id: string) => void;
};

const HelperContext = createContext<HelperStore | null>(null);

function loadProfile(): HelperProfile {
  if (typeof window === "undefined") return EMPTY_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id) return { ...EMPTY_PROFILE, ...parsed };
    }
  } catch { /* ignore */ }
  return EMPTY_PROFILE;
}

function saveProfile(p: HelperProfile) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function HelperProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<HelperProfile>(() => loadProfile());
  const [isOnline, setIsOnline] = useState(false);
  const [jobs] = useState<HelperJob[]>(MOCK_JOBS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => { if (hydrated) saveProfile(profile); }, [profile, hydrated]);

  const updateProfile = useCallback((patch: Partial<HelperProfile>) => {
    setProfile(p => {
      const next = { ...p, ...patch };
      if (next.full_name) next.avatar_initial = next.full_name.charAt(0).toUpperCase();
      return next;
    });
  }, []);

  const setOnline = useCallback((v: boolean) => {
    setIsOnline(v);
  }, []);

  const acceptJob = useCallback((id: string) => {
    // Mock: mark job as accepted
  }, []);

  const declineJob = useCallback((id: string) => {
    // Mock: remove job
  }, []);

  return (
    <HelperContext.Provider value={{ profile, jobs, earnings: MOCK_EARNINGS, ratings: MOCK_RATINGS, isOnline, updateProfile, setOnline, acceptJob, declineJob }}>
      {children}
    </HelperContext.Provider>
  );
}

export function useHelper() {
  const ctx = useContext(HelperContext);
  if (!ctx) throw new Error("useHelper must be inside HelperProvider");
  return ctx;
}
