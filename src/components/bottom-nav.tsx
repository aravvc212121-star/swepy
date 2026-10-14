"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useScrollNav } from "@/lib/use-scroll-nav";

/* ────────────────────────────────────────────────
   Custom inline SVG icons
   ──────────────────────────────────────────────── */

function IconHomeFilled({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M10.55 2.53a2.25 2.25 0 0 1 2.9 0l6.6 5.6c.49.42.75 1.03.75 1.67V18a3 3 0 0 1-3 3H6.2a3 3 0 0 1-3-3V9.8c0-.64.26-1.25.75-1.67l6.6-5.6Z" />
      <rect x="10.5" y="14.5" width="3" height="4.5" rx="1.5" fill="white" />
    </svg>
  );
}

function IconHomeOutline({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.2 9.8V18a3 3 0 0 0 3 3h11.6a3 3 0 0 0 3-3V9.8c0-.64-.26-1.25-.75-1.67l-6.6-5.6a2.25 2.25 0 0 0-2.9 0l-6.6 5.6c-.49.42-.75 1.03-.75 1.67Z" />
      <rect x="10.5" y="14.5" width="3" height="4.5" rx="1.5" />
    </svg>
  );
}

function IconBookingsFilled({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="9" y="1.5" width="6" height="4" rx="1.5" />
      <path d="M8 3H7a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3h-1v1.5A2.5 2.5 0 0 1 13.5 7h-3A2.5 2.5 0 0 1 8 4.5V3Z" />
      <line x1="9" y1="11" x2="15" y2="11" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="9" y1="15" x2="13" y2="15" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconBookingsOutline({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="4" width="14" height="17" rx="3" />
      <path d="M9 4v-.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V4" />
      <path d="M9 11h6" />
      <path d="M9 15h4" />
    </svg>
  );
}

/* ── Layout constants (px) ── */
const PAD = 5;       // inner padding of the bar container
const SPACER = 52;   // center logo spacer width
const INSET = 10;    // how much the pill is inset from each tab edge

/*
 * Tab width = (100% − 2·PAD − SPACER) / 2
 * Pill width = tabWidth − 2·INSET
 * Left pill left  = PAD + INSET
 * Right pill left  = PAD + tabWidth + SPACER + INSET
 *
 * Expressed as CSS calc():
 */
const pillWidth = `calc((100% - ${PAD * 2 + SPACER}px) / 2 - ${INSET * 2}px)`;
const pillLeftHome = `${PAD + INSET}px`;
const pillLeftBookings = `calc((100% - ${PAD * 2 + SPACER}px) / 2 + ${PAD + SPACER + INSET}px)`;

/* ── Tab config ── */
const tabs = [
  { href: "/",       labelKey: "nav.home",    Filled: IconHomeFilled,    Outline: IconHomeOutline,    match: (p: string) => p === "/" },
  { href: "/orders", labelKey: "nav.booking",  Filled: IconBookingsFilled, Outline: IconBookingsOutline, match: (p: string) => p.startsWith("/orders") },
];

export default function BottomNav() {
  const pathname = usePathname();
  const isVisible = useScrollNav();
  const { t } = useI18n();

  const activeIndex = tabs[0].match(pathname) ? 0 : tabs[1].match(pathname) ? 1 : -1;

  return (
    <nav
      className="fixed bottom-0 left-1/2 w-full max-w-[430px] z-20 pointer-events-none no-select"
      style={{
        padding: "0 16px calc(env(safe-area-inset-bottom, 8px) + 6px)",
        transform: isVisible
          ? "translate3d(-50%, 0, 0)"
          : "translate3d(-50%, calc(100% + 32px), 0)",
        transition: "transform 480ms cubic-bezier(0.22, 1, 0.36, 1)",
        willChange: "transform",
      }}
      aria-label="Main navigation"
      aria-hidden={!isVisible}
    >
      <div
        className="relative flex items-stretch rounded-[18px]"
        style={{
          height: 48,
          background: "var(--nav-glass)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "0.5px solid var(--surface-border)",
          boxShadow: "0 8px 28px rgba(0, 0, 0, 0.08)",
          padding: PAD,
          pointerEvents: isVisible ? "auto" : "none",
        }}
      >
        {/* ── Sliding pill highlight ── */}
        {activeIndex >= 0 && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: PAD,
              bottom: PAD,
              left: activeIndex === 0 ? pillLeftHome : pillLeftBookings,
              width: pillWidth,
              borderRadius: 14,
              background: "color-mix(in srgb, var(--brand-rose) 12%, transparent)",
              transition: "left 280ms cubic-bezier(0.34, 1.4, 0.64, 1)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
        )}

        {/* Left tab — Home */}
        <Link
          href={tabs[0].href}
          aria-current={activeIndex === 0 ? "page" : undefined}
          className="flex-1 flex items-center justify-center no-underline outline-none no-select relative z-10"
          style={{ minHeight: 38 }}
        >
          <span
            className="inline-flex items-center gap-1.5"
            style={{
              color: activeIndex === 0 ? "var(--brand-rose)" : "var(--ink-muted)",
              fontWeight: activeIndex === 0 ? 600 : 400,
              fontSize: 13,
              transition: "color 200ms ease",
            }}
          >
            {activeIndex === 0 ? <IconHomeFilled size={18} /> : <IconHomeOutline size={18} />}
            <span style={{ lineHeight: 1 }}>{t(tabs[0].labelKey)}</span>
          </span>
        </Link>

        {/* Center spacer */}
        <div style={{ width: SPACER, flexShrink: 0 }} />

        {/* Right tab — Bookings */}
        <Link
          href={tabs[1].href}
          aria-current={activeIndex === 1 ? "page" : undefined}
          className="flex-1 flex items-center justify-center no-underline outline-none no-select relative z-10"
          style={{ minHeight: 38 }}
        >
          <span
            className="inline-flex items-center gap-1.5"
            style={{
              color: activeIndex === 1 ? "var(--brand-rose)" : "var(--ink-muted)",
              fontWeight: activeIndex === 1 ? 600 : 400,
              fontSize: 13,
              transition: "color 200ms ease",
            }}
          >
            {activeIndex === 1 ? <IconBookingsFilled size={18} /> : <IconBookingsOutline size={18} />}
            <span style={{ lineHeight: 1 }}>{t(tabs[1].labelKey)}</span>
          </span>
        </Link>

        {/* ── Center Swepy logo (decorative, not tappable) ── */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: 0,
            bottom: 0,
            width: 50,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: 50,
              height: "100%",
              backgroundColor: "var(--brand-rose)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "16px 16px 14px 14px",
              overflow: "hidden",
            }}
          >
            <Image
              src="/icons/icon-192.png"
              alt=""
              width={34}
              height={34}
              className="nav-logo-light"
              style={{ borderRadius: 8, objectFit: "cover" }}
              priority
            />
            <Image
              src="/icons/icon-dark-192.png"
              alt=""
              width={34}
              height={34}
              className="nav-logo-dark"
              style={{ borderRadius: 8, objectFit: "cover" }}
              priority
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
