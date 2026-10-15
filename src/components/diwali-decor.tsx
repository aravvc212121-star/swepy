"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useDiwaliPreference } from "@/lib/diwali-preference";

/* ─────────────────────────────────────────────────────────────
   Diwali Festive Theme Configuration
   Festival: Diwali (Lakshmi Puja) — 8 November 2026
   Automatically active from October 15, 2026 through November 12, 2026.
   To disable manually at any time, set DIWALI_THEME_ENABLED = false.
   ───────────────────────────────────────────────────────────── */
export const DIWALI_THEME_ENABLED = true;
export const DIWALI_START_DATE = "2026-10-15T00:00:00+05:30";
export const DIWALI_END_DATE = "2026-11-12T23:59:59+05:30";

export function isDiwaliActive(): boolean {
  if (!DIWALI_THEME_ENABLED) return false;
  const now = new Date();
  const start = new Date(DIWALI_START_DATE);
  const end = new Date(DIWALI_END_DATE);
  return now >= start && now <= end;
}

/**
 * DiwaliDecor — Self-contained Diwali festive add-on for the Home Hero.
 * - Single component, zero hotlinks (all local SVG/CSS + local PNGs)
 * - Purely decorative (pointer-events: none)
 * - Safe area & reduced motion compliant
 * - Can be completely removed by deleting the single <DiwaliDecor /> tag
 */
