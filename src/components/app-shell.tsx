import type { ReactNode } from "react";

/**
 * AppShell wraps every tab screen.
 * - max-w 430px, centered
 * - px-4, pt-4, pb-24 (room for bottom nav)
 * - bg app-bg, full-width block, never shrinks
 */
export default function AppShell({
  children,
  noPaddingBottom = false,
  className = "",
}: {
  children: ReactNode;
  noPaddingBottom?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`w-full max-w-[430px] mx-auto min-h-dvh px-4 pt-4 bg-app-bg ${className}`}
      style={{
        paddingBottom: noPaddingBottom ? 0 : "calc(72px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {children}
    </div>
  );
}
