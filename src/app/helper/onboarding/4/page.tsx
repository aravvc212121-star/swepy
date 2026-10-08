"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import OnboardingShell from "@/components/helper-onboarding-shell";
import { useHelper } from "@/lib/helper-store";
import { IconCheck } from "@/components/icons";

const PROMPTS = ["Look straight at the camera", "Blink slowly", "Turn your head left"];

export default function Step4() {
  const router = useRouter();
  const { profile, updateProfile } = useHelper();
  const [started, setStarted] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [done, setDone] = useState(profile.face_verified);
  const [consent, setConsent] = useState(profile.consents.face_data);

  // Mock face-check: advance prompts with timers
  useEffect(() => {
    if (!started || done) return;
    if (currentPrompt >= PROMPTS.length) { setDone(true); return; }
    const t = setTimeout(() => setCurrentPrompt(p => p + 1), 2000);
    return () => clearTimeout(t);
  }, [started, currentPrompt, done]);

  const handleSubmit = () => {
    updateProfile({
      face_verified: true,
      consents: { ...profile.consents, face_data: consent },
      onboarding_step: Math.max(profile.onboarding_step, 4),
    });
    router.push("/helper/onboarding/5");
  };

  return (
    <OnboardingShell step={4} title="Verify your face" subtitle="Quick liveness check to match your ID" onSubmit={handleSubmit} disabled={!done || !consent}>
      {/* Face frame */}
      <div
        className="rounded-[20px] flex items-center justify-center mx-auto mb-5"
        style={{
          width: 220, height: 280,
          backgroundColor: "var(--teal-soft)",
          border: `3px ${done ? "solid var(--sage)" : "dashed var(--teal)"}`,
        }}
      >
        {done ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: "var(--sage)" }}>
              <IconCheck size={28} className="text-white" />
            </div>
            <p className="text-[14px] font-medium" style={{ color: "var(--sage-text)" }}>Verified</p>
          </div>
        ) : started ? (
          <p className="text-[14px] font-medium text-center px-4" style={{ color: "var(--teal-dark)" }}>
            {currentPrompt < PROMPTS.length ? PROMPTS[currentPrompt] : "Processing…"}
          </p>
        ) : (
          <div className="text-center px-4">
            <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ border: "2px dashed var(--teal)" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" /><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
              </svg>
            </div>
            <p className="text-[13px] text-ink-muted">Position your face in the oval</p>
          </div>
        )}
      </div>

      {/* Prompt checklist */}
      <div className="flex flex-col gap-2 mb-5">
        {PROMPTS.map((p, i) => {
          const completed = currentPrompt > i;
          const active = started && currentPrompt === i;
          return (
            <div key={i} className="flex items-center gap-3 rounded-[10px] px-3 py-2.5"
              style={{ backgroundColor: completed ? "var(--sage-soft)" : active ? "var(--teal-soft)" : "var(--surface)", border: `0.5px solid ${completed ? "var(--sage)" : active ? "var(--teal)" : "var(--surface-border)"}` }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: completed ? "var(--sage)" : "transparent", border: completed ? "none" : "1.5px solid var(--surface-border)" }}>
                {completed && <IconCheck size={12} className="text-white" />}
              </div>
              <span className="text-[13px] font-medium" style={{ color: completed ? "var(--sage-text)" : active ? "var(--teal-dark)" : "var(--ink-muted)" }}>{p}</span>
            </div>
          );
        })}
      </div>

      {/* Start button */}
      {!started && !done && (
        <button type="button" onClick={() => setStarted(true)} data-pressable=""
          className="w-full h-11 rounded-[12px] text-[14px] font-medium text-white mb-4 no-select"
          style={{ backgroundColor: "var(--teal)" }}>
          Start face check
        </button>
      )}

      {/* Success note */}
      {done && (
        <div className="rounded-[10px] p-3 mb-4" style={{ backgroundColor: "var(--sage-soft)" }}>
          <p className="text-[13px] font-medium" style={{ color: "var(--sage-text)" }}>Face verification complete. Your identity has been matched.</p>
        </div>
      )}

      {/* Consent checkbox */}
      <label className="flex items-start gap-3 py-2 text-[13px] text-ink cursor-pointer" role="checkbox" aria-checked={consent}>
        <div className="w-5 h-5 rounded-[4px] flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: consent ? "var(--brand-rose)" : "var(--surface)", border: consent ? "none" : "1.5px solid var(--surface-border)" }}
          onClick={() => setConsent(!consent)}>
          {consent && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5l10 -10" /></svg>}
        </div>
        <span onClick={() => setConsent(!consent)}>Face data is used only for verification and can be withdrawn any time</span>
      </label>
    </OnboardingShell>
  );
}
