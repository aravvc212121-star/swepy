"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Poppins } from "next/font/google";
import { footerConfig } from "@/data/footer";
import { allServices } from "@/data/services";
import { IconBrandInstagram, IconBrandLinkedin, IconBrandYoutube } from "@/components/icons";

const poppins = Poppins({ subsets: ["latin"], weight: ["600"] });

function FooterWordmark() {
  return (
    <div className="flex flex-col gap-[6px]">
      <div className={`${poppins.className} text-[32px] leading-[1.1] tracking-[-1px] text-white flex items-baseline`}>
        swepy
        <span style={{ color: "#F6B21A", fontSize: "36px", lineHeight: "1" }}>.</span>
      </div>
      <p className="text-[13px] m-0" style={{ color: "#FBE3EC" }}>
        {footerConfig.tagline}
      </p>
    </div>
  );
}

function FooterLinkGroup({ title, links }: { title: string, links: { label: string, href: string }[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-[11px] font-medium uppercase text-white mb-[6px]" style={{ letterSpacing: "0.14em" }}>
        {title}
      </h2>
      <ul className="list-none m-0 p-0 flex flex-col">
        {links.map((link) => (
          <li key={link.label}>
            <Link 
              href={link.href}
              className="block text-[13px] py-2 no-underline outline-none focus-visible:ring-2 focus-visible:ring-[#F6B21A] focus-visible:ring-offset-2 focus-visible:text-white focus-visible:underline pr-2 min-h-[44px] flex items-center"
              style={{ color: "#FBE3EC", lineHeight: 1.4 }}
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
    <div className="flex gap-3">
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
            className="w-11 h-11 rounded-full flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-[#F6B21A] focus-visible:ring-offset-2 no-select"
            style={{ border: "1px solid rgba(255, 255, 255, 0.4)" }}
          >
            <Icon size={20} className="text-white" aria-hidden="true" />
          </a>
        );
      })}
    </div>
  );
}

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    }
  }, []);

  return (
    <footer 
      className="rounded-t-[20px] px-5 pt-7 w-full mx-auto"
      style={{ 
        backgroundColor: "#B3225A", 
        paddingBottom: "calc(16px + env(safe-area-inset-bottom, 8px) + 96px)" // base + nav bar height
      }}
    >
      <FooterWordmark />
      
      {/* Contact block */}
      <div className="mt-[26px]">
        <p className="text-[13px] m-0 mb-3" style={{ color: "#FBE3EC" }}>
          Feel free to reach us at:
        </p>
        <div className="flex flex-col gap-3">
          <a 
            href={`mailto:${footerConfig.helpEmail}`}
            className="text-[15px] font-medium no-underline outline-none focus-visible:ring-2 focus-visible:ring-[#F6B21A] focus-visible:ring-offset-2 focus-visible:underline inline-block w-fit min-h-[44px] flex items-center"
            style={{ color: "#FFD166" }}
          >
            {footerConfig.helpEmail}
          </a>
          <div className="flex items-center gap-2">
            <span className="text-[13px]" style={{ color: "#FBE3EC" }}>Careers:</span>
            <a 
              href={`mailto:${footerConfig.careersEmail}`}
              className="text-[15px] font-medium no-underline outline-none focus-visible:ring-2 focus-visible:ring-[#F6B21A] focus-visible:ring-offset-2 focus-visible:underline inline-block w-fit min-h-[44px] flex items-center"
              style={{ color: "#FFD166" }}
            >
              {footerConfig.careersEmail}
            </a>
          </div>
        </div>
      </div>

      {/* Support | Company */}
      <div className="mt-[26px] grid grid-cols-2 gap-x-4 gap-y-6">
        <FooterLinkGroup title={footerConfig.linkGroups[0].title} links={footerConfig.linkGroups[0].links} />
        <FooterLinkGroup title={footerConfig.linkGroups[1].title} links={footerConfig.linkGroups[1].links} />
      </div>

      {/* Legal | Get the app */}
      <div className="mt-[26px] grid grid-cols-2 gap-x-4 gap-y-6">
        <FooterLinkGroup title={footerConfig.linkGroups[2].title} links={footerConfig.linkGroups[2].links} />
        {!isStandalone && (
          <FooterLinkGroup title={footerConfig.linkGroups[3].title} links={footerConfig.linkGroups[3].links} />
        )}
      </div>

      {/* Services */}
      <div className="mt-[26px]">
        <nav aria-label="Services">
          <h2 className="text-[11px] font-medium uppercase text-white mb-[6px]" style={{ letterSpacing: "0.14em" }}>
            Services
          </h2>
          <div className="grid grid-cols-2 gap-x-4">
            {allServices.map((service) => (
              <Link 
                key={service.slug}
                href={`/services/${service.slug}`}
                className="block text-[13px] py-2 no-underline outline-none focus-visible:ring-2 focus-visible:ring-[#F6B21A] focus-visible:ring-offset-2 focus-visible:text-white focus-visible:underline pr-2 min-h-[44px] flex items-center"
                style={{ color: "#FBE3EC", lineHeight: 1.4 }}
              >
                {service.name}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {/* All cities */}
      <div className="mt-[26px]">
        <h2 className="text-[11px] font-medium uppercase text-white mb-[6px]" style={{ letterSpacing: "0.14em" }}>
          All cities
        </h2>
        <ul className="grid grid-cols-2 gap-x-4 list-none m-0 p-0">
          {footerConfig.cities.map((city) => (
            <li 
              key={city}
              className="text-[13px] py-2 pr-2"
              style={{ color: "#FBE3EC", lineHeight: 1.4 }}
            >
              {city}
            </li>
          ))}
        </ul>
      </div>

      {/* Divider */}
      <div className="mt-[26px] mb-[22px] h-px w-full" style={{ backgroundColor: "rgba(255, 255, 255, 0.22)" }} />

      {/* Social & Copyright */}
      <SocialLinks items={footerConfig.social} />
      
      <p className="mt-[20px] text-[12px] m-0" style={{ color: "#F8C9DA" }}>
        Swepy © {currentYear}
      </p>
    </footer>
  );
}
