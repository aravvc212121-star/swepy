"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingShell from "@/components/helper-onboarding-shell";
import { useHelper } from "@/lib/helper-store";
import { HELPER_CONFIG, SHIFT_LABELS } from "@/lib/helper-types";
import type { ShiftSlot } from "@/lib/helper-types";

const SHIFTS: ShiftSlot[] = ["morning", "afternoon", "evening"];
const DAYS = [3, 4, 5, 6, 7];

function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

export default function Step5() {
  const router = useRouter();
  const { profile, updateProfile } = useHelper();
  const [amount, setAmount] = useState(profile.min_daily_amount);
  const [shifts, setShifts] = useState<ShiftSlot[]>(profile.preferred_shifts);
  const [days, setDays] = useState(profile.days_per_week);

  const toggleShift = (s: ShiftSlot) => setShifts(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const canContinue = shifts.length > 0 && days >= 3;

  const handleSubmit = () => {
    updateProfile({
      min_daily_amount: amount,
      preferred_shifts: shifts,
      days_per_week: days,
      onboarding_step: Math.max(profile.onboarding_step, 5),
    });
    router.push("/helper/onboarding/6");
  };

  return (
    <OnboardingShell step={5} title="Your minimum for a day" subtitle="Set your daily earning preference" onSubmit={handleSubmit} disabled={!canContinue}>
      {/* Amount card */}
      <div className="rounded-[14px] p-5 mb-4 text-center" style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}>
        <p className="text-[32px] font-medium text-ink mb-1">{formatINR(amount)}</p>
        <p className="text-[13px] text-ink-muted mb-4">About 8 hours. Most helpers ask {HELPER_CONFIG.min_daily_range_display}</p>
        <div className="flex items-center justify-center gap-6">
          <button type="button" data-pressable=""
            onClick={() => setAmount(a => Math.max(HELPER_CONFIG.min_daily_min, a - HELPER_CONFIG.min_daily_step))}
            className="w-11 h-11 rounded-full flex items-center justify-center text-[20px] font-medium no-select"
            style={{ backgroundColor: "var(--teal-soft)", color: "var(--teal-dark)", border: "1px solid var(--teal)" }}>
            −
          </button>
          {/* Progress bar */}
          <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ backgroundColor: "var(--step-inactive)", maxWidth: 160 }}>
            <div className="h-full rounded-full" style={{
              backgroundColor: "var(--teal)",
              width: `${((amount - HELPER_CONFIG.min_daily_min) / (HELPER_CONFIG.min_daily_max - HELPER_CONFIG.min_daily_min)) * 100}%`,
            }} />
          </div>
          <button type="button" data-pressable=""
            onClick={() => setAmount(a => Math.min(HELPER_CONFIG.min_daily_max, a + HELPER_CONFIG.min_daily_step))}
            className="w-11 h-11 rounded-full flex items-center justify-center text-[20px] font-medium no-select"
            style={{ backgroundColor: "var(--teal-soft)", color: "var(--teal-dark)", border: "1px solid var(--teal)" }}>
            +
          </button>
        </div>
      </div>

      {/* Shifts */}
      <label className="text-[12px] font-medium text-ink-muted mb-2 block">Preferred shifts</label>
      <div className="flex gap-2 mb-4">
        {SHIFTS.map(s => (
          <button key={s} type="button" onClick={() => toggleShift(s)} data-pressable="" aria-pressed={shifts.includes(s)}
            className="flex-1 py-2.5 rounded-[10px] text-[12px] font-medium no-select text-center"
            style={{
              backgroundColor: shifts.includes(s) ? "var(--brand-rose)" : "var(--surface)",
              color: shifts.includes(s) ? "#fff" : "var(--ink)",
              border: `1px solid ${shifts.includes(s) ? "var(--brand-rose)" : "var(--surface-border)"}`,
            }}>
            {SHIFT_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Days per week */}
      <label className="text-[12px] font-medium text-ink-muted mb-2 block">Days per week</label>
      <div className="flex gap-2 mb-5">
        {DAYS.map(d => (
          <button key={d} type="button" onClick={() => setDays(d)} data-pressable="" aria-pressed={days === d}
            className="flex-1 py-2.5 rounded-[10px] text-[13px] font-medium no-select"
            style={{
              backgroundColor: days === d ? "var(--brand-rose)" : "var(--surface)",
              color: days === d ? "#fff" : "var(--ink)",
              border: `1px solid ${days === d ? "var(--brand-rose)" : "var(--surface-border)"}`,
            }}>
            {d}
          </button>
        ))}
      </div>

      {/* Info note */}
      <div className="rounded-[10px] p-3" style={{ backgroundColor: "var(--teal-soft)" }}>
        <p className="text-[12px]" style={{ color: "var(--teal-dark)" }}>
          Swepy tops up to the guaranteed amount for a shift once you are approved. The guarantee is confirmed by the team based on your area and availability.
        </p>
      </div>
    </OnboardingShell>
  );
}
