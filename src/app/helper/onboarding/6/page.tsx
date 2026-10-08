"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import OnboardingShell from "@/components/helper-onboarding-shell";
import { useHelper } from "@/lib/helper-store";
import { IconCheck, IconShieldCheck } from "@/components/icons";

function Field({ label, placeholder, value, onChange, type }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div className="mb-3">
      <label className="text-[12px] font-medium text-ink-muted mb-1 block">{label}</label>
      <input type={type || "text"} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        className="w-full h-[44px] rounded-[10px] px-3 text-[14px] text-ink outline-none"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--surface-border)", caretColor: "var(--brand-rose)" }} />
    </div>
  );
}

function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-3 py-2 text-[13px] text-ink cursor-pointer" role="checkbox" aria-checked={checked}>
      <div className="w-5 h-5 rounded-[4px] flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: checked ? "var(--brand-rose)" : "var(--surface)", border: checked ? "none" : "1.5px solid var(--surface-border)" }}
        onClick={() => onChange(!checked)}>
        {checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5l10 -10" /></svg>}
      </div>
      <span onClick={() => onChange(!checked)}>{children}</span>
    </label>
  );
}

export default function Step6() {
  const router = useRouter();
  const { profile, updateProfile } = useHelper();
  const ec = profile.emergency_contact;

  // Emergency contact
  const [ecName, setEcName] = useState(ec?.name || "");
  const [ecPhone, setEcPhone] = useState(ec?.phone || "");
  const [ecRelation, setEcRelation] = useState(ec?.relation || "");

  // Police verification
  const [policeOpt, setPoliceOpt] = useState<"has_certificate" | "verify_for_me" | null>(profile.police_verification);
  const [certFile, setCertFile] = useState<string | null>(null);
  const certRef = useRef<HTMLInputElement>(null);

  // Payout
  const [payMethod, setPayMethod] = useState<"upi" | "bank">(profile.payout_account?.method || "upi");
  const [upiId, setUpiId] = useState(profile.payout_account?.upi_id || "");
  const [accNum, setAccNum] = useState(profile.payout_account?.account_number || "");
  const [ifsc, setIfsc] = useState(profile.payout_account?.ifsc || "");
  const [upiVerified, setUpiVerified] = useState(false);

  // Consents
  const [coc, setCoc] = useState(profile.consents.code_of_conduct);
  const [bg, setBg] = useState(profile.consents.background_check);
  const [pp, setPp] = useState(profile.consents.privacy_policy);

  const payoutFilled = payMethod === "upi" ? upiId.includes("@") : (accNum.length >= 8 && ifsc.length >= 11);
  const canSubmit = !!(ecName && ecPhone && ecRelation && policeOpt && payoutFilled && coc && bg && pp);

  const handleVerifyUpi = () => {
    // Mock: pretend UPI is verified
    setUpiVerified(true);
  };

  const handleSubmit = () => {
    updateProfile({
      emergency_contact: { name: ecName, phone: ecPhone, relation: ecRelation },
      police_verification: policeOpt,
      payout_account: payMethod === "upi"
        ? { method: "upi", upi_id: upiId, verified: upiVerified }
        : { method: "bank", account_number: accNum, ifsc, verified: false },
      consents: { ...profile.consents, code_of_conduct: coc, background_check: bg, privacy_policy: pp },
      kyc_status: "submitted",
      onboarding_step: Math.max(profile.onboarding_step, 6),
    });
    router.push("/helper/onboarding/7");
  };

  return (
    <OnboardingShell step={6} title="Safety and trust" subtitle="Emergency contact, verification and payout" onSubmit={handleSubmit} disabled={!canSubmit} buttonLabel="Submit for review">
      {/* Emergency contact */}
      <p className="text-[14px] font-medium text-ink mb-3">Emergency contact</p>
      <Field label="Contact name" placeholder="Full name" value={ecName} onChange={setEcName} />
      <Field label="Phone number" placeholder="+91 98765 43210" value={ecPhone} onChange={setEcPhone} type="tel" />
      <Field label="Relation" placeholder="e.g. Spouse, Parent" value={ecRelation} onChange={setEcRelation} />

      {/* Police verification */}
      <p className="text-[14px] font-medium text-ink mt-4 mb-3">Police verification</p>
      <div className="flex flex-col gap-2 mb-4">
        {([["has_certificate", "I have a certificate"], ["verify_for_me", "Verify for me"]] as const).map(([v, label]) => (
          <button key={v} type="button" onClick={() => setPoliceOpt(v)} data-pressable="" aria-pressed={policeOpt === v}
            className="w-full flex items-center gap-3 rounded-[14px] p-4 text-left no-select"
            style={{
              backgroundColor: policeOpt === v ? "var(--teal-soft)" : "var(--surface)",
              border: `1.5px solid ${policeOpt === v ? "var(--teal)" : "var(--surface-border)"}`,
            }}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: policeOpt === v ? "var(--teal)" : "transparent", border: policeOpt === v ? "none" : "1.5px solid var(--surface-border)" }}>
              {policeOpt === v && <IconCheck size={12} className="text-white" />}
            </div>
            <span className="text-[14px] font-medium text-ink">{label}</span>
          </button>
        ))}
      </div>

      {policeOpt === "has_certificate" && (
        <>
          <input ref={certRef} type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setCertFile(e.target.files[0].name); }} />
          <button type="button" onClick={() => certRef.current?.click()} data-pressable=""
            className="w-full rounded-[12px] p-4 text-center no-select mb-4"
            style={{ border: certFile ? "1px solid var(--sage)" : "1.5px dashed var(--surface-border)", backgroundColor: certFile ? "var(--sage-soft)" : "transparent" }}>
            <p className="text-[13px] font-medium" style={{ color: certFile ? "var(--sage-text)" : "var(--ink)" }}>
              {certFile ? `${certFile} — Tap to replace` : "Upload certificate"}
            </p>
          </button>
        </>
      )}

      {/* Payout account */}
      <p className="text-[14px] font-medium text-ink mt-4 mb-3">Payout account</p>
      <div className="flex gap-2 mb-3">
        {(["upi", "bank"] as const).map(m => (
          <button key={m} type="button" onClick={() => setPayMethod(m)} data-pressable="" aria-pressed={payMethod === m}
            className="flex-1 py-2 rounded-[10px] text-[13px] font-medium no-select"
            style={{
              backgroundColor: payMethod === m ? "var(--brand-rose)" : "var(--surface)",
              color: payMethod === m ? "#fff" : "var(--ink)",
              border: `1px solid ${payMethod === m ? "var(--brand-rose)" : "var(--surface-border)"}`,
            }}>
            {m === "upi" ? "UPI" : "Bank account"}
          </button>
        ))}
      </div>

      {payMethod === "upi" ? (
        <div className="mb-4">
          <label className="text-[12px] font-medium text-ink-muted mb-1 block">UPI ID</label>
          <div className="flex gap-2">
            <input type="text" placeholder="name@upi" value={upiId} onChange={e => { setUpiId(e.target.value); setUpiVerified(false); }}
              className="flex-1 h-[44px] rounded-[10px] px-3 text-[14px] text-ink outline-none"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--surface-border)", caretColor: "var(--brand-rose)" }} />
            <button type="button" onClick={handleVerifyUpi} data-pressable=""
              className="h-[44px] px-4 rounded-[10px] text-[13px] font-medium no-select"
              style={{ backgroundColor: upiVerified ? "var(--sage-soft)" : "var(--teal-soft)", color: upiVerified ? "var(--sage-text)" : "var(--teal-dark)", border: `1px solid ${upiVerified ? "var(--sage)" : "var(--teal)"}` }}>
              {upiVerified ? "Verified" : "Verify"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <Field label="Account number" placeholder="1234567890" value={accNum} onChange={setAccNum} />
          <Field label="IFSC code" placeholder="SBIN0001234" value={ifsc} onChange={v => setIfsc(v.toUpperCase())} />
        </>
      )}

      {/* Consents */}
      <div className="mt-4 mb-2" style={{ borderTop: "0.5px solid var(--surface-border)", paddingTop: 16 }}>
        <Checkbox checked={coc} onChange={setCoc}>I agree to the Swepy code of conduct</Checkbox>
        <Checkbox checked={bg} onChange={setBg}>I consent to a background check</Checkbox>
        <Checkbox checked={pp} onChange={setPp}>I agree to the privacy policy and data use</Checkbox>
      </div>
    </OnboardingShell>
  );
}
