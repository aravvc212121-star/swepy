"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { IconHome, IconClipboardList, IconNavigation, IconClock } from "./icons";
import { useI18n } from "@/lib/i18n";
import { useScrollNav } from "@/lib/use-scroll-nav";

/* ── 4 tabs split 2 | center | 2 ── */
const leftTabs = [
  { href: "/", labelKey: "nav.home", icon: IconHome },
  { href: "/activity", labelKey: "nav.activity", icon: IconClock },
];
const rightTabs = [
  { href: "/orders", labelKey: "nav.booking", icon: IconClipboardList },
  { href: "/booking/demo", labelKey: "nav.tracking", icon: IconNavigation },
];
const allTabs = [...leftTabs, ...rightTabs];

function getActiveHref(pathname: string): string {
  if (pathname === "/") return "/";
  if (pathname.startsWith("/booking")) return "/booking/demo";
  if (pathname.startsWith("/orders")) return "/orders";
  if (pathname.startsWith("/activity")) return "/activity";
  return pathname;
}

/* ── Single tab button ── */
function NavTab({
  href,
  labelKey,
  icon: Icon,
  isActive,
}: {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  isActive: boolean;
}) {
  const { t } = useI18n();
  const iconRef = useRef<HTMLDivElement>(null);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      onMouseEnter={() => {
        const el = iconRef.current;
        if (el) {
          el.classList.remove("nav-icon-pop");
          void el.offsetWidth;
          el.classList.add("nav-icon-pop");
        }
      }}
      className="flex-1 flex flex-col items-center justify-center gap-1 h-full no-underline outline-none no-select relative z-10"
      style={{
        color: isActive ? "var(--nav-text-active)" : "var(--nav-text)",
        fontWeight: isActive ? 600 : 500,
        minWidth: 56,
      }}
    >
      <div
        ref={iconRef}
        style={{ display: "inline-flex" }}
        className={isActive ? "scale-[1.12]" : ""}
        onAnimationEnd={(e) => e.currentTarget.classList.remove("nav-icon-pop")}
      >
        <Icon size={22} strokeWidth={1.4} />
      </div>
      <span className="text-[10px] leading-none">{t(labelKey)}</span>
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const activeHref = getActiveHref(pathname);
  const isVisible = useScrollNav();

  return (
    <nav
      className="fixed bottom-0 left-1/2 w-full max-w-[430px] z-20 pointer-events-none no-select"
      style={{
        padding: "6px 16px calc(env(safe-area-inset-bottom, 8px) + 6px)",
        transform: isVisible
          ? "translate3d(-50%, 0, 0)"
          : "translate3d(-50%, calc(100% + 32px), 0)",
        transition: "transform 480ms cubic-bezier(0.22, 1, 0.36, 1)",
        willChange: "transform",
      }}
      aria-label="Main navigation"
      aria-hidden={!isVisible}
    >
      {/* Outer wrapper — relative so center logo can overflow */}
      <div
        className="relative flex items-stretch"
        style={{
          height: 52,
          pointerEvents: isVisible ? "auto" : "none",
        }}
      >

        {/* Solid / frosted background — covers full width */}
        <div
          className="absolute inset-0 rounded-[18px]"
          style={{
            background: "var(--nav-glass)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "0.5px solid var(--surface-border)",
            boxShadow: "0 8px 28px rgba(0, 0, 0, 0.08)",
          }}
        />

        {/* Left 2 tabs */}
        <div className="relative flex flex-1 items-stretch z-10">
          {leftTabs.map((tab) => (
            <NavTab
              key={tab.href}
              {...tab}
              isActive={activeHref === tab.href}
            />
          ))}
        </div>

        {/* ── Center logo ── */}
        {/* Spacer so it doesn't collapse */}
        <div style={{ width: 60, flexShrink: 0 }} />

        {/* Right 2 tabs */}
        <div className="relative flex flex-1 items-stretch z-10">
          {rightTabs.map((tab) => (
            <NavTab
              key={tab.href}
              {...tab}
              isActive={activeHref === tab.href}
            />
          ))}
        </div>

        {/* ── Absolute center logo button ── */}
        <Link
          href="/"
          aria-label="Swepy Home"
          tabIndex={isVisible ? 0 : -1}
          className="absolute left-1/2 -translate-x-1/2 no-underline no-select focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-rose"
          style={{
            /* flush with nav top & bottom (nav height = 52px, padding = 0) */
            top: 0,
            bottom: 0,
            width: 56,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: isVisible ? "auto" : "none",
          }}
        >
          {/* Solid background tile — fully opaque, no blur */}
          <div
            style={{
              width: 56,
              height: "100%",
              backgroundColor: "var(--brand-rose)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              /* top radius matches capsule, bottom square (flush) */
              borderRadius: "18px 18px 14px 14px",
              overflow: "hidden",
            }}
          >
            <Image
              src="/icons/icon-192.png"
              alt="Swepy"
              width={40}
              height={40}
              className="nav-logo-light"
              style={{ borderRadius: 10, objectFit: "cover" }}
              priority
            />
            <Image
              src="/icons/icon-dark-192.png"
              alt="Swepy"
              width={40}
              height={40}
              className="nav-logo-dark"
              style={{ borderRadius: 10, objectFit: "cover" }}
              priority
            />
          </div>
        </Link>
      </div>
    </nav>
  );
}
