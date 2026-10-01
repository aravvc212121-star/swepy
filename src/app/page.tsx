"use client";

import AppShell from "@/components/app-shell";
import BottomNav from "@/components/bottom-nav";
import Footer from "@/components/footer";
import Wordmark from "@/components/wordmark";
import { SectionTitle } from "@/components/ui";
import ServiceCard from "@/components/service-card";
import LocationTrigger from "@/components/location-trigger";
import {
  IconBell,
  IconShieldCheck,
  IconCurrencyRupee,
  IconLock,
  IconBolt,
  IconUser,
} from "@/components/icons";
import Link from "next/link";
import { allServices } from "@/data/services";

const trustItems = [
  { icon: IconShieldCheck, label: "ID verified" },
  { icon: IconCurrencyRupee, label: "Upfront price" },
  { icon: IconLock, label: "OTP secured" },
];

export default function HomePage() {
  return (
    <>
      <AppShell>
        {/* ── Header wash: brand rose fade ── */}
        <div className="home-wash -mx-4 -mt-4 px-4 pt-4" style={{ paddingTop: "calc(16px + env(safe-area-inset-top, 0px))" }}>
          {/* ── Top bar: wordmark + bell ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Wordmark inverted />
              <span className="text-[16px] font-medium tracking-tight" style={{ color: "rgba(255,255,255,0.9)" }}>
                in 10 minutes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="relative w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm no-select"
                aria-label="Profile"
                data-pressable=""
              >
                <IconUser size={18} className="text-ink" />
              </Link>
            </div>
          </div>

          {/* Location trigger — opens address bottom sheet */}
          <LocationTrigger />

          {/* ── Hero Text ── */}
          <div className="mt-2 mb-2">
            <span
              className="inline-flex items-center px-2 py-1 rounded-[8px] text-[12px] font-medium mb-2"
              style={{ backgroundColor: "#F5B731", color: "#1F1A24" }}
            >
              <IconBolt size={14} className="mr-0.5" /> 10 min
            </span>
            <h2
              className="text-[23px] font-medium leading-[1.25] mb-1 tracking-tighter whitespace-nowrap"
              style={{ color: "#FFFFFF" }}
            >
              Helper at your door in 10 minutes
            </h2>
            <p className="text-[15px]" style={{ color: "rgba(255,255,255,0.85)" }}>
              Book, they clean, they go.
            </p>
          </div>

          {/* ── What do you need? ── */}
          <div className="mt-6 mb-2">
            <h3 className="text-[18px] font-medium" style={{ color: "#FFFFFF" }}>What do you need?</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ServiceCard
              slug="minor-clean"
              title="Minor clean"
              image="/services/sweeping-and-mopping.jpg"
              iconFallback="broom"
              subtitle="Sweep, mop, dust, utensils"
              price="From ₹249"
              href="/service/svc_minor"
              priority
              variant="hero"
            />
            <ServiceCard
              slug="major-clean"
              title="Major clean"
              image="/services/bathroom-cleaning.jpg"
              iconFallback="sparkles"
              subtitle="Washrooms, kitchen, sofa and more"
              price="Price by home size"
              href="/service/svc_major"
              priority
              variant="hero"
            />
          </div>

          {/* ── Book a helper button ── */}
          <div className="mt-5">
            <a
              href="/book"
              data-pressable=""
              className="flex items-center justify-center w-full h-[48px] rounded-[12px] text-[15px] font-medium no-underline no-select"
              style={{ backgroundColor: "#FFFFFF", color: "var(--brand-rose)" }}
            >
              Book a helper
            </a>
          </div>
        </div>

        {/* ── Trust row (unchanged, starts on plain bg) ── */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex flex-col items-center gap-1.5 text-center">
                <Icon size={20} className="text-teal" />
                <span className="text-[12px]" style={{ color: "#6B6270" }}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Services included ── */}
        <SectionTitle>Services included</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {allServices.map((s) => (
            <ServiceCard
              key={s.slug}
              slug={s.slug}
              title={s.name}
              image={s.image}
              href={`/services/${s.slug}`}
            />
          ))}
        </div>

      </AppShell>

      <Footer />
      <BottomNav />
    </>
  );
}
