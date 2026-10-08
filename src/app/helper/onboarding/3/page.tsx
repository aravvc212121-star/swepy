"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingShell from "@/components/helper-onboarding-shell";
import { useHelper } from "@/lib/helper-store";
import { useGeo } from "@/lib/geo-store";
import { IconMapPin, IconCurrentLocation } from "@/components/icons";

const RADIUS_OPTIONS = [3, 5, 8] as const;

function Field({ label, placeholder, value, onChange, inputMode }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void; inputMode?: "text" | "numeric";
}) {
  return (
    <div className="mb-3">
      <label className="text-[12px] font-medium text-ink-muted mb-1 block">{label}</label>
      <input type="text" inputMode={inputMode} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        className="w-full h-[44px] rounded-[10px] px-3 text-[14px] text-ink outline-none"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--surface-border)", caretColor: "var(--brand-rose)" }} />
    </div>
  );
}

export default function Step3() {
  const router = useRouter();
  const { profile, updateProfile } = useHelper();
  const geo = useGeo();
  const addr = profile.current_address;
  const [house, setHouse] = useState(addr?.house_flat || "");
  const [street, setStreet] = useState(addr?.street || "");
  const [locality, setLocality] = useState(addr?.locality || "");
  const [pincode, setPincode] = useState(addr?.pincode || "");
  const [city, setCity] = useState(addr?.city || "");
  const [radius, setRadius] = useState(profile.service_radius_km);
  const [sameAddr, setSameAddr] = useState(profile.same_as_current);

  const canContinue = !!(house.trim() && locality.trim() && /^\d{6}$/.test(pincode) && city.trim());

  const handleUseLocation = () => {
    geo.requestLocation();
    if (geo.status === "granted" && geo.address) {
      const parts = geo.address.split(", ");
      setLocality(parts[0] || "");
      setCity(parts[parts.length - 1] || "");
      if (geo.pincode) setPincode(geo.pincode);
    }
  };

  const handleSubmit = () => {
    updateProfile({
      current_address: { house_flat: house, street, locality, pincode, city, lat: geo.lat || undefined, lng: geo.lng || undefined },
      service_radius_km: radius,
      same_as_current: sameAddr,
      onboarding_step: Math.max(profile.onboarding_step, 3),
    });
    router.push("/helper/onboarding/4");
  };

  return (
    <OnboardingShell step={3} title="Where you live" subtitle="Your current address for job matching" onSubmit={handleSubmit} disabled={!canContinue}>
      {/* Map card */}
      <div className="rounded-[14px] overflow-hidden mb-4" style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}>
        <div className="h-[120px] flex items-center justify-center relative" style={{ backgroundColor: "var(--teal-soft)" }}>
          <IconMapPin size={32} style={{ color: "var(--brand-rose)" }} />
        </div>
        <button type="button" onClick={handleUseLocation} data-pressable=""
          className="w-full flex items-center justify-center gap-2 py-3 text-[13px] font-medium no-select"
          style={{ color: "var(--brand-rose)", borderTop: "0.5px solid var(--surface-border)" }}>
          <IconCurrentLocation size={16} />
          Use current location
        </button>
      </div>

      <Field label="House / Flat number" placeholder="402, Tower B" value={house} onChange={setHouse} />
      <Field label="Street" placeholder="Main road" value={street} onChange={setStreet} />
      <div className="flex gap-3">
        <div className="flex-1"><Field label="Locality" placeholder="Sector 18" value={locality} onChange={setLocality} /></div>
        <div className="w-[120px]"><Field label="Pincode" placeholder="201301" value={pincode} onChange={v => setPincode(v.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" /></div>
      </div>
      <Field label="City" placeholder="Noida" value={city} onChange={setCity} />

      {/* Radius chips */}
      <label className="text-[12px] font-medium text-ink-muted mb-2 block">How far can you travel for a job</label>
      <div className="flex gap-2 mb-4">
        {RADIUS_OPTIONS.map(r => (
          <button key={r} type="button" onClick={() => setRadius(r)} data-pressable="" aria-pressed={radius === r}
            className="flex-1 py-2 rounded-[10px] text-[13px] font-medium no-select"
            style={{
              backgroundColor: radius === r ? "var(--brand-rose)" : "var(--surface)",
              color: radius === r ? "#fff" : "var(--ink)",
              border: `1px solid ${radius === r ? "var(--brand-rose)" : "var(--surface-border)"}`,
            }}>
            {r} km
          </button>
        ))}
      </div>

      {/* Same address checkbox */}
      <label className="flex items-center gap-3 py-2 text-[14px] text-ink cursor-pointer" aria-checked={sameAddr} role="checkbox">
        <div className="w-5 h-5 rounded-[4px] flex items-center justify-center shrink-0"
          style={{ backgroundColor: sameAddr ? "var(--brand-rose)" : "var(--surface)", border: sameAddr ? "none" : "1.5px solid var(--surface-border)" }}
          onClick={() => setSameAddr(!sameAddr)}>
          {sameAddr && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5l10 -10" /></svg>}
        </div>
        <span onClick={() => setSameAddr(!sameAddr)}>Permanent address is the same as this one</span>
      </label>
    </OnboardingShell>
  );
}
