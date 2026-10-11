/**
 * Shared Helper Redesign Design Tokens
 * Spec:
 * - Colors: brand #B3285F, blush #FCE8EE, ink #2A1F24, secondary text #6F6168, hint #7D6D75,
 *   hairline #F0E4E8, inner hairline #F6ECEF, page background #FBF7F8, cards white.
 * - Status:
 *   online/success solid #25794F (icons #2F8F63, tint #E4F3EA, text #1F6B47)
 *   pending tint #FDEFC8 with text #6B4A00
 *   danger #B3261E on #FDF1F0
 * - Radius: cards 20px, inner tiles 12px, pills fully round, bottom nav 24px, map card 22px
 * - Soft shadow on floating nav: 0 8px 24px rgba(42,31,36,.08)
 */

export const HELPER_TOKENS = {
  colors: {
    brand: "#B3285F",
    blush: "#FCE8EE",
    ink: "#2A1F24",
    secondary: "#6F6168",
    hint: "#7D6D75",
    hairline: "#F0E4E8",
    innerHairline: "#F6ECEF",
    pageBg: "#FBF7F8",
    cardBg: "#FFFFFF",
    offlineTrack: "#E8DDE1",
    status: {
      onlineSolid: "#25794F",
      onlineIcon: "#2F8F63",
      onlineTint: "#E4F3EA",
      onlineText: "#1F6B47",
      pendingTint: "#FDEFC8",
      pendingText: "#6B4A00",
      pendingBorder: "#EBCB78",
      danger: "#B3261E",
      dangerTint: "#FDF1F0",
      dangerBorder: "#F7D1CE",
    },
    halo: "rgba(179, 40, 95, 0.14)",
    navShadow: "0 8px 24px rgba(42, 31, 36, 0.08)",
  },
  radius: {
    card: "20px",
    innerTile: "12px",
    pill: "9999px",
    bottomNav: "24px",
    mapCard: "22px",
  },
  typography: {
    // Only sizes: 12, 13, 14, 16, 18, 26 px; weights: 400 and 500 only.
    fontFamily: 'var(--font-family, "Plus Jakarta Sans", "Noto Sans Devanagari", sans-serif)',
  },
  layout: {
    navHeight: 56,
    scrollPaddingBottom: "calc(56px + 24px + env(safe-area-inset-bottom, 0px))",
    pagePadding: "20px",
  },
} as const;

