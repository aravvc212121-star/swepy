import type {
  Service,
  ServicePrice,
  Addon,
  Helper,
  Address,
  User,
  Booking,
  Order,
} from "./types";

// ── Demo user ──
export const demoUser: User = {
  id: "u_001",
  name: "Priya",
  phone: "+919876543210",
  role: "customer",
  created_at: "2026-09-15T10:00:00+05:30",
};

// ── Address ──
export const demoAddress: Address = {
  id: "addr_001",
  user_id: "u_001",
  label: "Home",
  flat: "402",
  tower: "Tower B",
  landmark: "Near Central Park",
  full_address: "Tower B, 402, Prestige Lakeside Habitat, Whitefield, Bangalore 560066",
  lat: 12.9698,
  lng: 77.7500,
};

// ── Services ──
export const services: Service[] = [
  {
    id: "svc_minor",
    type: "minor_clean",
    name: "Minor clean",
    description: "Sweep, mop, dust, utensils",
    icon: "broom",
    included: [
      "Sweeping all rooms",
      "Mopping all floors",
      "Dusting surfaces",
      "Utensil washing",
    ],
    not_included: [
      "Washroom deep clean",
      "Kitchen deep clean",
      "Sofa cleaning",
      "Laundry",
      "Ironing",
    ],
  },
  {
    id: "svc_major",
    type: "major_clean",
    name: "Major clean",
    description: "Washrooms, kitchen, sofa and more",
    icon: "sparkles",
    included: [
      "Everything in Minor clean",
      "Washroom cleaning",
      "Kitchen deep clean",
      "Sofa vacuuming",
      "Balcony sweep",
      "Cobweb removal",
    ],
    not_included: ["Laundry", "Ironing", "Window exterior cleaning"],
  },
];

// ── Service prices ──
export const servicePrices: ServicePrice[] = [
  { id: "sp_01", service_id: "svc_minor", home_size: "1bhk", base_minutes: 45, price: 199, extension_price: 99, extension_minutes: 30 },
  { id: "sp_02", service_id: "svc_minor", home_size: "2bhk", base_minutes: 60, price: 249, extension_price: 99, extension_minutes: 30 },
  { id: "sp_03", service_id: "svc_minor", home_size: "3bhk", base_minutes: 90, price: 349, extension_price: 99, extension_minutes: 30 },
  { id: "sp_04", service_id: "svc_minor", home_size: "4bhk", base_minutes: 120, price: 449, extension_price: 99, extension_minutes: 30 },
  { id: "sp_05", service_id: "svc_major", home_size: "1bhk", base_minutes: 75, price: 399, extension_price: 149, extension_minutes: 30 },
  { id: "sp_06", service_id: "svc_major", home_size: "2bhk", base_minutes: 90, price: 499, extension_price: 149, extension_minutes: 30 },
  { id: "sp_07", service_id: "svc_major", home_size: "3bhk", base_minutes: 120, price: 649, extension_price: 149, extension_minutes: 30 },
  { id: "sp_08", service_id: "svc_major", home_size: "4bhk", base_minutes: 150, price: 799, extension_price: 149, extension_minutes: 30 },
];

// ── Add-ons ──
export const addons: Addon[] = [
  { id: "addon_washroom", name: "Washroom", icon: "bath", unit: "per washroom", price: 99 },
  { id: "addon_kitchen", name: "Kitchen", icon: "tools-kitchen-2", unit: "per kitchen", price: 149 },
  { id: "addon_laundry", name: "Laundry", icon: "hanger", unit: "per load", price: 199 },
  { id: "addon_ironing", name: "Ironing", icon: "ironing-1", unit: "per session", price: 149 },
  { id: "addon_sofa", name: "Sofa", icon: "armchair", unit: "per seat", price: 79 },
  { id: "addon_fridge", name: "Fridge cleaning", icon: "fridge", unit: "per fridge", price: 129 },
  { id: "addon_packing", name: "Packing / unpacking", icon: "packing", unit: "per session", price: 249 },
  { id: "addon_utensils", name: "Utensils", icon: "utensils", unit: "per session", price: 79 },
  { id: "addon_kitchen_prep", name: "Kitchen prep", icon: "kitchen-prep", unit: "per session", price: 149 },
  { id: "addon_dusting", name: "Dusting & wiping", icon: "dusting", unit: "per session", price: 99 },
  { id: "addon_sweeping", name: "Sweeping & mopping", icon: "sweeping", unit: "per session", price: 99 },
  { id: "addon_wardrobe", name: "Wardrobe cleaning", icon: "wardrobe", unit: "per wardrobe", price: 199 },
  { id: "addon_window", name: "Window cleaning", icon: "window", unit: "per session", price: 129 },
  { id: "addon_balcony", name: "Balcony cleaning", icon: "balcony", unit: "per balcony", price: 99 },
  { id: "addon_fan", name: "Fan cleaning", icon: "fan", unit: "per fan", price: 49 },
  { id: "addon_cabinet", name: "Cabinet cleaning", icon: "cabinet", unit: "per session", price: 129 },
  { id: "addon_plant", name: "Plant care", icon: "plant", unit: "per session", price: 79 },
  { id: "addon_party", name: "Party clean-up", icon: "party", unit: "per session", price: 299 },
];

