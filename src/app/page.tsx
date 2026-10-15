"use client";

import AppShell from "@/components/app-shell";
import BottomNav from "@/components/bottom-nav";
import Footer from "@/components/footer";
import Wordmark from "@/components/wordmark";
import DiwaliDecor from "@/components/diwali-decor";
import { SectionTitle } from "@/components/ui";
import ServiceCard from "@/components/service-card";
import LocationTrigger from "@/components/location-trigger";
import {
  IconShieldCheck,
  IconCurrencyRupee,
  IconLock,
  IconUser,
} from "@/components/icons";
import Link from "next/link";
import { allServices } from "@/data/services";
import { useI18n } from "@/lib/i18n";

export default function HomePage() {
  const { t } = useI18n();

  const trustItems = [
    { icon: IconShieldCheck, label: t("home.idVerified") },
    { icon: IconCurrencyRupee, label: t("home.upfrontPrice") },
    { icon: IconLock, label: t("home.otpSecured") },
  ];

  return (
    <>
      <AppShell noPaddingBottom noPaddingTop>
        {/* ── Header wash: brand rose fade ── */}
        <div className="home-wash relative -mx-4 px-4" style={{ paddingTop: "calc(16px + env(safe-area-inset-top, 0px))" }}>
          <DiwaliDecor />
          {/* ── Top bar: wordmark + location + profile ── */}
          <div className="flex items-center justify-between gap-3 mb-3 h-7 relative z-[2] mt-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Wordmark inverted />
              <LocationTrigger />
            </div>
            <div className="flex items-center shrink-0">
              <Link
                href="/profile"
                className="relative w-7 h-7 flex items-center justify-center rounded-full shadow-sm no-select"
                style={{ backgroundColor: "var(--surface-border)" }}
                aria-label={t("profile.title")}
                data-pressable=""
              >
                <IconUser size={15} className="text-ink" />
              </Link>
            </div>
          </div>

          {/* ── Hero Text ── */}
          <div className="mt-0 mb-2 relative z-[2]">
            <h2
              className="text-[20px] font-bold leading-[1.25] mb-1"
              style={{ color: "#FFFFFF" }}
            >
              {t("home.headlinePart1")}
              <span style={{ color: "#F5B731" }}>{t("home.headlineHighlight")}</span>
            </h2>
            <p className="text-[14px]" style={{ color: "rgba(255,255,255,0.85)" }}>
              {t("home.subline")}
            </p>
          </div>

          {/* ── What do you need? ── */}
          <div className="mt-3 mb-2 relative z-[2]">
            <h3 className="text-[18px] font-medium" style={{ color: "#FFFFFF" }}>{t("home.whatDoYouNeed")}</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 relative z-[2]">
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



        </div>

        {/* ── Trust row (starts on plain bg) ── */}
        <div className="grid grid-cols-3 gap-2 mt-6 relative z-[2]">
          {trustItems.map((item, idx) => {
            const Icon = item.icon;
            const shiftClass =
              idx === 0 ? "-translate-x-2.5" : idx === 2 ? "translate-x-2.5" : "";
            return (
              <div
                key={item.label}
                className={`flex flex-col items-center gap-1.5 text-center ${shiftClass}`}
              >
                <Icon size={20} className="text-teal" />
                <span className="text-[12px] text-ink-muted leading-tight">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Divider line below trust row ── */}
        <div className="border-b border-[var(--surface-border)] mt-5 mb-4 mx-8" />

        {/* ── Services we offer ── */}
        <div className="mb-4.5">
          <h2 className="text-[15px] font-semibold text-ink">{t("home.allServicesWeOffer")}</h2>
          <p className="text-[12px] text-ink-muted mt-0.5">{t("home.scheduleOrBook")}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 pb-6">
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
