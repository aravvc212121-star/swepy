/**
 * Tabler-style outline icons as React components.
 * All icons use currentColor and are 24×24 by default.
 */
import React from "react";

interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
}

export type { IconProps };

const defaultProps: IconProps = {
  size: 24,
  strokeWidth: 1.5,
};

function makeIcon(paths: string, name: string) {
  const Component = ({ size = 24, className, strokeWidth = 1.5, style }: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <g dangerouslySetInnerHTML={{ __html: paths }} />
    </svg>
  );
  Component.displayName = name;
  return Component;
}

// Navigation
export const IconHome = makeIcon(
  '<path d="M5 12l-2 0l9 -9l9 9l-2 0" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7" /><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6" />',
  "IconHome"
);

export const IconClipboardList = makeIcon(
  '<path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2" /><path d="M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" /><path d="M9 12l.01 0" /><path d="M13 12l2 0" /><path d="M9 16l.01 0" /><path d="M13 16l2 0" />',
  "IconClipboardList"
);

export const IconHelpCircle = makeIcon(
  '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M12 16v.01" /><path d="M12 13a2 2 0 0 0 .914 -3.782a1.98 1.98 0 0 0 -2.414 .483" />',
  "IconHelpCircle"
);

export const IconUser = makeIcon(
  '<path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" /><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />',
  "IconUser"
);

// Actions
export const IconArrowLeft = makeIcon(
  '<path d="M5 12l14 0" /><path d="M5 12l6 6" /><path d="M5 12l6 -6" />',
  "IconArrowLeft"
);

export const IconArrowRight = makeIcon(
  '<path d="M5 12l14 0" /><path d="M13 18l6 -6" /><path d="M13 6l6 6" />',
  "IconArrowRight"
);

export const IconBell = makeIcon(
  '<path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" /><path d="M9 17v1a3 3 0 0 0 6 0v-1" />',
  "IconBell"
);

export const IconPhone = makeIcon(
  '<path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2" />',
  "IconPhone"
);

export const IconCheck = makeIcon(
  '<path d="M5 12l5 5l10 -10" />',
  "IconCheck"
);

export const IconChevronRight = makeIcon(
  '<path d="M9 6l6 6l-6 6" />',
  "IconChevronRight"
);

export const IconChevronDown = makeIcon(
  '<path d="M6 9l6 6l6 -6" />',
  "IconChevronDown"
);

export const IconX = makeIcon(
  '<path d="M18 6l-12 12" /><path d="M6 6l12 12" />',
  "IconX"
);

export const IconPlus = makeIcon(
  '<path d="M12 5l0 14" /><path d="M5 12l14 0" />',
  "IconPlus"
);

export const IconMinus = makeIcon(
  '<path d="M5 12l14 0" />',
  "IconMinus"
);

// Trust/verification
export const IconShieldCheck = makeIcon(
  '<path d="M11.46 20.846a12 12 0 0 1 -7.96 -14.846a12 12 0 0 0 8.5 -3a12 12 0 0 0 8.5 3a12 12 0 0 1 -.09 7.06" /><path d="M15 19l2 2l4 -4" />',
  "IconShieldCheck"
);

export const IconCurrencyRupee = makeIcon(
  '<path d="M18 5h-11h3a4 4 0 0 1 0 8h-3l6 6" /><path d="M7 9l11 0" />',
  "IconCurrencyRupee"
);

export const IconLock = makeIcon(
  '<path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6z" /><path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" /><path d="M8 11v-4a4 4 0 1 1 8 0v4" />',
  "IconLock"
);

// Service icons
export const IconBroom = makeIcon(
  '<path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />',
  "IconBroom"
);

export const IconSparkles = makeIcon(
  '<path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z" />',
  "IconSparkles"
);

// Add-on icons
export const IconBath = makeIcon(
  '<path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1 -4 4h-10a4 4 0 0 1 -4 -4v-3a1 1 0 0 1 1 -1z" /><path d="M6 12v-7a2 2 0 0 1 2 -2h3v2.25" /><path d="M4 21l1 -1.5" /><path d="M20 21l-1 -1.5" />',
  "IconBath"
);

export const IconToolsKitchen = makeIcon(
  '<path d="M19 3v12h-5c-.023 -3.681 .184 -7.406 5 -12zm0 12v6h-1v-3m-10 -14v17m-3 -17l3 6l3 -6" />',
  "IconToolsKitchen"
);

export const IconHanger = makeIcon(
  '<path d="M14 6a2 2 0 1 0 -4 0c0 1.667 .67 3 2 4h0c1.33 -1 2 -2.333 2 -4z" /><path d="M12 10l-8 8h16z" />',
  "IconHanger"
);

export const IconIroning = makeIcon(
  '<path d="M9 6l3 -3l3 3" /><path d="M12 3v18" /><path d="M5 12h14" /><path d="M5 18h14" />',
  "IconIroning"
);

export const IconArmchair = makeIcon(
  '<path d="M5 11a2 2 0 0 1 2 2v2h10v-2a2 2 0 1 1 4 0v4a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-4a2 2 0 0 1 2 -2z" /><path d="M5 11v-5a3 3 0 0 1 3 -3h8a3 3 0 0 1 3 3v5" /><path d="M6 19v2" /><path d="M18 19v2" />',
  "IconArmchair"
);

// Map and location
export const IconMapPin = makeIcon(
  '<path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" /><path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z" />',
  "IconMapPin"
);

