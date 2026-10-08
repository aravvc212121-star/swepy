"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSession, getDemoHelperNames } from "@/lib/swepy";

export default function DemoPage() {
  const router = useRouter();
  const [selectedHelper, setSelectedHelper] = useState(0);
  const helperNames = getDemoHelperNames();

  const handleUser = () => {
    createSession("user", "Demo User");
    router.push("/");
  };

  const handleHelper = () => {
    createSession("helper", helperNames[selectedHelper]);
    router.push("/helper/orders");
  };

  return (
    <div className="w-full max-w-[430px] mx-auto min-h-dvh flex flex-col items-center justify-center bg-app-bg px-6">
      <h1 className="text-[24px] font-medium text-ink text-center mb-2">Swepy demo</h1>
      <p className="text-[14px] text-ink-muted text-center mb-8">
        Open two tabs. Pick "User" in one and "Helper" in the other.
      </p>

      {/* User button */}
      <button type="button" onClick={handleUser} data-pressable=""
        className="w-full h-14 rounded-[14px] text-[16px] font-medium text-white mb-3 no-select"
        style={{ backgroundColor: "var(--brand-rose)" }}>
        I am a user
      </button>

      {/* Helper picker */}
      <div className="w-full rounded-[14px] p-4 mb-3" style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}>
        <p className="text-[13px] font-medium text-ink-muted mb-2">Pick a helper name</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {helperNames.map((name, i) => (
            <button key={name} type="button" onClick={() => setSelectedHelper(i)} data-pressable=""
              className="px-3 py-1.5 rounded-[10px] text-[13px] font-medium no-select"
              style={{
                backgroundColor: selectedHelper === i ? "var(--brand-rose)" : "var(--app-bg)",
                color: selectedHelper === i ? "#fff" : "var(--ink)",
                border: `1px solid ${selectedHelper === i ? "var(--brand-rose)" : "var(--surface-border)"}`,
              }}>
              {name}
            </button>
          ))}
        </div>
        <button type="button" onClick={handleHelper} data-pressable=""
          className="w-full h-12 rounded-[12px] text-[15px] font-medium no-select"
          style={{ backgroundColor: "var(--teal-soft)", color: "var(--teal-dark)", border: "1px solid var(--teal)" }}>
          I am a helper ({helperNames[selectedHelper]})
        </button>
      </div>

      <p className="text-[12px] text-ink-muted text-center mt-4">
        Both tabs use the same browser. The realtime channel (BroadcastChannel) connects them automatically.
      </p>
    </div>
  );
}
