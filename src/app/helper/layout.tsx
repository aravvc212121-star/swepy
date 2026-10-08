"use client";

import { HelperProvider } from "@/lib/helper-store";

export default function HelperLayout({ children }: { children: React.ReactNode }) {
  return <HelperProvider>{children}</HelperProvider>;
}
