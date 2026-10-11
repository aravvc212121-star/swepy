"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export interface UseScrollNavOptions {
  /**
   * Minimum pixels scrolled upwards to reveal the navbar.
   * Kept small (4px) so "if i scroll up even little it comes".
   */
  upThreshold?: number;
  /**
   * Minimum pixels scrolled downwards to hide the navbar.
   * Kept at 8px to prevent micro-tap tremors from hiding it.
   */
  downThreshold?: number;
  /**
   * Always show navbar when within this distance from the top.
   */
  topThreshold?: number;
}

/**
 * Custom hook to detect scroll direction and toggle navbar visibility.
 * - Scrolling DOWN: hides the navbar smoothly.
 * - Scrolling UP even a little bit: immediately brings the navbar back into view.
 * - At top of page: always kept visible.
 * - Route change: resets to visible.
 */
export function useScrollNav(options: UseScrollNavOptions = {}) {
  const {
    upThreshold = 8,
    downThreshold = 24,
    topThreshold = 20,
  } = options;

  const [isVisible, setIsVisible] = useState(true);
  const pathname = usePathname();
  const isVisibleRef = useRef(true);

  // Sync ref with state
  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  // Always show on page route change
  useEffect(() => {
    setIsVisible(true);
    isVisibleRef.current = true;
  }, [pathname]);

  useEffect(() => {
    let prevY = typeof window !== "undefined" ? window.scrollY : 0;
    let upScrollAccumulator = 0;
    let downScrollAccumulator = 0;
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = window.innerHeight;
        const maxScroll = scrollHeight - clientHeight;

        // 1. If at or near the very top (or iOS negative rubber-band overscroll), always show
        if (currentY <= topThreshold) {
          if (!isVisibleRef.current) {
            setIsVisible(true);
            isVisibleRef.current = true;
          }
          upScrollAccumulator = 0;
          downScrollAccumulator = 0;
          prevY = Math.max(0, currentY);
          ticking = false;
          return;
        }

        // 2. Prevent rubber-band bounce past bottom on iOS/macOS from causing false triggers
        if (maxScroll > 0 && currentY > maxScroll + 10) {
          prevY = currentY;
          ticking = false;
          return;
        }

        const delta = currentY - prevY;

        if (delta < 0) {
          // Scrolling UP
          downScrollAccumulator = 0;
          upScrollAccumulator += Math.abs(delta);

          if (upScrollAccumulator >= upThreshold) {
            if (!isVisibleRef.current) {
              setIsVisible(true);
              isVisibleRef.current = true;
            }
            upScrollAccumulator = 0;
          }
        } else if (delta > 0) {
          // Scrolling DOWN
          upScrollAccumulator = 0;
          downScrollAccumulator += delta;

          if (downScrollAccumulator >= downThreshold) {
            if (isVisibleRef.current) {
              setIsVisible(false);
              isVisibleRef.current = false;
            }
            downScrollAccumulator = 0;
          }
        }

        prevY = currentY;
        ticking = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [upThreshold, downThreshold, topThreshold]);

  return isVisible;
}
