"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Poppins } from "next/font/google";
import { footerConfig } from "@/data/footer";
import { IconBrandInstagram, IconBrandLinkedin, IconBrandYoutube } from "@/components/icons";
import { useI18n } from "@/lib/i18n";
import { isDiwaliActive, ChakraMandalaSVG } from "@/components/diwali-decor";
import { useDiwaliPreference } from "@/lib/diwali-preference";

const poppins = Poppins({ subsets: ["latin"], weight: ["600"] });

/* ── Sub-components ───────────────────────────────────── */

function FooterWordmark() {
  return (
    <div className="flex flex-col gap-0.5">
      <div
        className={`${poppins.className} text-[28px] leading-[1] tracking-[-0.5px] text-white flex items-baseline`}
      >
        swepy
        <span style={{ color: "#F6B21A", fontSize: "32px", lineHeight: "1" }}>.</span>
      </div>
      <p className="text-[10.5px] m-0 text-white/60 leading-tight">
        Helper at your door in 10 minutes
      </p>
    </div>
  );
}

function FooterLinkGroup({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <nav aria-label={title}>
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-2.5" style={{ color: "rgba(255, 255, 255, 0.55)" }}>
        {title}
      </h2>
      <ul className="list-none m-0 p-0 flex flex-col gap-[5px]">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="block text-[13px] leading-[1.4] no-underline outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#F6B21A] focus-visible:ring-offset-2 focus-visible:text-white focus-visible:underline"
              style={{ color: "var(--footer-text)" }}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function SocialLinks({ items }: { items: typeof footerConfig.social }) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "instagram":
        return IconBrandInstagram;
      case "linkedin":
        return IconBrandLinkedin;
      case "youtube":
        return IconBrandYoutube;
      default:
        return IconBrandInstagram;
    }
  };

  return (
    <div className="flex gap-2.5">
      {items.map((item) => {
        const Icon = getIcon(item.icon);
        return (
          <a
            key={item.name}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={item.name}
            data-pressable=""
            className="w-8 h-8 rounded-full flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-[#F6B21A] no-select transition-all duration-200 hover:scale-110 hover:bg-white/20"
            style={{
              border: "1px solid rgba(255, 255, 255, 0.25)",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
            }}
          >
            <Icon size={15} className="text-white" aria-hidden="true" />
          </a>
        );
      })}
    </div>
  );
}

/* ── Main Footer ──────────────────────────────────────── */

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [isStandalone, setIsStandalone] = useState(false);
  const { t } = useI18n();
  const { enabled: userDecorEnabled } = useDiwaliPreference();
  const showDiwali = isDiwaliActive() && userDecorEnabled;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    }
  }, []);

  const renderGroup = (group: (typeof footerConfig.linkGroups)[0]) => (
    <FooterLinkGroup
      title={t(group.titleKey as any)}
      links={group.links.map((link) => ({
        label: t(link.labelKey as any),
        href: link.href,
      }))}
    />
  );

  return (
    <footer
      className="rounded-t-[20px] w-full max-w-[430px] mx-auto relative overflow-hidden"
      style={{
        backgroundColor: "var(--footer-bg)",
        paddingBottom: "calc(64px + env(safe-area-inset-bottom, 8px))",
      }}
    >
      {/* ── Diwali Toran Garland across footer top ── */}
      {showDiwali && (
        <div
          aria-hidden="true"
          className="pointer-events-none select-none absolute top-0 left-0 right-0 z-0 overflow-hidden"
          style={{ height: 42 }}
        >
          <Image
            src="/diwali/toran.png"
            alt=""
            width={1024}
            height={215}
            priority
            className="w-full h-auto block select-none"
            style={{ transform: "translateY(-6px)" }}
          />
        </div>
      )}

      {/* ── Top section: wordmark + socials ── */}
      <div className="flex items-start justify-between px-6 pt-7 pb-6 relative z-[1]">
        <FooterWordmark />
        <SocialLinks items={footerConfig.social} />
      </div>

      {/* ── Divider ── */}
      <div className="mx-6 h-px" style={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }} />

      {/* ── Link grid ── */}
      <div className="px-6 pt-5 pb-1 grid grid-cols-2 gap-x-8 gap-y-6">
        {renderGroup(footerConfig.linkGroups[0])}
        {renderGroup(footerConfig.linkGroups[1])}
        {renderGroup(footerConfig.linkGroups[2])}
        {!isStandalone && renderGroup(footerConfig.linkGroups[3])}
      </div>

      {/* ── Diwali Golden Chakra Mandala in Footer Background ── */}
      {showDiwali && (
        <div
          aria-hidden="true"
          className="pointer-events-none select-none absolute -bottom-10 -right-10 z-0"
          style={{ width: 200, height: 200, opacity: 0.16 }}
        >
          <ChakraMandalaSVG size={200} />
        </div>
      )}

      {/* ── Bottom divider ── */}
      <div className="mx-6 mt-5 h-px" style={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }} />



      {/* ── Copyright bar ── */}
      <div
        className="flex items-center justify-between px-6 pt-3.5 pb-1 text-[10.5px] tracking-wide relative z-[1]"
        style={{ color: "var(--footer-copyright)", opacity: 0.7 }}
      >
        <span>© {currentYear} Swepy</span>
        <span>Bangalore, IN</span>
      </div>
    </footer>
  );
}