export default function DiwaliDecor() {
  const { enabled: userDecorEnabled } = useDiwaliPreference();
  const [active, setActive] = useState(false);
  const [cardsTop, setCardsTop] = useState<number>(182);

  useEffect(() => {
    setActive(isDiwaliActive());

    const updateAnchorPositions = () => {
      const hero = document.querySelector(".home-wash");
      if (!hero) return;
      const cardsGrid = hero.querySelector(".grid.grid-cols-2");
      if (cardsGrid) {
        const heroRect = hero.getBoundingClientRect();
        const cardsRect = cardsGrid.getBoundingClientRect();
        const computedTop = cardsRect.top - heroRect.top;
        if (computedTop > 50) {
          setCardsTop(computedTop);
        }
      }
    };

    updateAnchorPositions();
    const timer = setTimeout(updateAnchorPositions, 60);
    window.addEventListener("resize", updateAnchorPositions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateAnchorPositions);
    };
  }, []);

  if (!DIWALI_THEME_ENABLED || !active || !userDecorEnabled) {
    return null;
  }

  // Diyas display width is 84px. Aspect ratio of trimmed image is 200x153 (~1.307)
  const diyaWidth = 84;
  const diyaHeight = Math.round((diyaWidth * 153) / 200); // 64px
  // Bottom edge rests exactly on the top edge of the cards
  const diyaTop = Math.max(0, cardsTop - diyaHeight);

  return (
    <>
      {/* ── Theme Tokens & Animations ── */}
      <style>{`
        :root {
          --diwali-gold: #F5B731;
          --diwali-marigold: #FF7B1A;
          --diwali-cream: #FFF4D9;
        }

        .home-wash {
          padding-bottom: 38px !important;
          overflow-x: clip !important;
          overflow-y: visible !important;
        }

        @keyframes diwaliTwinkle {
          0%, 100% {
            opacity: 0.25;
            transform: scale(0.75);
          }
          50% {
            opacity: 0.95;
            transform: scale(1.15);
          }
        }

        @keyframes diyaGlowPulse {
          0% {
            opacity: 0.55;
          }
          100% {
            opacity: 0.95;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .diwali-sparkle {
            animation: none !important;
            opacity: 0.65 !important;
            transform: none !important;
          }
          .diya-glow {
            animation: none !important;
            opacity: 0.75 !important;
          }
        }
      `}</style>

      {/* ── 1. Warm Glow at Top Center ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none"
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          top: 0,
          width: 360,
          height: 180,
          background: "radial-gradient(ellipse at 50% 0%, rgba(255,196,110,0.32) 0%, rgba(255,196,110,0) 75%)",
          zIndex: 0,
        }}
      />

      {/* ── 2a. Prominent Golden Chakra / Rangoli Mandala (Top Right) ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none"
        style={{
          position: "absolute",
          top: -24,
          right: -24,
          left: "auto",
          width: 230,
          height: 230,
          opacity: 0.28,
          zIndex: 0,
        }}
      >
        <ChakraMandalaSVG size={230} />
      </div>

      {/* ── 2b. Secondary Golden Chakra Accent (Left Background) ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none"
        style={{
          position: "absolute",
          top: 75,
          left: -48,
          width: 170,
          height: 170,
          opacity: 0.18,
          zIndex: 0,
        }}
      >
        <ChakraMandalaSVG size={170} />
      </div>

      {/* ── 3. Toran (Marigold Garland tucked higher at very top) ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none"
        style={{
          position: "absolute",
          top: -8,
          left: 0,
          right: 0,
          zIndex: 0,
        }}
      >
        <Image
          src="/diwali/toran.png"
          alt=""
          width={1024}
          height={215}
          priority
          className="w-full h-auto block select-none"
        />
      </div>

      {/* ── 4. Golden Sparkles (4-point stars) ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
        }}
      >
        {/* Sparkle 1: Top left */}
        <div
          className="diwali-sparkle absolute"
          style={{
            position: "absolute",
            top: 54,
            left: 20,
            animation: "diwaliTwinkle 2.8s ease-in-out infinite",
            animationDelay: "0s",
          }}
        >
          <SparkleStar size={12} />
        </div>

        {/* Sparkle 2: Top right corner */}
        <div
          className="diwali-sparkle absolute"
          style={{
            position: "absolute",
            top: 58,
            right: 48,
            left: "auto",
            animation: "diwaliTwinkle 3.2s ease-in-out infinite",
            animationDelay: "0.8s",
          }}
        >
          <SparkleStar size={13} />
        </div>

        {/* Sparkle 3: Beside tagline row */}
        <div
          className="diwali-sparkle absolute"
          style={{
            position: "absolute",
            top: 110,
            right: 120,
            left: "auto",
            animation: "diwaliTwinkle 2.6s ease-in-out infinite",
            animationDelay: "1.5s",
          }}
        >
          <SparkleStar size={10} />
        </div>

        {/* Sparkle 4: Above diyas in empty space */}
        <div
          className="diwali-sparkle absolute"
          style={{
            position: "absolute",
            top: 125,
            right: 42,
            left: "auto",
            animation: "diwaliTwinkle 3.0s ease-in-out infinite",
            animationDelay: "2.2s",
          }}
        >
          <SparkleStar size={12} />
        </div>
      </div>

      {/* ── 5a. Lit Diyas with Radial Glow (Top Right above cards) ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none"
        style={{
          position: "absolute",
          right: 24,
          left: "auto",
          top: diyaTop,
          width: diyaWidth,
          zIndex: 1,
          transition: "top 120ms ease-out",
        }}
      >
        {/* Soft Warm Radial Glow Behind Diyas */}
        <div
          className="diya-glow pointer-events-none"
          style={{
            position: "absolute",
            width: 150,
            height: 150,
            left: "50%",
            top: "40%",
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(circle, rgba(255,200,110,0.50) 0%, rgba(255,200,110,0) 70%)",
            animation: "diyaGlowPulse 2.8s ease-in-out infinite alternate",
          }}
        />

        {/* Diyas Image: bottom edge resting on top of cards */}
        <Image
          src="/diwali/diyas.png"
          alt=""
          width={200}
          height={153}
          priority
          className="w-full h-auto block select-none relative"
          style={{ position: "relative", zIndex: 1 }}
        />
      </div>

      {/* ── 5b. Lit Diyas at Bottom Left of Hero ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none"
        style={{
          position: "absolute",
          left: 14,
          bottom: 10,
          width: 72,
          zIndex: 2,
        }}
      >
        <div
          className="diya-glow pointer-events-none"
          style={{
            position: "absolute",
            width: 130,
            height: 130,
            left: "50%",
            top: "40%",
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(circle, rgba(255,200,110,0.50) 0%, rgba(255,200,110,0) 70%)",
            animation: "diyaGlowPulse 2.8s ease-in-out infinite alternate",
          }}
        />
        <Image
          src="/diwali/diyas.png"
          alt=""
          width={200}
          height={153}
          priority
          className="w-full h-auto block select-none relative"
          style={{ position: "relative", zIndex: 1 }}
        />
      </div>

      {/* ── 6. Scalloped Cutout along Header Bottom with Yellow Outline & Dots ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 28,
          zIndex: 2,
        }}
      >
        <svg
          viewBox="0 0 416 28"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full block"
        >
          {/* Cutout Mask: Fills below the scallop wave with page background color (white in light mode, dark in dark mode), shaping the pink header into a scalloped cutout */}
          <path
            d={`
              M 0 5
              ${Array.from({ length: 13 })
                .map((_, i) => {
                  const xMid = i * 32 + 16;
                  const xEnd = (i + 1) * 32;
                  return `Q ${xMid} 22, ${xEnd} 5`;
                })
                .join(" ")}
              L 416 28
              L 0 28
              Z
            `}
            fill="var(--app-bg)"
          />

          {/* Yellow Outline tracing the scalloped cutout curve */}
          <path
            d={`
              M 0 5
              ${Array.from({ length: 13 })
                .map((_, i) => {
                  const xMid = i * 32 + 16;
                  const xEnd = (i + 1) * 32;
                  return `Q ${xMid} 22, ${xEnd} 5`;
                })
                .join(" ")}
            `}
            stroke="#F5B731"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Yellow dots centered inside each scallop trough */}
          {Array.from({ length: 13 }).map((_, i) => {
            const cx = i * 32 + 16;
            return <circle key={`trough-${cx}`} cx={cx} cy={13.5} r={3} fill="#F5B731" />;
          })}

          {/* Yellow dots between the curves (at each scallop cusp / peak) */}
          {Array.from({ length: 14 }).map((_, i) => {
            const cx = i * 32;
            return <circle key={`cusp-${cx}`} cx={cx} cy={5} r={2.8} fill="#F5B731" />;
          })}
        </svg>
      </div>
    </>
  );
}

