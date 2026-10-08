"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import OnboardingShell from "@/components/helper-onboarding-shell";
import { useHelper } from "@/lib/helper-store";
import type { IdType } from "@/lib/helper-types";
import { IconCheck, IconShieldCheck } from "@/components/icons";

/* ── ID option cards ── */
const ID_OPTIONS: { type: IdType; title: string; hint: string }[] = [
  { type: "pan", title: "PAN card", hint: "Quickest to verify" },
  { type: "aadhaar", title: "Aadhaar card", hint: "Only the last 4 digits are kept" },
  { type: "driving_licence", title: "Driving licence", hint: "Photo ID with address" },
];

const ID_FIELD: Record<IdType, { label: string; placeholder: string; pattern: string }> = {
  pan: { label: "PAN number", placeholder: "ABCDE1234F", pattern: "^[A-Z]{5}[0-9]{4}[A-Z]$" },
  aadhaar: { label: "Aadhaar number", placeholder: "1234 5678 9012", pattern: "^\\d{12}$" },
  driving_licence: { label: "Licence number", placeholder: "KA0120190012345", pattern: "^[A-Z0-9]{15,16}$" },
};

/* ── Validators ── */
function validatePAN(v: string) { return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v); }
function validateAadhaar(v: string) {
  const digits = v.replace(/\s/g, "");
  if (!/^\d{12}$/.test(digits)) return false;
  // Simplified Verhoeff check — accept 12 digits for the mock
  return true;
}
function validateDL(v: string) { return /^[A-Z0-9]{15,16}$/.test(v.replace(/\s/g, "")); }

function validateId(type: IdType, value: string): string | null {
  const clean = value.replace(/\s/g, "").toUpperCase();
  if (type === "pan" && !validatePAN(clean)) return "Enter a valid PAN (e.g. ABCDE1234F)";
  if (type === "aadhaar" && !validateAadhaar(clean)) return "Enter a valid 12-digit Aadhaar number";
  if (type === "driving_licence" && !validateDL(clean)) return "Enter a valid 15-16 character licence number";
  return null;
}

/* Camera icon */
const IconCamera = ({ size = 24, className, style }: { size?: number; className?: string; style?: React.CSSProperties }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
    <path d="M5 7h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2" />
    <path d="M9 13a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
  </svg>
);