export const IconNavigation = makeIcon(
  '<path d="M12 18.5l-3 -1.5l-6 3v-13l6 -3l6 3l6 -3v7.5" /><path d="M9 4v13" /><path d="M15 7v5.5" /><path d="M21.121 20.121a3 3 0 1 0 -4.242 0c.418 .419 1.125 1.045 2.121 1.879c1.051 -.89 1.759 -1.516 2.121 -1.879z" /><path d="M19 18v.01" />',
  "IconNavigation"
);

// Share
export const IconBrandWhatsapp = makeIcon(
  '<path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9" /><path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1" />',
  "IconBrandWhatsapp"
);

// Timer / Clock
export const IconClock = makeIcon(
  '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M12 7v5l3 3" />',
  "IconClock"
);

// Star rating
export const IconStar = makeIcon(
  '<path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z" />',
  "IconStar"
);

export const IconStarFilled = ({ size = 24, className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
    className={className}
    aria-hidden="true"
  >
    <path d="M8.243 7.34l-6.38 .925l-.113 .023a1 1 0 0 0 -.44 1.684l4.622 4.499l-1.09 6.355l-.013 .11a1 1 0 0 0 1.464 .944l5.706 -3l5.693 3l.1 .046a1 1 0 0 0 1.352 -1.1l-1.091 -6.355l4.624 -4.5l.078 -.085a1 1 0 0 0 -.633 -1.62l-6.38 -.926l-2.852 -5.78a1 1 0 0 0 -1.794 0l-2.853 5.78z" />
  </svg>
);

// Alert
export const IconAlertTriangle = makeIcon(
  '<path d="M12 9v4" /><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z" /><path d="M12 16h.01" />',
  "IconAlertTriangle"
);

// SOS
export const IconUrgent = makeIcon(
  '<path d="M8 16v.01" /><path d="M12 16v.01" /><path d="M16 16v.01" /><path d="M4.5 12.5l1.5 -1.5l-1.5 -1.5" /><path d="M19.5 12.5l-1.5 -1.5l1.5 -1.5" /><path d="M12 21a9 9 0 1 1 0 -18a9 9 0 0 1 0 18z" />',
  "IconUrgent"
);

// Camera
export const IconCamera = makeIcon(
  '<path d="M5 7h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2" /><path d="M9 13a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />',
  "IconCamera"
);

// Calendar
export const IconCalendar = makeIcon(
  '<path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z" /><path d="M16 3v4" /><path d="M8 3v4" /><path d="M4 11h16" /><path d="M11 15h1" /><path d="M12 15v3" />',
  "IconCalendar"
);

// Bolt / instant
export const IconBolt = makeIcon(
  '<path d="M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11" />',
  "IconBolt"
);

// Edit
export const IconEdit = makeIcon(
  '<path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1" /><path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z" /><path d="M16 5l3 3" />',
  "IconEdit"
);

// Copy / coupon
export const IconTicket = makeIcon(
  '<path d="M15 5l0 2" /><path d="M15 11l0 2" /><path d="M15 17l0 2" /><path d="M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-3a2 2 0 0 0 0 -4v-3a2 2 0 0 1 2 -2" />',
  "IconTicket"
);

// Wallet
export const IconWallet = makeIcon(
  '<path d="M17 8v-3a1 1 0 0 0 -1 -1h-10a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3m0 4v3a1 1 0 0 1 -1 1h-12a2 2 0 0 1 -2 -2v-12" /><path d="M20 12v4h-4a2 2 0 0 1 0 -4h4" />',
  "IconWallet"
);

// Logout
export const IconLogout = makeIcon(
  '<path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2" /><path d="M9 12h12l-3 -3" /><path d="M18 15l3 -3" />',
  "IconLogout"
);

// Map
export const IconMap = makeIcon(
  '<path d="M3 7l6 -3l6 3l6 -3v13l-6 3l-6 -3l-6 3v-13" /><path d="M9 4v13" /><path d="M15 7v13" />',
  "IconMap"
);

// Location pin for current location
export const IconCurrentLocation = makeIcon(
  '<path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0 -16 0" /><path d="M12 2l0 2" /><path d="M12 20l0 2" /><path d="M20 12l2 0" /><path d="M2 12l2 0" />',
  "IconCurrentLocation"
);

// Search
export const IconSearch = makeIcon(
  '<path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" />',
  "IconSearch"
);

// Refresh
export const IconRefresh = makeIcon(
  '<path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" /><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />',
  "IconRefresh"
);

// Language
export const IconLanguage = makeIcon(
  '<path d="M4 5h7" /><path d="M9 3v2c0 4.418 -2.239 8 -5 8" /><path d="M5 9c0 2.144 2.952 3.908 6.7 4" /><path d="M12 20l4 -9l4 9" /><path d="M19.1 18h-6.2" />',
  "IconLanguage"
);

// Socials
export const IconBrandInstagram = makeIcon(
  '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 4m0 4a4 4 0 0 1 4 -4h8a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4z" /><path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M16.5 7.5l0 .01" />',
  "IconBrandInstagram"
);

export const IconBrandLinkedin = makeIcon(
  '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" /><path d="M8 11l0 5" /><path d="M8 8l0 .01" /><path d="M12 16l0 -5" /><path d="M16 16v-3a2 2 0 0 0 -4 0" />',
  "IconBrandLinkedin"
);

export const IconBrandYoutube = makeIcon(
  '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M2 8a4 4 0 0 1 4 -4h12a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-12a4 4 0 0 1 -4 -4v-8z" /><path d="M10 9l5 3l-5 3z" />',
  "IconBrandYoutube"
);