/** Rich Sacred Indian Chakra / Rangoli Mandala SVG (Exported for reuse in Footer) */
export function ChakraMandalaSVG({ size = 200 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      {/* Concentric rings */}
      <circle cx="120" cy="120" r="114" stroke="#F5B731" strokeWidth="0.8" strokeDasharray="3 3" />
      <circle cx="120" cy="120" r="106" stroke="#F5B731" strokeWidth="1.2" />
      <circle cx="120" cy="120" r="88" stroke="#F5B731" strokeWidth="1" strokeDasharray="4 3" />
      <circle cx="120" cy="120" r="70" stroke="#F5B731" strokeWidth="1.2" />
      <circle cx="120" cy="120" r="48" stroke="#F5B731" strokeWidth="1" />
      <circle cx="120" cy="120" r="28" stroke="#F5B731" strokeWidth="1.2" strokeDasharray="3 3" />
      <circle cx="120" cy="120" r="14" stroke="#F5B731" strokeWidth="1.4" />
      <circle cx="120" cy="120" r="4" fill="#F5B731" />

      {/* 16 Chakra Spokes connecting center to middle ring */}
      {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map((deg) => (
        <line
          key={`spoke-${deg}`}
          x1="120"
          y1="106"
          x2="120"
          y2="70"
          stroke="#F5B731"
          strokeWidth="0.9"
          transform={`rotate(${deg} 120 120)`}
        />
      ))}

      {/* 16 Outer Lotus Petals */}
      {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map((deg) => (
        <g key={`petal-${deg}`} transform={`rotate(${deg} 120 120)`}>
          <path
            d="M 120 70 C 112 50, 111 36, 120 22 C 129 36, 128 50, 120 70 Z"
            stroke="#F5B731"
            strokeWidth="1.1"
            fill="none"
          />
          <path
            d="M 120 52 C 116 42, 116 34, 120 25 C 124 34, 124 42, 120 52 Z"
            stroke="#F5B731"
            strokeWidth="0.75"
            fill="none"
          />
          <circle cx="120" cy="18" r="2.2" fill="#F5B731" />
        </g>
      ))}

      {/* Small decorative beads between petals */}
      {[11.25, 33.75, 56.25, 78.75, 101.25, 123.75, 146.25, 168.75, 191.25, 213.75, 236.25, 258.75, 281.25, 303.75, 326.25, 348.75].map((deg) => (
        <circle
          key={`bead-${deg}`}
          cx="120"
          cy="34"
          r="1.5"
          fill="#F5B731"
          transform={`rotate(${deg} 120 120)`}
        />
      ))}
    </svg>
  );
}

/** 4-point gold sparkle star */
function SparkleStar({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 0 C12 6.5 6.5 12 0 12 C6.5 12 12 17.5 12 24 C12 17.5 17.5 12 24 12 C17.5 12 12 6.5 12 0 Z"
        fill="#FFD166"
      />
    </svg>
  );
}