export default function Step1() {
  const router = useRouter();
  const { profile, updateProfile } = useHelper();
  const [idType, setIdType] = useState<IdType | undefined>(profile.id_type);
  const [idNumber, setIdNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [frontFile, setFrontFile] = useState<string | null>(null);
  const [backFile, setBackFile] = useState<string | null>(null);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  const needsBack = idType === "aadhaar" || idType === "driving_licence";

  const handleFile = (side: "front" | "back") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) return;
    // Simulate compression — just store a data URL
    const reader = new FileReader();
    reader.onload = () => {
      if (side === "front") setFrontFile(reader.result as string);
      else setBackFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const canContinue = !!(idType && idNumber.trim() && frontFile && (!needsBack || backFile));

  const handleSubmit = () => {
    if (!idType || !idNumber.trim()) return;
    const err = validateId(idType, idNumber);
    if (err) { setError(err); return; }
    setError(null);
    updateProfile({ id_type: idType, onboarding_step: Math.max(profile.onboarding_step, 1) });
    router.push("/helper/onboarding/2");
  };

  return (
    <OnboardingShell
      step={1}
      title="Verify your identity"
      subtitle="Choose one document to get started"
      onSubmit={handleSubmit}
      disabled={!canContinue}
    >
      {/* ID type cards */}
      <div className="flex flex-col gap-2 mb-5">
        {ID_OPTIONS.map((opt) => {
          const selected = idType === opt.type;
          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => { setIdType(opt.type); setError(null); setIdNumber(""); setFrontFile(null); setBackFile(null); }}
              data-pressable=""
              className="w-full flex items-center gap-3 rounded-[14px] p-4 text-left no-select"
              style={{
                backgroundColor: selected ? "var(--teal-soft)" : "var(--surface)",
                border: `1.5px solid ${selected ? "var(--teal)" : "var(--surface-border)"}`,
              }}
              aria-pressed={selected}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: selected ? "var(--teal)" : "transparent",
                  border: selected ? "none" : "1.5px solid var(--surface-border)",
                }}
              >
                {selected && <IconCheck size={12} className="text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-ink">{opt.title}</p>
                <p className="text-[12px] text-ink-muted">{opt.hint}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ID number field */}
      {idType && (
        <div className="mb-5">
          <label className="text-[12px] font-medium text-ink-muted mb-1 block">
            {ID_FIELD[idType].label}
          </label>
          <input
            type="text"
            placeholder={ID_FIELD[idType].placeholder}
            value={idNumber}
            onChange={(e) => { setIdNumber(e.target.value.toUpperCase()); setError(null); }}
            className="w-full h-[44px] rounded-[10px] px-3 text-[14px] text-ink outline-none"
            style={{
              backgroundColor: "var(--surface)",
              border: `1px solid ${error ? "#B3261E" : "var(--surface-border)"}`,
              caretColor: "var(--brand-rose)",
            }}
          />
          {error && <p className="text-[12px] mt-1" style={{ color: "#B3261E" }}>{error}</p>}
        </div>
      )}

      {/* Upload tiles */}
      {idType && (
        <div className="flex gap-3 mb-5">
          {/* Front */}
          <div className="flex-1">
            <input ref={frontRef} type="file" accept="image/jpeg,image/png" capture="environment" className="hidden" onChange={handleFile("front")} />
            {frontFile ? (
              <button
                type="button"
                onClick={() => frontRef.current?.click()}
                className="w-full rounded-[12px] p-3 text-center no-select"
                style={{ backgroundColor: "var(--sage-soft)", border: "1px solid var(--sage)" }}
                data-pressable=""
              >
                <IconCheck size={20} style={{ color: "var(--sage)", margin: "0 auto 4px" }} />
                <p className="text-[13px] font-medium" style={{ color: "var(--sage-text)" }}>Front added</p>
                <p className="text-[11px] text-ink-muted">Tap to retake</p>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => frontRef.current?.click()}
                className="w-full rounded-[12px] p-4 text-center no-select"
                style={{ border: "1.5px dashed var(--surface-border)" }}
                data-pressable=""
              >
                <IconCamera size={24} style={{ color: "var(--teal)", margin: "0 auto 6px" }} />
                <p className="text-[13px] font-medium text-ink">Front</p>
                <p className="text-[11px] text-ink-muted">Take photo or upload</p>
              </button>
            )}
          </div>

          {/* Back (if needed) */}
          {needsBack && (
            <div className="flex-1">
              <input ref={backRef} type="file" accept="image/jpeg,image/png" capture="environment" className="hidden" onChange={handleFile("back")} />
              {backFile ? (
                <button
                  type="button"
                  onClick={() => backRef.current?.click()}
                  className="w-full rounded-[12px] p-3 text-center no-select"
                  style={{ backgroundColor: "var(--sage-soft)", border: "1px solid var(--sage)" }}
                  data-pressable=""
                >
                  <IconCheck size={20} style={{ color: "var(--sage)", margin: "0 auto 4px" }} />
                  <p className="text-[13px] font-medium" style={{ color: "var(--sage-text)" }}>Back added</p>
                  <p className="text-[11px] text-ink-muted">Tap to retake</p>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => backRef.current?.click()}
                  className="w-full rounded-[12px] p-4 text-center no-select"
                  style={{ border: "1.5px dashed var(--surface-border)" }}
                  data-pressable=""
                >
                  <IconCamera size={24} style={{ color: "var(--teal)", margin: "0 auto 6px" }} />
                  <p className="text-[13px] font-medium text-ink">Back</p>
                  <p className="text-[11px] text-ink-muted">Take photo or upload</p>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Info note */}
      <div
        className="rounded-[10px] p-3 flex items-start gap-2"
        style={{ backgroundColor: "var(--teal-soft)" }}
      >
        <IconShieldCheck size={18} style={{ color: "var(--teal)", marginTop: 1 }} className="shrink-0" />
        <p className="text-[12px]" style={{ color: "var(--teal-dark)" }}>
          Documents are encrypted and stored securely. A full Aadhaar number is never stored — only the last 4 digits.
        </p>
      </div>

      {/* Dev shortcut */}
      <button
        type="button"
        onClick={() => {
          updateProfile({
            full_name: "Dev Helper",
            kyc_status: "approved",
            onboarding_step: 7,
            experience: "1_2_years",
            skills: ["sweeping_mopping", "utensils", "dusting"],
            languages: ["english", "hindi"],
          });
          router.push("/helper/orders");
        }}
        className="w-full h-10 mt-4 rounded-[12px] text-[13px] font-medium no-select"
        style={{ border: "1px dashed var(--teal)", color: "var(--teal)" }}
      >
        Skip to helper app (Dev)
      </button>
    </OnboardingShell>
  );
}