// ── Demo helpers ──
export const demoHelpers: Helper[] = [
  { id: "h_001", name: "Sunita", phone: "+919800000001", avatar_initial: "S", kyc_status: "approved", online: true, lat: 12.9720, lng: 77.7480, rating: 4.8, jobs_completed: 234 },
  { id: "h_002", name: "Meena", phone: "+919800000002", avatar_initial: "M", kyc_status: "approved", online: true, lat: 12.9680, lng: 77.7520, rating: 4.9, jobs_completed: 189 },
  { id: "h_003", name: "Rekha", phone: "+919800000003", avatar_initial: "R", kyc_status: "approved", online: true, lat: 12.9710, lng: 77.7460, rating: 4.7, jobs_completed: 156 },
  { id: "h_004", name: "Lakshmi", phone: "+919800000004", avatar_initial: "L", kyc_status: "approved", online: true, lat: 12.9650, lng: 77.7550, rating: 4.6, jobs_completed: 312 },
  { id: "h_005", name: "Anita", phone: "+919800000005", avatar_initial: "A", kyc_status: "approved", online: true, lat: 12.9740, lng: 77.7440, rating: 4.8, jobs_completed: 98 },
  { id: "h_006", name: "Kavita", phone: "+919800000006", avatar_initial: "K", kyc_status: "approved", online: false, lat: 12.9660, lng: 77.7510, rating: 4.5, jobs_completed: 267 },
  { id: "h_007", name: "Deepa", phone: "+919800000007", avatar_initial: "D", kyc_status: "submitted", online: false, lat: 12.9700, lng: 77.7490, rating: 0, jobs_completed: 0 },
  { id: "h_008", name: "Pooja", phone: "+919800000008", avatar_initial: "P", kyc_status: "approved", online: true, lat: 12.9730, lng: 77.7470, rating: 4.9, jobs_completed: 445 },
  { id: "h_009", name: "Geeta", phone: "+919800000009", avatar_initial: "G", kyc_status: "approved", online: true, lat: 12.9690, lng: 77.7530, rating: 4.7, jobs_completed: 178 },
  { id: "h_010", name: "Rani", phone: "+919800000010", avatar_initial: "R", kyc_status: "pending", online: false, lat: 12.9670, lng: 77.7500, rating: 0, jobs_completed: 0 },
];

// ── Demo booking (en_route state for booked page) ──
export const demoBooking: Booking = {
  id: "bk_20261001_001",
  state: "en_route",
  service: services[0],
  service_price: servicePrices[1], // Minor clean, 2 BHK
  home_size: "2bhk",
  addons: [addons[0]], // Washroom add-on
  extensions: 0,
  instant: true,
  scheduled_for: null,
  address: demoAddress,
  helper: demoHelpers[0], // Sunita
  start_otp: "4829",
  end_otp: "7153",
  eta_minutes: 8,
  distance_km: 1.2,
  price_breakdown: {
    base_price: 249,
    addons_total: 99,
    extensions_total: 0,
    discount: 0,
    total: 348,
    items: [
      { label: "Minor clean · 2 BHK · 60 min", amount: 249 },
      { label: "Washroom × 1", amount: 99 },
    ],
  },
  created_at: "2026-10-01T12:30:00+05:30",
};

// ── Demo orders ──
export const demoOrders: Order[] = [
  {
    id: "ord_001",
    booking: {
      ...demoBooking,
      id: "bk_20260928_001",
      state: "completed",
      helper: demoHelpers[1],
      eta_minutes: 0,
      created_at: "2026-09-28T14:00:00+05:30",
    },
    completed_at: "2026-09-28T15:15:00+05:30",
    rated: true,
  },
  {
    id: "ord_002",
    booking: {
      ...demoBooking,
      id: "bk_20260925_001",
      state: "rated",
      service: services[1],
      service_price: servicePrices[5],
      home_size: "2bhk",
      helper: demoHelpers[7],
      addons: [],
      eta_minutes: 0,
      price_breakdown: {
        base_price: 499,
        addons_total: 0,
        extensions_total: 0,
        discount: 50,
        total: 449,
        items: [
          { label: "Major clean · 2 BHK · 90 min", amount: 499 },
          { label: "New user discount", amount: -50 },
        ],
      },
      created_at: "2026-09-25T10:00:00+05:30",
    },
    completed_at: "2026-09-25T11:40:00+05:30",
    rated: true,
  },
];

