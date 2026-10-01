"use client";

import BrandLogo from "@/components/brand-logo";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <BrandLogo size={96} priority />
      <h1
        className="text-[20px] font-medium mt-6"
        style={{ color: "#1F1A24" }}
      >
        You're offline
      </h1>
      <p
        className="text-[13px] mt-2 text-center"
        style={{ color: "#6B6270" }}
      >
        Check your connection and try again.
      </p>
      <button
        onClick={() => location.reload()}
        className="mt-6 px-8 py-3 text-white text-[14px] font-medium rounded-[12px]"
        style={{ backgroundColor: "#B3225A", minHeight: 46 }}
      >
        Try again
      </button>
    </div>
  );
}
