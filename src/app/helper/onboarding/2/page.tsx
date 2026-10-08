"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingShell from "@/components/helper-onboarding-shell";
import { useHelper } from "@/lib/helper-store";
import { SKILLS, LANGUAGES, SKILL_LABELS, LANGUAGE_LABELS, EXPERIENCE_LABELS } from "@/lib/helper-types";
import type { Skill, Language, Experience, Gender } from "@/lib/helper-types";

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const EXP_OPTIONS: Experience[] = ["new", "1_2_years", "3_5_years", "5_plus"];

function SelectChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick} data-pressable=""
      className="px-3 py-2 rounded-[10px] text-[13px] font-medium no-select"
      style={{
        backgroundColor: selected ? "var(--brand-rose)" : "var(--surface)",
        color: selected ? "#fff" : "var(--ink)",
        border: `1px solid ${selected ? "var(--brand-rose)" : "var(--surface-border)"}`,
      }}
      aria-pressed={selected}
    >{label}</button>
  );
}

export default function Step2() {
  const router = useRouter();
  const { profile, updateProfile } = useHelper();
  const [fullName, setFullName] = useState(profile.full_name);
  const [dob, setDob] = useState(profile.date_of_birth);
  const [gender, setGender] = useState<Gender | undefined>(profile.gender);
  const [langs, setLangs] = useState<Language[]>(profile.languages);
  const [exp, setExp] = useState<Experience>(profile.experience);
  const [skills, setSkills] = useState<Skill[]>(profile.skills);
  const [dobError, setDobError] = useState<string | null>(null);

  const toggleLang = (l: Language) => setLangs(p => p.includes(l) ? p.filter(x => x !== l) : [...p, l]);
  const toggleSkill = (s: Skill) => setSkills(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const isOldEnough = (d: string) => {
    if (!d) return false;
    const birth = new Date(d);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 18;
  };

  const canContinue = !!(fullName.trim() && dob && isOldEnough(dob) && langs.length > 0 && skills.length > 0);

  const handleSubmit = () => {
    if (!isOldEnough(dob)) { setDobError("You must be at least 18 years old"); return; }
    setDobError(null);
    updateProfile({
      full_name: fullName.trim(), date_of_birth: dob, gender, languages: langs,
      experience: exp, skills, onboarding_step: Math.max(profile.onboarding_step, 2),
    });
    router.push("/helper/onboarding/3");
  };

  return (
    <OnboardingShell step={2} title="About you" subtitle="Tell us a bit about yourself" onSubmit={handleSubmit} disabled={!canContinue}>
      {/* Full name */}
      <label className="text-[12px] font-medium text-ink-muted mb-1 block">Full name (as on ID)</label>
      <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
        placeholder="Enter your full name"
        className="w-full h-[44px] rounded-[10px] px-3 text-[14px] text-ink outline-none mb-4"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--surface-border)", caretColor: "var(--brand-rose)" }}
      />

      {/* DOB */}
      <label className="text-[12px] font-medium text-ink-muted mb-1 block">Date of birth</label>
      <input type="date" value={dob} onChange={e => { setDob(e.target.value); setDobError(null); }}
        className="w-full h-[44px] rounded-[10px] px-3 text-[14px] text-ink outline-none mb-1"
        style={{ backgroundColor: "var(--surface)", border: `1px solid ${dobError ? "#B3261E" : "var(--surface-border)"}`, caretColor: "var(--brand-rose)" }}
      />
      {dobError && <p className="text-[12px] mb-3" style={{ color: "#B3261E" }}>{dobError}</p>}
      {!dobError && <div className="mb-4" />}

      {/* Gender */}
      <label className="text-[12px] font-medium text-ink-muted mb-2 block">Gender (optional)</label>
      <div className="flex gap-2 mb-4">
        {GENDER_OPTIONS.map(g => (
          <SelectChip key={g.value} label={g.label} selected={gender === g.value} onClick={() => setGender(gender === g.value ? undefined : g.value)} />
        ))}
      </div>

      {/* Languages */}
      <label className="text-[12px] font-medium text-ink-muted mb-2 block">Languages you speak</label>
      <div className="flex flex-wrap gap-2 mb-4">
        {LANGUAGES.map(l => (
          <SelectChip key={l} label={LANGUAGE_LABELS[l]} selected={langs.includes(l)} onClick={() => toggleLang(l)} />
        ))}
      </div>

      {/* Experience */}
      <label className="text-[12px] font-medium text-ink-muted mb-2 block">Experience</label>
      <div className="flex flex-wrap gap-2 mb-4">
        {EXP_OPTIONS.map(e => (
          <SelectChip key={e} label={EXPERIENCE_LABELS[e]} selected={exp === e} onClick={() => setExp(e)} />
        ))}
      </div>

      {/* Skills */}
      <label className="text-[12px] font-medium text-ink-muted mb-2 block">Work you can do</label>
      <div className="flex flex-wrap gap-2 mb-4">
        {SKILLS.map(s => (
          <SelectChip key={s} label={SKILL_LABELS[s]} selected={skills.includes(s)} onClick={() => toggleSkill(s)} />
        ))}
      </div>
    </OnboardingShell>
  );
}