// ── FAQ data ──
export const faqData = [
  {
    question: "How quickly can a helper arrive?",
    answer: "We show a live ETA based on the nearest available helper. In most areas, a helper can arrive in about 10 minutes. If no one is close, we will show you the real ETA or let you schedule for later.",
  },
  {
    question: "How is pricing decided?",
    answer: "Pricing depends on the service type and your home size (BHK). You can see the exact price before booking. Add-ons like washroom or kitchen cleaning are priced separately.",
  },
  {
    question: "What if I need to cancel?",
    answer: "You can cancel for free before a helper is assigned. A small cancellation fee applies once the helper is en route.",
  },
  {
    question: "Are helpers verified?",
    answer: "Yes. Every helper goes through ID verification and background checks before they can accept jobs on Swepy.",
  },
  {
    question: "What is the OTP for?",
    answer: "The start OTP confirms that the right helper has arrived. The end OTP confirms the job is done. This keeps both you and the helper safe.",
  },
  {
    question: "Can I book for someone else?",
    answer: "Yes. After booking, you can share the booking details via WhatsApp with whoever is at home.",
  },
];

// ── Services included grid (18 items) ──
// Data-driven: will come from the services table in M2+
export interface ServiceGridItem {
  slug: string;
  name: string;
  image: string | null; // /services/{slug}.jpg or null for placeholder
  route: string;
  sortOrder: number;
  active: boolean;
  iconFallback: string; // Tabler icon name for placeholder tile
}

export const servicesGrid: ServiceGridItem[] = [
  { slug: "hourly-bookings", name: "Hourly bookings", image: "/services/hourly-bookings.jpg", route: "/service/hourly-bookings?pricing_mode=hourly", sortOrder: 1, active: true, iconFallback: "clock" },
  { slug: "bathroom-cleaning", name: "Bathroom cleaning", image: "/services/bathroom-cleaning.jpg", route: "/service/bathroom-cleaning", sortOrder: 2, active: true, iconFallback: "bath" },
  { slug: "fridge-cleaning", name: "Fridge cleaning", image: "/services/fridge-cleaning.jpg", route: "/service/fridge-cleaning", sortOrder: 3, active: true, iconFallback: "kitchen" },
  { slug: "packing-unpacking", name: "Packing or unpacking", image: "/services/packing-unpacking.jpg", route: "/service/packing-unpacking", sortOrder: 4, active: true, iconFallback: "hanger" },
  { slug: "utensils", name: "Utensils", image: "/services/utensils.jpg", route: "/service/utensils", sortOrder: 5, active: true, iconFallback: "sparkles" },
  { slug: "kitchen-prep", name: "Kitchen prep", image: "/services/kitchen-prep.jpg", route: "/service/kitchen-prep", sortOrder: 6, active: true, iconFallback: "kitchen" },
  { slug: "dusting-wiping", name: "Dusting and wiping", image: "/services/dusting-and-wiping.jpg", route: "/service/dusting-wiping", sortOrder: 7, active: true, iconFallback: "broom" },
  { slug: "sweeping-mopping", name: "Sweeping and mopping", image: "/services/sweeping-and-mopping.jpg", route: "/service/sweeping-mopping", sortOrder: 8, active: true, iconFallback: "broom" },
  { slug: "pre-party-clean", name: "Pre-party express clean", image: "/services/pre-party-clean.jpg", route: "/service/pre-party-clean", sortOrder: 9, active: true, iconFallback: "sparkles" },
  { slug: "wardrobe-cleaning", name: "Complete wardrobe cleaning", image: "/services/wardrobe-cleaning.jpg", route: "/service/wardrobe-cleaning", sortOrder: 10, active: true, iconFallback: "hanger" },
  { slug: "after-party-clean", name: "After-party express clean", image: "/services/after-party-clean.jpg", route: "/service/after-party-clean", sortOrder: 11, active: true, iconFallback: "sparkles" },
  { slug: "ironing-folding", name: "Ironing and folding", image: "/services/ironing-and-folding.jpg", route: "/service/ironing-folding", sortOrder: 12, active: true, iconFallback: "ironing" },
  { slug: "window-cleaning", name: "Window cleaning", image: "/services/window-cleaning.jpg", route: "/service/window-cleaning", sortOrder: 13, active: true, iconFallback: "search" },
  { slug: "kitchen-cleaning", name: "Kitchen cleaning", image: "/services/kitchen-cleaning.jpg", route: "/service/kitchen-cleaning", sortOrder: 14, active: true, iconFallback: "kitchen" },
  { slug: "balcony-cleaning", name: "Balcony cleaning", image: "/services/window-cleaning.jpg", route: "/service/balcony-cleaning", sortOrder: 15, active: true, iconFallback: "broom" },
  { slug: "fan-cleaning", name: "Fan cleaning", image: "/services/dusting-and-wiping.jpg", route: "/service/fan-cleaning", sortOrder: 16, active: true, iconFallback: "refresh" },
  { slug: "kitchen-cabinet", name: "Kitchen cabinet cleaning", image: "/services/kitchen-cleaning.jpg", route: "/service/kitchen-cabinet", sortOrder: 17, active: true, iconFallback: "kitchen" },
  { slug: "plant-care", name: "Plant care", image: "/services/sweeping-and-mopping.jpg", route: "/service/plant-care", sortOrder: 18, active: true, iconFallback: "map" },
];

