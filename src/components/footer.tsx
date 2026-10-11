"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Poppins } from "next/font/google";
import { footerConfig } from "@/data/footer";
import { IconBrandInstagram, IconBrandLinkedin, IconBrandYoutube } from "@/components/icons";
import { useI18n } from "@/lib/i18n";

const poppins = Poppins({ subsets: ["latin"], weight: ["600"] });

function FooterWordmark() {
  return (
    <div className="flex flex-col gap-0.5">
      <div className={`${poppins.className} text-[26px] leading-[1] tracking-[-0.5px] text-white flex items-baseline`}>
        swepy
        <span style={{ color: "#F6B21A", fontSize: "30px", lineHeight: "1" }}>.</span>
      </div>
      <p className="text-[11px] m-0 text-white/70">
        Helper at your door in 10 minutes
      </p>
    </div>
  );
}

function FooterLinkGroup({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-[11px] font-semibold uppercase text-white/90 mb-1 tracking-wider">
        {title}
      </h2>
      <ul className="list-none m-0 p-0 flex flex-col">
        {links.map((link) => (
          <li key={link.label}>
            <Link 
              href={link.href}
              className="block text-[12.5px] py-0.5 no-underline outline-none focus-visible:ring-2 focus-visible:ring-[#F6B21A] focus-visible:ring-offset-2 focus-visible:text-white focus-visible:underline flex items-center transition-colors hover:text-white"
              style={{ color: "var(--footer-text)", lineHeight: 1.35 }}
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
      case "instagram": return IconBrandInstagram;
      case "linkedin": return IconBrandLinkedin;
      case "youtube": return IconBrandYoutube;
      default: return IconBrandInstagram;
    }
  };

  return (
    <div className="flex gap-2">
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
            className="w-7 h-7 rounded-full flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-[#F6B21A] no-select transition-opacity hover:opacity-80"
            style={{ border: "1px solid rgba(255, 255, 255, 0.35)", backgroundColor: "rgba(255, 255, 255, 0.08)" }}
          >
            <Icon size={14} className="text-white" aria-hidden="true" />
          </a>
        );
      })}
    </div>
  );
}

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [isStandalone, setIsStandalone] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    }
  }, []);

  const renderGroup = (group: typeof footerConfig.linkGroups[0]) => (
    <FooterLinkGroup
      title={t(group.titleKey as any)}
      links={group.links.map(link => ({
        label: t(link.labelKey as any),
        href: link.href
      }))}
    />
  );

  return (
    <footer 
      className="rounded-t-[20px] px-5 pt-5 w-full max-w-[430px] mx-auto"
      style={{ 
        backgroundColor: "var(--footer-bg)", 
        paddingBottom: "calc(64px + env(safe-area-inset-bottom, 8px))"
      }}
    >
      <div className="flex items-center justify-between">
        <FooterWordmark />
        <SocialLinks items={footerConfig.social} />
      </div>
      
      {/* Unified clean 2x2 grid */}
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3.5">
        {renderGroup(footerConfig.linkGroups[0])}
        {renderGroup(footerConfig.linkGroups[1])}
        {renderGroup(footerConfig.linkGroups[2])}
        {!isStandalone && renderGroup(footerConfig.linkGroups[3])}
      </div>

      {/* Subtle thin divider */}
      <div className="mt-4 mb-2.5 h-px w-full" style={{ backgroundColor: "rgba(255, 255, 255, 0.18)" }} />

      {/* Bottom copyright row */}
      <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--footer-copyright)" }}>
        <span>Swepy © {currentYear}</span>
        <span>Bangalore, IN</span>
      </div>
    </footer>
  );
}
