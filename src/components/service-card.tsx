"use client";

import Image from "next/image";
import Link from "next/link";
import {
  IconBroom,
  IconSparkles,
  IconClock,
  IconBath,
  IconToolsKitchen,
  IconHanger,
  IconIroning,
  IconArmchair,
  IconArrowRight,
  IconSearch,
  IconRefresh,
  IconMap,
} from "./icons";

/** Icon lookup by name for placeholder tiles */
const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>> = {
  broom: IconBroom,
  sparkles: IconSparkles,
  clock: IconClock,
  bath: IconBath,
  kitchen: IconToolsKitchen,
  hanger: IconHanger,
  ironing: IconIroning,
  armchair: IconArmchair,
  search: IconSearch,
  refresh: IconRefresh,
  map: IconMap,
};

interface ServiceCardProps {
  /** URL slug for the service */
  slug: string;
  /** Display name */
  title: string;
  /** Image path (e.g. /services/fridge-cleaning.jpg) or null for placeholder */
  image?: string | null;
  /** Tabler icon name for placeholder tile when image is null */
  iconFallback?: string;
  /** Optional subtitle (Minor/Major only) */
  subtitle?: string;
  /** Optional price line (Minor/Major only) */
  price?: string;
  /** Link destination */
  href?: string;
  /** Whether this card is above the fold (eager loading) */
  priority?: boolean;
  /** Whether the card is styled for the dark wash header, or alternate white */
  variant?: "default" | "hero" | "white";
}

/**
 * ServiceCard — shared component for Minor, Major and all 18 grid cards.
 */
export default function ServiceCard({
  slug,
  title,
  image = null,
  iconFallback = "broom",
  subtitle,
  price,
  href = "#",
  priority = false,
  variant = "default",
}: ServiceCardProps) {
  const FallbackIcon = iconMap[iconFallback] || IconBroom;

  const isHero = variant === "hero";
  const isWhite = variant === "white";
  
  // Hero variant uses tinted card (subtle pink tint in light, grey in dark), otherwise clean surface styling
  const cardBg = isHero ? "var(--hero-card-bg, var(--card-fill))" : "var(--surface)";
  const textColor = isHero ? "var(--ink)" : "var(--ink)";
  const subtextColor = isHero ? "var(--ink-muted)" : "var(--ink-muted)";
  
  const tileHeight = isHero ? "h-[108px]" : "h-24";
  const tileBg = isHero ? "var(--brand-rose)" : "var(--app-bg)";

  return (
    <Link
      href={href}
      data-pressable=""
      className={`flex flex-col rounded-[14px] ${isHero ? "pb-1" : "pb-3"} overflow-hidden no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-2 no-select min-h-[44px]`}
      style={{
        backgroundColor: cardBg,
        ...(isHero ? {} : { border: `0.5px solid var(--surface-border)` }),
      }}
    >
      {/* Illustration tile */}
      <div
        className={`relative ${tileHeight} flex items-center justify-center`}
        style={{ backgroundColor: tileBg }}
      >
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            sizes="(max-width: 430px) 45vw, 200px"
            className="object-cover"
            loading={priority ? "eager" : "lazy"}
          />
        ) : (
          /* Placeholder */
          <div className="flex flex-col items-center">
            <FallbackIcon size={isHero ? 24 : 32} className="text-teal" strokeWidth={1.25} />
          </div>
        )}
      </div>

      {/* Label row */}
      <div className={`flex flex-col flex-1 px-3 pb-0 justify-between ${isHero ? "mt-2" : "mt-2"}`}>
        <div className="flex items-start justify-between min-h-[30px]">
          <div className="flex-1 min-w-0">
            <p
              className={`text-[13px] font-medium leading-[1.25] line-clamp-1`}
              style={{ color: textColor }}
            >
              {title}
            </p>
            {subtitle && (
              <p className="text-[11px] leading-tight mt-0.5 line-clamp-1" style={{ color: subtextColor }}>
                {subtitle}
              </p>
            )}
            {price && (
              <p className="text-[11px] leading-tight mt-0.5 font-medium" style={{ color: textColor }}>
                {price}
              </p>
            )}
          </div>
          {!isHero && <IconArrowRight size={16} className="shrink-0 ml-1 mt-0.5" style={{ color: textColor }} />}
        </div>
        
        {isHero && (
          <div className="hero-book-btn mt-2 mb-0.5 w-full h-[28px] rounded-[7px] flex items-center justify-center text-[10.5px] font-bold tracking-wide uppercase shadow-xs">
            Book now
          </div>
        )}
      </div>
    </Link>
  );
}
