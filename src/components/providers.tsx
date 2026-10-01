"use client";

import { AddressProvider } from "@/lib/address-store";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <AddressProvider>{children}</AddressProvider>;
}
