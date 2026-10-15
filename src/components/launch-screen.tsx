"use client";

import { useEffect, useState } from "react";
import BrandLogo from "@/components/brand-logo";

export default function LaunchScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Only show in standalone mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (!isStandalone) return;

    setVisible(true);

    // Remove once the page is ready (no artificial delay)
    const remove = () => {
      setFading(true);
      setTimeout(() => setVisible(false), 200);
    };

    if (document.readyState === "complete") {
      // Already loaded — use a single rAF to let paint happen
      requestAnimationFrame(remove);
    } else {
      window.addEventListener("load", remove, { once: true });
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center"
      style={{
        backgroundColor: "#b3295b",
        opacity: fading ? 0 : 1,
        transition: "opacity 200ms ease-out",
      }}
    >
      <BrandLogo size={96} priority />
      {/* Wordmark */}
      <span
        className="text-2xl font-medium tracking-tight mt-4"
        style={{ color: "#FFFFFF" }}
      >
        swepy
        <span
          className="inline-block rounded-full relative"
          style={{
            width: 5,
            height: 5,
            backgroundColor: "#F5B731",
            top: -2,
            marginLeft: 1,
          }}
        />
      </span>
      {/* Thin divider */}
      <div
        className="mt-3"
        style={{
          width: 40,
          height: 1,
          backgroundColor: "rgba(255,255,255,0.35)",
        }}
      />
      {/* Tagline */}
      <p
        className="mt-2.5 text-[12px] font-normal tracking-wide"
        style={{ color: "rgba(255,255,255,0.55)" }}
      >
        get your helper in minutes
      </p>
    </div>
  );
}
