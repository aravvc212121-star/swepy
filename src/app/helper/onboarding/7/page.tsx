"use client";

import { useHelper } from "@/lib/helper-store";
import { IconCheck, IconShieldCheck } from "@/components/icons";
import Link from "next/link";

const STEPS = [
  { label: "Documents received", status: "done" },
  { label: "Face check", status: "done" },
  { label: "Background check", status: "in_progress" },
  { label: "Final approval", status: "waiting" },
] as const;

function Badge({ status }: { status: "done" | "in_progress" | "waiting" }) {
  const map = {
    done: { bg: "var(--sage-soft)", color: "var(--sage-text)", border: "var(--sage)", label: "Done" },
    in_progress: { bg: "var(--teal-soft)", color: "var(--teal-dark)", border: "var(--teal)", label: "In progress" },
    waiting: { bg: "var(--amber-soft)", color: "var(--ink)", border: "var(--amber-border)", label: "Waiting" },
  };
  const s = map[status];
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-[8px] text-[11px] font-medium"
      style={{ backgroundColor: s.bg, color: s.color, border: `0.5px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

export default function Step7() {
  const { profile } = useHelper();
  const isApproved = profile.kyc_status === "approved";

  return (
    <div className="w-full max-w-[430px] mx-auto min-h-dvh flex flex-col items-center bg-app-bg px-4"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 48px)" }}>

      {/* Check icon */}
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: "var(--sage)" }}>
        <IconCheck size={32} className="text-white" />
      </div>

      <h1 className="text-[22px] font-medium text-ink text-center mb-2">Application submitted</h1>
      <p className="text-[14px] text-ink-muted text-center mb-6">
        Review usually takes 1 to 2 days. We will message you once it is done.
      </p>

      {/* Status list */}
      <div className="w-full rounded-[14px] overflow-hidden mb-5" style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}>
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3.5"
            style={i < STEPS.length - 1 ? { borderBottom: "0.5px solid var(--surface-border)" } : undefined}>
            <span className="text-[14px] text-ink">{s.label}</span>
            <Badge status={s.status} />
          </div>
        ))}
      </div>

      {/* Info note */}
      <div className="w-full rounded-[10px] p-3 mb-6" style={{ backgroundColor: "var(--teal-soft)" }}>
        <p className="text-[12px]" style={{ color: "var(--teal-dark)" }}>
          You can go online and start accepting jobs once your application is approved.
        </p>
      </div>

      {/* Mock: "Approve" button for testing */}
      {!isApproved && (
        <ApproveButton />
      )}

      {isApproved && (
        <Link href="/helper/orders" data-pressable=""
          className="w-full h-12 rounded-[12px] text-[15px] font-medium text-white flex items-center justify-center no-underline no-select"
          style={{ backgroundColor: "var(--brand-rose)" }}>
          Go to dashboard
        </Link>
      )}
    </div>
  );
}

/* Dev helper: Instantly approve (mock) */
function ApproveButton() {
  const { updateProfile } = useHelper();
  return (
    <button type="button" onClick={() => updateProfile({ kyc_status: "approved" })} data-pressable=""
      className="w-full h-12 rounded-[12px] text-[15px] font-medium no-select"
      style={{ backgroundColor: "var(--sage-soft)", color: "var(--sage-text)", border: "1px solid var(--sage)" }}>
      Mock: Approve application
    </button>
  );
}
