"use client";

import { usePathname, useRouter } from "next/navigation";
import { IconHomeOutline, IconUser } from "@/components/icons";
import { useScrollNav } from "@/lib/use-scroll-nav";
import { useI18n } from "@/lib/i18n";
import { HELPER_TOKENS } from "@/lib/helper-theme";

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
  const isVisible = useScrollNav();
  const { t } = useI18n();
  const active = getActive(pathname);
  const isHome = active === "/helper/orders";
  const isProfile = active === "/helper/profile";

  const navTo = (path: string) => {
    router.push(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex justify-center pointer-events-none no-select"
      style={{
        paddingLeft: "calc(12px + env(safe-area-inset-left, 0px))",
        paddingRight: "calc(12px + env(safe-area-inset-right, 0px))",
        paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        transform: isVisible
          ? "translate3d(0, 0, 0)"
          : "translate3d(0, calc(100% + 24px), 0)",
        transition: "transform 200ms ease",
        willChange: "transform",
      }}
      aria-label="Helper navigation"
      aria-hidden={!isVisible}
    >
      <div
        className="w-full max-w-[406px] flex items-center p-1 pointer-events-auto"
        style={{
          height: HELPER_TOKENS.layout.navHeight,
          backgroundColor: HELPER_TOKENS.colors.cardBg,
          border: `1px solid ${HELPER_TOKENS.colors.hairline}`,
          borderRadius: HELPER_TOKENS.radius.bottomNav,
          boxShadow: HELPER_TOKENS.colors.navShadow,
        }}
      >
        {/* Home Tab */}
        <button
          type="button"
          onClick={() => navTo("/helper/orders")}
          aria-label={t("helper.home")}
          aria-current={isHome ? "page" : undefined}
          className="flex-1 flex items-center justify-center gap-2 h-12 rounded-full border-0 outline-none transition-colors duration-200 cursor-pointer"
          style={{
            backgroundColor: isHome ? HELPER_TOKENS.colors.blush : "transparent",
            color: isHome ? HELPER_TOKENS.colors.brand : HELPER_TOKENS.colors.hint,
            minHeight: "44px",
          }}
        >
          <IconHomeOutline
            size={20}
            strokeWidth={1.5}
            style={{ color: isHome ? HELPER_TOKENS.colors.brand : HELPER_TOKENS.colors.hint }}
          />
          <span
            className="text-[13px] tracking-tight truncate"
            style={{ fontWeight: 500 }}
          >
            {t("helper.home")}
          </span>
        </button>

        {/* Profile Tab */}
        <button
          type="button"
          onClick={() => navTo("/helper/profile")}
          aria-label={t("helper.profile")}
          aria-current={isProfile ? "page" : undefined}
          className="flex-1 flex items-center justify-center gap-2 h-12 rounded-full border-0 outline-none transition-colors duration-200 cursor-pointer"
          style={{
            backgroundColor: isProfile ? HELPER_TOKENS.colors.blush : "transparent",
            color: isProfile ? HELPER_TOKENS.colors.brand : HELPER_TOKENS.colors.hint,
            minHeight: "44px",
          }}
        >
          <IconUser
            size={20}
            strokeWidth={1.5}
            style={{ color: isProfile ? HELPER_TOKENS.colors.brand : HELPER_TOKENS.colors.hint }}
          />
          <span
            className="text-[13px] tracking-tight truncate"
            style={{ fontWeight: isProfile ? 500 : 400 }}
          >
            {t("helper.profile")}
          </span>
        </button>
      </div>
    </nav>
  );
}
