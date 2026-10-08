/* ── Helper-specific types ── */

export type KycStatus = "draft" | "submitted" | "in_review" | "needs_info" | "approved" | "rejected";

export type IdType = "pan" | "aadhaar" | "driving_licence";
export type DocType = IdType | "police_certificate" | "selfie";
export type DocStatus = "pending" | "verified" | "rejected";

export type ShiftSlot = "morning" | "afternoon" | "evening";
export type Gender = "male" | "female" | "other";
export type Experience = "new" | "1_2_years" | "3_5_years" | "5_plus";

export const SKILLS = [
  "sweeping_mopping",
  "utensils",
  "dusting",
  "washrooms",
  "kitchen",
  "laundry",
  "ironing",
  "sofa",
] as const;
export type Skill = (typeof SKILLS)[number];

export const LANGUAGES = ["english", "hindi", "kannada", "tamil", "telugu", "malayalam", "marathi", "bengali"] as const;
export type Language = (typeof LANGUAGES)[number];

export interface KycDocument {
  type: DocType;
  status: DocStatus;
  id_number_hash?: string;
  last4?: string;  // Aadhaar only
  front_key?: string;
  back_key?: string;
  failure_reason?: string;
  verified_at?: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface PayoutAccount {
  method: "upi" | "bank";
  upi_id?: string;
  account_number?: string;
  ifsc?: string;
  account_name?: string;
  verified: boolean;
}

export interface HelperAddress {
  house_flat: string;
  street: string;
  locality: string;
  pincode: string;
  city: string;
  lat?: number;
  lng?: number;
}

export interface HelperProfile {
  id: string;
  full_name: string;
  date_of_birth: string;
  gender?: Gender;
  languages: Language[];
  experience: Experience;
  skills: Skill[];
  kyc_status: KycStatus;
  id_type?: IdType;
  documents: KycDocument[];
  current_address?: HelperAddress;
  permanent_address?: HelperAddress;
  same_as_current: boolean;
  service_radius_km: number;
  face_verified: boolean;
  min_daily_amount: number;
  preferred_shifts: ShiftSlot[];
  days_per_week: number;
  emergency_contact?: EmergencyContact;
  payout_account?: PayoutAccount;
  police_verification: "has_certificate" | "verify_for_me" | null;
  consents: {
    code_of_conduct: boolean;
    background_check: boolean;
    privacy_policy: boolean;
    face_data: boolean;
  };
  avatar_initial: string;
  onboarding_step: number;  // last completed step (0 = none)
}

export interface HelperJob {
  id: string;
  status: "request" | "accepted" | "active" | "completed" | "cancelled";
  service_name: string;
  home_size: string;
  duration_min: number;
  addons: string[];
  address_short: string;
  distance_km: number;
  eta_min: number;
  customer_first_name: string;
  payout: number;
  tip?: number;
  rating?: number;
  feedback?: string;
  created_at: string;
  completed_at?: string;
  active_step?: number;
  start_otp?: string;
  end_otp?: string;
}

export interface HelperEarnings {
  total_7_days: number;
  jobs_count: number;
  tips_total: number;
  guarantee_amount: number;
  guarantee_earned: number;
  daily_earnings: { day: string; amount: number }[];
  next_payout_date: string;
  next_payout_amount: number;
}

export interface HelperRatings {
  average: number;
  total_count: number;
  distribution: number[];  // [1-star, 2-star, 3-star, 4-star, 5-star]
  on_time_pct: number;
  acceptance_pct: number;
  completion_pct: number;
  recent_feedback: { customer_first_name: string; rating: number; comment?: string; date: string }[];
}

export const SKILL_LABELS: Record<Skill, string> = {
  sweeping_mopping: "Sweeping and mopping",
  utensils: "Utensils",
  dusting: "Dusting",
  washrooms: "Washrooms",
  kitchen: "Kitchen",
  laundry: "Laundry",
  ironing: "Ironing",
  sofa: "Sofa",
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  english: "English",
  hindi: "हिन्दी",
  kannada: "ಕನ್ನಡ",
  tamil: "தமிழ்",
  telugu: "తెలుగు",
  malayalam: "മലയാളം",
  marathi: "मराठी",
  bengali: "বাংলা",
};

export const EXPERIENCE_LABELS: Record<Experience, string> = {
  new: "New",
  "1_2_years": "1–2 years",
  "3_5_years": "3–5 years",
  "5_plus": "5+ years",
};

export const SHIFT_LABELS: Record<ShiftSlot, string> = {
  morning: "Morning (7–12)",
  afternoon: "Afternoon (12–5)",
  evening: "Evening (5–9)",
};

export const HELPER_CONFIG = {
  min_daily_min: 400,
  min_daily_max: 2000,
  min_daily_step: 50,
  min_daily_default: 800,
  min_daily_range_display: "₹700 – ₹1,000",
};
