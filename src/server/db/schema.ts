import { pgTable, text, timestamp, boolean, integer, numeric, jsonb, doublePrecision, index, uniqueIndex } from "drizzle-orm/pg-core";

export const cities = pgTable("cities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  state: text("state").notNull(),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  role: text("role").notNull(), // 'customer', 'helper', 'admin'
  phone_e164: text("phone_e164").notNull().unique(),
  phone_verified_at: timestamp("phone_verified_at", { withTimezone: true }),
  email: text("email").unique(),
  email_verified_at: timestamp("email_verified_at", { withTimezone: true }),
  full_name: text("full_name").notNull().default(""),
  avatar_url: text("avatar_url"),
  language: text("language").notNull().default("en"),
  status: text("status").notNull().default("active"),
  last_login_at: timestamp("last_login_at", { withTimezone: true }),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => users.id),
  token_hash: text("token_hash").notNull().unique(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  last_seen_at: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  revoked_at: timestamp("revoked_at", { withTimezone: true }),
  ip: text("ip"),
  user_agent: text("user_agent"),
  device_id: text("device_id"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("idx_sessions_user_id").on(table.user_id),
    expiresAtIdx: index("idx_sessions_expires_at").on(table.expires_at),
  };
});

export const otp_challenges = pgTable("otp_challenges", {
  id: text("id").primaryKey(),
  phone_e164: text("phone_e164").notNull(),
  code_hash: text("code_hash").notNull(),
  purpose: text("purpose").notNull().default("login"),
  attempts: integer("attempts").notNull().default(0),
  max_attempts: integer("max_attempts").notNull().default(5),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumed_at: timestamp("consumed_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    phoneCreatedIdx: index("idx_otp_phone_created").on(table.phone_e164, table.created_at), // Note: Drizzle doesn't perfectly support index ordering syntax concisely yet, but good enough for reference
  };
});

export const helpers = pgTable("helpers", {
  user_id: text("user_id").primaryKey().references(() => users.id),
  city_id: text("city_id").references(() => cities.id),
  status: text("status").notNull().default("pending"),
  verification_status: text("verification_status").notNull().default("unverified"),
  is_online: boolean("is_online").notNull().default(false),
  online_since: timestamp("online_since", { withTimezone: true }),
  last_lat: doublePrecision("last_lat"),
  last_lng: doublePrecision("last_lng"),
  last_h3_cell: text("last_h3_cell"),
  last_location_at: timestamp("last_location_at", { withTimezone: true }),
  rating_avg: numeric("rating_avg", { precision: 3, scale: 2 }).notNull().default('0'),
  rating_count: integer("rating_count").notNull().default(0),
  jobs_completed: integer("jobs_completed").notNull().default(0),
  service_radius_km: numeric("service_radius_km", { precision: 4, scale: 1 }).notNull().default('5.0'),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const services = pgTable("services", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name_en: text("name_en").notNull(),
  name_hi: text("name_hi").notNull().default(""),
  description_en: text("description_en").notNull().default(""),
  description_hi: text("description_hi").notNull().default(""),
  is_active: boolean("is_active").notNull().default(true),
  sort_order: integer("sort_order").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const service_packages = pgTable("service_packages", {
  id: text("id").primaryKey(),
  service_id: text("service_id").notNull().references(() => services.id),
  city_id: text("city_id").references(() => cities.id),
  home_size: text("home_size").notNull(),
  duration_min: integer("duration_min").notNull(),
  price_paise: integer("price_paise").notNull(),
  is_active: boolean("is_active").notNull().default(true),
  valid_from: timestamp("valid_from", { withTimezone: true }),
  valid_to: timestamp("valid_to", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const addresses = pgTable("addresses", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => users.id),
  label: text("label").notNull().default("Home"),
  flat_tower: text("flat_tower"),
  society_name: text("society_name"),
  line1: text("line1").notNull().default(""),
  landmark: text("landmark"),
  locality: text("locality"),
  city_id: text("city_id").references(() => cities.id),
  pincode: text("pincode"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  h3_cell: text("h3_cell"),
  is_default: boolean("is_default").notNull().default(false),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: text("id").primaryKey(),
  booking_number: text("booking_number").notNull().unique(), // Note: Default handled in DB
  customer_id: text("customer_id").notNull().references(() => users.id),
  helper_id: text("helper_id").references(() => users.id),
  address_id: text("address_id").references(() => addresses.id),
  address_snapshot: jsonb("address_snapshot"),
  service_package_id: text("service_package_id").references(() => service_packages.id),
  service_code: text("service_code"),
  home_size: text("home_size"),
  duration_min: integer("duration_min"),
  schedule_type: text("schedule_type").notNull().default("instant"),
  scheduled_start: timestamp("scheduled_start", { withTimezone: true }),
  status: text("status").notNull().default("searching"),
  dispatch_wave: integer("dispatch_wave").notNull().default(1),
  price_paise: integer("price_paise").notNull().default(0),
  tax_paise: integer("tax_paise").notNull().default(0),
  fee_paise: integer("fee_paise").notNull().default(0),
  discount_paise: integer("discount_paise").notNull().default(0),
  total_paise: integer("total_paise").notNull().default(0),
  currency: text("currency").notNull().default("INR"),
  payment_mode: text("payment_mode").notNull().default("pay_after_service"),
  start_code: text("start_code"),
  start_code_attempts: integer("start_code_attempts").notNull().default(0),
  eta_minutes: integer("eta_minutes"),
  eta_updated_at: timestamp("eta_updated_at", { withTimezone: true }),
  assigned_at: timestamp("assigned_at", { withTimezone: true }),
  started_at: timestamp("started_at", { withTimezone: true }),
  completed_at: timestamp("completed_at", { withTimezone: true }),
  cancelled_at: timestamp("cancelled_at", { withTimezone: true }),
  cancelled_by: text("cancelled_by"),
  cancel_reason: text("cancel_reason"),
  customer_notes: text("customer_notes"),
  idempotency_key: text("idempotency_key"),
  version: integer("version").notNull().default(1),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const booking_offers = pgTable("booking_offers", {
  id: text("id").primaryKey(),
  booking_id: text("booking_id").notNull().references(() => bookings.id),
  helper_id: text("helper_id").notNull().references(() => users.id),
  wave: integer("wave").notNull().default(1),
  status: text("status").notNull().default("pending"),
  offered_at: timestamp("offered_at", { withTimezone: true }).notNull().defaultNow(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  responded_at: timestamp("responded_at", { withTimezone: true }),
  reject_reason: text("reject_reason"),
  distance_m: integer("distance_m"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const booking_events = pgTable("booking_events", {
  id: text("id").primaryKey(),
  booking_id: text("booking_id").notNull().references(() => bookings.id),
  event_type: text("event_type").notNull(),
  from_status: text("from_status"),
  to_status: text("to_status"),
  actor_user_id: text("actor_user_id"),
  actor_role: text("actor_role"),
  payload: jsonb("payload"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const outbox_events = pgTable("outbox_events", {
  id: text("id").primaryKey(),
  aggregate_type: text("aggregate_type").notNull(),
  aggregate_id: text("aggregate_id").notNull(),
  event_type: text("event_type").notNull(),
  payload: jsonb("payload"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  processed_at: timestamp("processed_at", { withTimezone: true }),
});
