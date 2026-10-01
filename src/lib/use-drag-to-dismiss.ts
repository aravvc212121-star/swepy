"use client";

import { useRef, useCallback, useEffect } from "react";

interface DragToDismissOptions {
  /** Whether the drag is enabled */
  enabled: boolean;
  /** Called when the user dismisses via drag */
  onDismiss: () => void;
  /** Direction: 'down' for sheets, 'up' for top banners */
  direction?: "down" | "up";
  /** Whether to allow horizontal swipe to dismiss */
  horizontal?: boolean;
  /** Fraction of sheet height to trigger dismiss (default 0.25) */
  threshold?: number;
  /** Velocity threshold in px/ms (default 0.5) */
  velocityThreshold?: number;
  /** Resistance factor for upward drag when direction is 'down' (default 0.2) */
  resistance?: number;
  /** Duration for dismiss animation in ms (default 180) */
  dismissDuration?: number;
  /** Duration for spring-back animation in ms (default 200) */
  springBackDuration?: number;
  /** Callback to update scrim opacity during drag (0-1) */
  onScrimUpdate?: (opacity: number) => void;
  /** Ref to the scrollable content inside the sheet */
  contentScrollRef?: React.RefObject<HTMLElement | null>;
}

interface VelocitySample {
  time: number;
  pos: number;
}

export function useDragToDismiss({
  enabled,
  onDismiss,
  direction = "down",
  horizontal = false,
  threshold = 0.25,
  velocityThreshold = 0.5,
  resistance = 0.2,
  dismissDuration = 180,
  springBackDuration = 200,
  onScrimUpdate,
  contentScrollRef,
}: DragToDismissOptions) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startX = useRef(0);
  const currentTranslate = useRef(0);
  const velocitySamples = useRef<VelocitySample[]>([]);
  const startedFromHandle = useRef(false);
  const prefersReduced = useRef(false);

  useEffect(() => {
    prefersReduced.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  const getVelocity = useCallback((): number => {
    const samples = velocitySamples.current;
    if (samples.length < 2) return 0;
    const now = performance.now();
    // Only use samples from the last 100ms
    const recent = samples.filter((s) => now - s.time < 100);
    if (recent.length < 2) {
      // Fall back to last two samples
      const last = samples[samples.length - 1];
      const prev = samples[samples.length - 2];
      return (last.pos - prev.pos) / (last.time - prev.time);
    }
    const first = recent[0];
    const last = recent[recent.length - 1];
    return (last.pos - first.pos) / (last.time - first.time);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, fromHandle: boolean) => {
      if (!enabled) return;
      if (!fromHandle) {
        const scrollEl = contentScrollRef?.current;
        if (scrollEl && scrollEl.scrollTop > 0) return;
      }
      isDragging.current = true;
      startedFromHandle.current = fromHandle;
      startY.current = e.clientY;
      startX.current = e.clientX;
      currentTranslate.current = 0;
      velocitySamples.current = [
        { time: performance.now(), pos: horizontal ? e.clientX : e.clientY },
      ];
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (err) {}
    },
    [enabled, horizontal, contentScrollRef]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current || !sheetRef.current) return;

      if (sheetRef.current.style.animation) {
        sheetRef.current.style.animation = "none"; // Disable CSS animation to allow manual transform
      }

      const dy = e.clientY - startY.current;
      const dx = e.clientX - startX.current;

      const delta = horizontal ? dx : dy;
      const isPositive = direction === "down" ? delta > 0 : delta < 0;
      const absDelta = Math.abs(delta);

      // Apply resistance when dragging against dismiss direction
      let translate: number;
      if (isPositive) {
        translate = delta;
      } else {
        translate = delta * resistance;
      }

      currentTranslate.current = translate;

      // Apply transform directly (not via state for performance)
      if (horizontal) {
        sheetRef.current.style.transform = `translateX(${translate}px)`;
      } else {
        sheetRef.current.style.transform = `translateY(${translate}px)`;
      }

      // Update scrim
      if (onScrimUpdate && sheetRef.current) {
        const height = horizontal
          ? sheetRef.current.offsetWidth
          : sheetRef.current.offsetHeight;
        const progress = Math.max(0, 1 - absDelta / height);
        onScrimUpdate(progress);
      }

      velocitySamples.current.push({
        time: performance.now(),
        pos: horizontal ? e.clientX : e.clientY,
      });
      // Keep only last 10 samples
      if (velocitySamples.current.length > 10) {
        velocitySamples.current = velocitySamples.current.slice(-10);
      }
    },
    [direction, horizontal, resistance, onScrimUpdate]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDragging.current || !sheetRef.current) return;
    isDragging.current = false;

    const sheet = sheetRef.current;
    const height = horizontal ? sheet.offsetWidth : sheet.offsetHeight;
    const delta = currentTranslate.current;
    const absDelta = Math.abs(delta);
    const velocity = getVelocity();
    const isPositiveDirection =
      direction === "down" ? delta > 0 : delta < 0;
    const absVelocity = Math.abs(velocity);

    const shouldDismiss =
      isPositiveDirection &&
      (absDelta > height * threshold || absVelocity > velocityThreshold);

    const reduced = prefersReduced.current;

    if (shouldDismiss) {
      // Animate out
      const remaining = height - absDelta;
      const duration = reduced ? 0 : dismissDuration;
      const target = direction === "down" ? height : -height;

      sheet.style.transition = `transform ${duration}ms ease-out`;
      if (horizontal) {
        sheet.style.transform = `translateX(${delta > 0 ? sheet.offsetWidth : -sheet.offsetWidth}px)`;
      } else {
        sheet.style.transform = `translateY(${target}px)`;
      }

      if (onScrimUpdate) onScrimUpdate(0);

      setTimeout(() => {
        sheet.style.transition = "";
        sheet.style.transform = "";
        onDismiss();
      }, duration);
    } else {
      // Spring back
      const duration = reduced ? 0 : springBackDuration;
      sheet.style.transition = `transform ${duration}ms cubic-bezier(0.34, 1.4, 0.64, 1)`;
      sheet.style.transform = horizontal ? "translateX(0)" : "translateY(0)";
      if (onScrimUpdate) onScrimUpdate(1);

      setTimeout(() => {
        if (sheet) sheet.style.transition = "";
      }, duration);
    }
  }, [
    direction,
    horizontal,
    threshold,
    velocityThreshold,
    dismissDuration,
    springBackDuration,
    getVelocity,
    onDismiss,
    onScrimUpdate,
  ]);

  return {
    sheetRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
