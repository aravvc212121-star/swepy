"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Wordmark from "@/components/wordmark";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = () => {
    if (phone.length < 10) return;
    setLoading(true);
    // Mock: auto-advance after 1s
    setTimeout(() => {
      setLoading(false);
      setStep("otp");
    }, 1000);
  };

  const handleVerifyOtp = () => {
    if (otp.length < 4) return;
    setLoading(true);
    // Mock: auto-advance after 1s
    setTimeout(() => {
      setLoading(false);
      router.push("/");
    }, 1000);
  };

  return (
    <div className="mobile-frame bg-app-bg min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6">
        <div className="mb-10">
          <Wordmark size="lg" />
          <p className="text-[15px] text-ink-muted mt-2">
            Helper at your door in minutes
          </p>
        </div>

        {step === "phone" ? (
          <div>
            <label className="text-[13px] font-medium text-ink mb-2 block">
              Phone number
            </label>
            <div
              className="flex items-center gap-2 bg-surface rounded-[12px] px-4 py-3"
              style={{ border: "0.5px solid var(--surface-border)" }}
            >
              <span className="text-[14px] text-ink-muted">+91</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="Enter your phone number"
                className="flex-1 text-[14px] text-ink bg-transparent outline-none placeholder:text-ink-muted/50"
                autoFocus
              />
            </div>
            <button
              onClick={handleSendOtp}
              disabled={phone.length < 10 || loading}
              className="w-full mt-4 py-3.5 rounded-[12px] text-[14px] font-medium text-white disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: "var(--brand-rose)" }}
            >
              {loading ? "Sending..." : "Get OTP"}
            </button>
          </div>
        ) : (
          <div>
            <label className="text-[13px] font-medium text-ink mb-2 block">
              Enter the OTP sent to +91 {phone}
            </label>
            <div className="flex gap-3 justify-center mb-4">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  type="text"
                  maxLength={1}
                  value={otp[i] || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    const newOtp = otp.split("");
                    newOtp[i] = val;
                    setOtp(newOtp.join(""));
                    if (val && i < 3) {
                      const next = e.target.parentElement?.children[i + 1] as HTMLInputElement;
                      next?.focus();
                    }
                  }}
                  className="w-14 h-16 text-center text-xl font-medium text-ink rounded-[10px] outline-none"
                  style={{
                    backgroundColor: "var(--amber-soft)",
                    border: "0.5px solid var(--amber-border)",
                  }}
                  autoFocus={i === 0}
                />
              ))}
            </div>
            <button
              onClick={handleVerifyOtp}
              disabled={otp.length < 4 || loading}
              className="w-full py-3.5 rounded-[12px] text-[14px] font-medium text-white disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: "var(--brand-rose)" }}
            >
              {loading ? "Verifying..." : "Verify and continue"}
            </button>
            <button
              onClick={() => { setStep("phone"); setOtp(""); }}
              className="w-full mt-3 text-[13px] text-ink-muted font-medium"
            >
              Change phone number
            </button>
          </div>
        )}
      </div>

      <p className="text-[11px] text-ink-muted text-center pb-6 px-6">
        By continuing, you agree to our terms of service and privacy policy
      </p>
    </div>
  );
}
