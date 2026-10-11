"use client";

import { useRef } from "react";
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
import { useI18n } from "@/lib/i18n";

export default function HomePage() {
  const { t } = useI18n();
  const washRef = useRef<HTMLDivElement>(null);

  const scrollToServices = () => {
    if (washRef.current) {
      const washTop = washRef.current.offsetTop;
      const washHeight = washRef.current.offsetHeight;
      const targetY = washTop + washHeight + 4;
      window.scrollTo({ top: targetY, behavior: "smooth" });
    }
  };

  const trustItems = [
    { icon: IconShieldCheck, label: t("home.idVerified") },
    { icon: IconCurrencyRupee, label: t("home.upfrontPrice") },
    { icon: IconLock, label: t("home.otpSecured") },
  ];

  return (
    <>
      <AppShell noPaddingBottom>
        {/* ── Header wash: brand rose fade ── */}
        <div ref={washRef} className="home-wash relative -mx-4 -mt-4 px-4 pt-4" style={{ paddingTop: "calc(16px + env(safe-area-inset-top, 0px))" }}>
          {/* ── Top bar: wordmark + bell ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Wordmark inverted />
              <span
                className="inline-flex items-center px-2 py-1 rounded-[8px] text-[12px] font-medium"
                style={{ backgroundColor: "#F5B731", color: "#1F1A24" }}
              >
                <IconBolt size={14} className="mr-0.5" /> {t("home.in10min")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="relative w-9 h-9 flex items-center justify-center rounded-full shadow-sm no-select"
                style={{ backgroundColor: "var(--surface-border)" }}
                aria-label={t("profile.title")}
                data-pressable=""
              >
                <IconUser size={18} className="text-ink" />
              </Link>
            </div>
          </div>

          {/* Location trigger — opens address bottom sheet */}
          <LocationTrigger />

          {/* ── Hero Text ── */}
          <div className="mt-0 mb-2">
            <h2
              className="text-[22px] font-medium leading-[1.25] mb-1 tracking-tighter whitespace-nowrap"
              style={{ color: "#FFFFFF" }}
            >
              {t("home.headline")}
            </h2>
            <p className="text-[15px]" style={{ color: "rgba(255,255,255,0.85)" }}>
              {t("home.subline")}
            </p>
          </div>

          {/* ── What do you need? ── */}
          <div className="mt-3 mb-2">
            <h3 className="text-[18px] font-medium" style={{ color: "#FFFFFF" }}>{t("home.whatDoYouNeed")}</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ServiceCard
              slug="minor-clean"
              title={t("home.minorClean")}
              image="/services/pre-party-clean.jpg"
              iconFallback="broom"
              subtitle={t("home.minorDesc")}
              price={t("home.fromPrice")}
              href="/service/svc_minor"
              priority
              variant="hero"
            />
            <ServiceCard
              slug="major-clean"
              title={t("home.majorClean")}
              image="/services/wardrobe-cleaning.jpg"
              iconFallback="sparkles"
              subtitle={t("home.majorDesc")}
              price={t("home.priceByHome")}
              href="/service/svc_major"
              priority
              variant="hero"
            />
          </div>


          {/* Smooth Sinc-like Bulge "Services Included" */}
          <button
            type="button"
            onClick={scrollToServices}
            aria-label="Scroll to services included"
            className="absolute left-1/2 -bottom-[39px] -translate-x-1/2 w-[280px] h-[40px] z-10 flex items-start justify-center pt-[9px] cursor-pointer outline-none no-select"
          >
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 280 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M0,0 C40,0 45,40 70,40 L210,40 C235,40 240,0 280,0 Z" fill="var(--brand-rose)" />
            </svg>
            <span className="relative z-10 text-[15px] font-medium text-white whitespace-nowrap pointer-events-none">Services Included</span>
          </button>
        </div>

        {/* ── Trust row (unchanged, starts on plain bg) ── */}
        <div className="grid grid-cols-3 gap-3 mt-14">
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

        {/* ── Services grid ── */}
        <div className="grid grid-cols-2 gap-3 mt-8 pb-6">
          {allServices.map((s) => (
            <ServiceCard
              key={s.slug}
              slug={s.slug}
              title={t(`services.${s.slug}`) !== `services.${s.slug}` ? t(`services.${s.slug}`) : s.name}
              image={s.image}
              href={`/services/${s.slug}`}
              variant="white"
            />
          ))}
        </div>

      </AppShell>

      <Footer />
      <BottomNav />
    </>
  );
}
