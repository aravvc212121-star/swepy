"use client";

import Link from "next/link";
import { IconArrowLeft } from "@/components/icons";
import type { ReactNode } from "react";

/* ── Progress bar: 6 segments ── */
function ProgressBar({ current, total = 6 }: { current: number; total?: number }) {
  return (
    <div className="flex gap-1.5 mb-5">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const color =
          step < current ? "var(--sage)" : step === current ? "var(--teal)" : "var(--step-inactive)";
        return (
          <div
            key={i}
            className="flex-1 h-[4px] rounded-full"
            style={{ backgroundColor: color }}
          />
        );
      })}
    </div>
  );
}

/* ── Onboarding shell ── */
export default function OnboardingShell({
  step,
  title,
  subtitle,
  children,
  buttonLabel = "Continue",
  onSubmit,
  disabled = false,
  backHref,
}: {
  step: number;
  title: string;
  subtitle: string;
  children: ReactNode;
  buttonLabel?: string;
  onSubmit: () => void;
  disabled?: boolean;
  backHref?: string;
}) {
  const back = backHref ?? (step > 1 ? `/helper/onboarding/${step - 1}` : "/");

  return (
    <div className="w-full max-w-[430px] mx-auto min-h-dvh flex flex-col bg-app-bg">
      {/* Top bar */}
      <div className="shrink-0 px-4" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
        <div className="flex items-center justify-between mb-3">
          <Link
            href={back}
            className="w-9 h-9 flex items-center justify-center rounded-full no-select"
            style={{ border: "0.5px solid var(--surface-border)" }}
            aria-label="Back"
          >
            <IconArrowLeft size={18} className="text-ink" />
          </Link>
          <span className="text-[13px] font-medium text-ink-muted">
            Step {step} of 6
          </span>
        </div>

        <ProgressBar current={step} />

        <h1 className="text-[22px] font-medium text-ink leading-tight">{title}</h1>
        <p className="text-[14px] text-ink-muted mt-1 mb-5">{subtitle}</p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4" style={{ paddingBottom: 100 }}>
        {children}
      </div>

      {/* Sticky bottom button */}
      <div
        className="shrink-0 px-4 py-3"
        style={{
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          borderTop: "0.5px solid var(--surface-border)",
          backgroundColor: "var(--app-bg)",
        }}
      >
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          data-pressable=""
          className="w-full h-12 rounded-[12px] text-[15px] font-medium text-white no-select"
          style={{
            backgroundColor: disabled ? "var(--step-inactive)" : "var(--brand-rose)",
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
