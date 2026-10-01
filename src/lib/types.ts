// Booking states
export type BookingState =
  | "created"
  | "searching"
  | "assigned"
  | "en_route"
  | "arrived"
  | "in_progress"
  | "completed"
  | "rated"
  | "cancelled"
  | "no_show"
  | "refunded"
  | "disputed";

// Home sizes
export type HomeSize = "1bhk" | "2bhk" | "3bhk" | "4bhk";

// Service types
export type ServiceType = "minor_clean" | "major_clean";

// KYC status
export type KycStatus = "pending" | "submitted" | "approved" | "rejected";

export interface User {
  id: string;
  name: string;
  phone: string;
  role: "customer" | "helper" | "admin";
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  flat: string;
  tower: string;
  landmark: string;
  full_address: string;
  lat: number;
  lng: number;
}

export interface Service {
  id: string;
  type: ServiceType;
  name: string;
  description: string;
  icon: string;
  included: string[];
  not_included: string[];
}

export interface ServicePrice {
  id: string;
  service_id: string;
  home_size: HomeSize;
  base_minutes: number;
  price: number;
  extension_price: number;
  extension_minutes: number;
}

export interface Addon {
  id: string;
  name: string;
  icon: string;
  unit: string;
  price: number;
}

export interface Helper {
  id: string;
  name: string;
  phone: string;
  avatar_initial: string;
  kyc_status: KycStatus;
  online: boolean;
  lat: number;
  lng: number;
  rating: number;
  jobs_completed: number;
}

export interface Booking {
  id: string;
  state: BookingState;
  service: Service;
  service_price: ServicePrice;
  home_size: HomeSize;
  addons: Addon[];
  extensions: number;
  instant: boolean;
  scheduled_for: string | null;
  address: Address;
  helper: Helper | null;
  start_otp: string;
  end_otp: string;
  eta_minutes: number;
  distance_km: number;
  price_breakdown: PriceBreakdown;
  created_at: string;
}

export interface PriceBreakdown {
  base_price: number;
  addons_total: number;
  extensions_total: number;
  discount: number;
  total: number;
  items: PriceItem[];
}

export interface PriceItem {
  label: string;
  amount: number;
}

export interface Rating {
  id: string;
  booking_id: string;
  stars: number;
  comment: string;
  tip: number;
}

export interface TrackingStep {
  label: string;
  status: "completed" | "active" | "upcoming";
}

export interface Order {
  id: string;
  booking: Booking;
  completed_at: string | null;
  rated: boolean;
}
