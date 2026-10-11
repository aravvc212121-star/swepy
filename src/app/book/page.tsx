"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function BookContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const serviceParam = searchParams.get("service") || "";
    if (serviceParam.includes("major") || serviceParam.includes("deep")) {
      router.replace("/service/svc_major");
    } else {
      router.replace("/service/svc_minor");
    }
  }, [router, searchParams]);

  return (
    <div className="mobile-frame bg-app-bg min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full bg-teal/20 mx-auto mb-3 animate-pulse" />
        <p className="text-[13px] text-ink-muted">Loading services...</p>
      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={null}>
      <BookContent />
    </Suspense>
  );
}
