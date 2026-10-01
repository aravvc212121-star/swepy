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
      className="fixed inset-0 z-[70] flex items-center justify-center"
      style={{
        backgroundColor: "#B3225A",
        opacity: fading ? 0 : 1,
        transition: "opacity 200ms ease-out",
      }}
    >
      <BrandLogo size={96} priority />
    </div>
  );
}
