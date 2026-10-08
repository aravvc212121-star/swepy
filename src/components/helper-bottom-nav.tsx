"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { IconClipboardList, IconUser } from "@/components/icons";

function getActive(pathname: string) {
  if (pathname.startsWith("/helper/job")) return "/helper/orders";
  if (pathname.startsWith("/helper/earnings")) return "/helper/profile";
  if (pathname.startsWith("/helper/profile")) return "/helper/profile";
  if (pathname.startsWith("/helper/orders")) return "/helper/orders";
  return "/helper/orders";
}

export default function HelperBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const active = getActive(pathname);
  const isHome = active === "/helper/orders";
  const isProfile = active === "/helper/profile";

  const navTo = (path: string) => {
    // Hard navigate to prevent any silent React state failures blocking the transition
    window.location.href = path;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[999] flex justify-center"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Helper navigation"
    >
      <div
        className="w-full max-w-[430px] flex items-center"
        style={{
          height: 64,
          background: "var(--nav-glass)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "0.5px solid var(--surface-border)",
        }}
      >
        {/* Home */}
        <button
          type="button"
          onClick={() => navTo("/helper/orders")}
          className="flex-1 flex flex-col items-center justify-center gap-1 h-full no-underline outline-none bg-transparent border-0"
          style={{ color: isHome ? "var(--nav-text-active)" : "var(--nav-text)", fontWeight: isHome ? 600 : 500, cursor: "pointer" }}
        >
          <IconClipboardList size={24} strokeWidth={1.35} />
          <span className="text-[10px] leading-none">Home</span>
        </button>

        {/* Center logo */}
        <button
          type="button"
          onClick={() => navTo("/helper/orders")}
          className="shrink-0 no-underline flex items-center justify-center bg-transparent border-0"
          style={{ width: 64, height: 64, cursor: "pointer", padding: 0 }}
        >
          <div style={{
            width: 56, height: 56,
            backgroundColor: "var(--brand-rose)",
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 16, overflow: "hidden",
          }}>
            <Image src="/icons/icon-192.png" alt="Swepy" width={44} height={44} style={{ borderRadius: 10, objectFit: "cover" }} priority />
          </div>
        </button>

        {/* Profile */}
        <button
          type="button"
          onClick={() => navTo("/helper/profile")}
          className="flex-1 flex flex-col items-center justify-center gap-1 h-full no-underline outline-none bg-transparent border-0"
          style={{ color: isProfile ? "var(--nav-text-active)" : "var(--nav-text)", fontWeight: isProfile ? 600 : 500, cursor: "pointer" }}
        >
          <IconUser size={24} strokeWidth={1.35} />
          <span className="text-[10px] leading-none">Profile</span>
        </button>
      </div>
    </nav>
  );
}
