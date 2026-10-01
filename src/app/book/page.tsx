"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This page redirects to the first service (Minor clean) detail page.
// In production, this would show a service picker or use the selected service.
export default function BookPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/service/svc_minor");
  }, [router]);

  return (
    <div className="mobile-frame bg-app-bg min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full bg-teal/20 mx-auto mb-3 animate-pulse" />
        <p className="text-[13px] text-ink-muted">Loading services...</p>
      </div>
    </div>
  );
}
