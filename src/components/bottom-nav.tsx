"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconHome, IconClipboardList, IconNavigation, IconClock } from "./icons";

const navItems = [
  { href: "/", label: "Home", icon: IconHome },
  { href: "/activity", label: "Activity", icon: IconClock },
  { href: "/orders", label: "Booking", icon: IconClipboardList },
  { href: "/booking/demo", label: "Tracking", icon: IconNavigation },
];

function getActiveIndex(pathname: string): number {
  if (pathname === "/") return 0;
  if (pathname.startsWith("/booking")) return 2; // Tracking tab active for any /booking/[id] route
  if (pathname.startsWith("/orders")) return 1;
  const idx = navItems.findIndex((item) => item.href !== "/" && pathname.startsWith(item.href));
  return idx >= 0 ? idx : -1;
}

/**
 * BottomNav — floating pill with clear active tab state.
 *
 * Fixes applied:
 * - No e.preventDefault() — Links navigate naturally on tap
 * - No onMouseEnter/onMouseLeave — no hover-dependent highlight movement
 * - No setPointerCapture — no interference with touch events
 * - No touch-action: none on capsule — browser handles scrolling
 * - Active state from usePathname, styled via aria-current="page"
 * - pointer-events: none on decorative layers, auto on tabs only
 */
export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const activeIdx = getActiveIndex(pathname);

  const capsuleRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const prefersReducedMotion = useRef(false);

  const touchStartRef = useRef(0);
  const currentLeftRef = useRef(0);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const moveHighlightTo = useCallback((targetIdx: number, animate: boolean) => {
    const hl = highlightRef.current;
    const capsule = capsuleRef.current;
    if (!hl || !capsule || targetIdx < 0) {
      if (hl) hl.style.opacity = "0";
      return;
    }

    const tab = tabRefs.current[targetIdx];
    if (!tab) return;

    const capsuleRect = capsule.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    const left = tabRect.left - capsuleRect.left;
    const width = tabRect.width;

    const fast = prefersReducedMotion.current || !animate;

    hl.style.transition = fast
      ? "none"
      : "left 350ms cubic-bezier(0.34, 1.2, 0.64, 1), width 350ms cubic-bezier(0.34, 1.2, 0.64, 1), opacity 150ms ease-out";
    hl.style.left = `${left}px`;
    hl.style.width = `${width}px`;
    hl.style.opacity = "1";
  }, []);

  // Sync highlight with route changes
  useEffect(() => {
    moveHighlightTo(activeIdx, true);
  }, [activeIdx, moveHighlightTo]);

  // Initialize highlight position after mount
  useEffect(() => {
    requestAnimationFrame(() => {
      moveHighlightTo(activeIdx, false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
    isDraggingRef.current = false;
    const hl = highlightRef.current;
    if (hl) {
      currentLeftRef.current = parseFloat(hl.style.left || "0");
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - touchStartRef.current;
    
    if (!isDraggingRef.current && Math.abs(deltaX) > 10) {
      isDraggingRef.current = true;
    }
    
    if (isDraggingRef.current) {
      const hl = highlightRef.current;
      const capsule = capsuleRef.current;
      if (!hl || !capsule) return;
      
      const capsuleRect = capsule.getBoundingClientRect();
      let newLeft = currentLeftRef.current + deltaX;
      
      if (newLeft < 0) newLeft = 0;
      if (newLeft > capsuleRect.width - hl.offsetWidth) newLeft = capsuleRect.width - hl.offsetWidth;
      
      hl.style.transition = "none";
      hl.style.left = `${newLeft}px`;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    
    const hl = highlightRef.current;
    const capsule = capsuleRef.current;
    if (!hl || !capsule) {
      isDraggingRef.current = false;
      return;
    }
    
    const highlightCenter = parseFloat(hl.style.left || "0") + (hl.offsetWidth / 2);
    
    let closestIdx = activeIdx;
    let minDistance = Infinity;
    
    tabRefs.current.forEach((tab, idx) => {
      if (!tab) return;
      const capsuleRect = capsule.getBoundingClientRect();
      const tabRect = tab.getBoundingClientRect();
      const tabLeft = tabRect.left - capsuleRect.left;
      const tabCenter = tabLeft + (tabRect.width / 2);
      
      const dist = Math.abs(highlightCenter - tabCenter);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    setTimeout(() => {
      isDraggingRef.current = false;
    }, 50);
    
    if (closestIdx !== activeIdx && closestIdx >= 0) {
      moveHighlightTo(closestIdx, true);
      router.push(navItems[closestIdx].href);
    } else {
      moveHighlightTo(activeIdx, true);
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-20 flex justify-center pointer-events-none no-select"
      style={{ padding: "8px 16px calc(env(safe-area-inset-bottom, 8px) + 8px)" }}
      aria-label="Main navigation"
    >
      <div
        ref={capsuleRef}
        className="relative w-full overflow-hidden rounded-[20px] pointer-events-auto"
        style={{ touchAction: "pan-y" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* Glass layer — decorative, no pointer events */}
        <div
          className="capsule-glass absolute inset-0 rounded-[20px] pointer-events-none"
          style={{
            background: "rgba(255, 255, 255, 0.4)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "0.5px solid var(--surface-border)",
          }}
        />

        {/* Highlight pill — active tab indicator */}
        <div
          ref={highlightRef}
          className="capsule-highlight absolute rounded-[20px] pointer-events-none"
          style={{
            top: "4px",
            bottom: "4px",
            background: "rgba(255, 228, 238, 0.2)",
            border: "1px solid rgba(255, 190, 210, 0.3)",
            borderRadius: "16px",
            willChange: "left, width",
          }}
        />

        {/* Tab items */}
        <div className="relative flex items-center h-16">
          {navItems.map((item, idx) => {
            const isActive = idx === activeIdx;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                ref={(el) => { tabRefs.current[idx] = el; }}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                data-pressable=""
                onClick={(e) => {
                  if (isDraggingRef.current) {
                    e.preventDefault();
                  } else {
                    moveHighlightTo(idx, true);
                  }
                }}
                className="group flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] min-w-[64px] relative z-10 no-underline outline-none focus-visible:ring-2 focus-visible:ring-brand-rose focus-visible:ring-offset-2 rounded-[20px] no-select"
                style={{
                  color: isActive ? "#1F2937" : "#6B7280",
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                <div className={`transition-transform duration-200 ${isActive ? "scale-[1.15]" : "scale-100"} group-hover:scale-125`}>
                  <Icon size={32} strokeWidth={1.25} />
                </div>
                <span className="text-[11px] leading-none" style={{ fontWeight: "inherit" }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
