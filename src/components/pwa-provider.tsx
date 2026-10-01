"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import BrandLogo from "@/components/brand-logo";
import { IconX } from "@/components/icons";

// ── Helpers ──
function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

// ── PwaProvider ──
export default function PwaProvider() {
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSSheet, setShowIOSSheet] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const deferredPrompt = useRef<any>(null);
  const swReg = useRef<ServiceWorkerRegistration | null>(null);

  // Register SW
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((reg) => {
      swReg.current = reg;

      // Check for updates
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
          }
        });
      });
    });

    // Reload on controller change
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  // Capture install prompt (Android/Chrome)
  useEffect(() => {
    if (isStandalone()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e;
      maybeShowBanner();
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setShowBanner(false);
      localStorage.setItem("swepy-installed", "true");
    });

    // iOS check
    if (isIOS() && !isStandalone()) {
      maybeShowBanner();
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const maybeShowBanner = useCallback(() => {
    if (isStandalone()) return;
    if (localStorage.getItem("swepy-installed") === "true") return;

    // Always show the banner during development/testing
    setShowBanner(true);
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt.current) {
      deferredPrompt.current.prompt();
      const result = await deferredPrompt.current.userChoice;
      if (result.outcome === "accepted") {
        setShowBanner(false);
      }
      deferredPrompt.current = null;
    } else if (isIOS()) {
      setShowIOSSheet(true);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem("swepy-install-dismissed", String(Date.now()));
  }, []);

  const handleUpdate = useCallback(() => {
    const waiting = swReg.current?.waiting;
    if (waiting) {
      waiting.postMessage({ type: "SKIP_WAITING" });
    }
  }, []);

  return (
    <>
      {/* Update toast — z-60 (toasts layer) */}
      {updateAvailable && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-60 max-w-[400px] w-[calc(100%-32px)] flex items-center gap-3 px-4 py-3 rounded-[12px] no-select"
          style={{ backgroundColor: "#1F1A24", color: "white" }}
        >
          <span className="text-[13px] flex-1">A new version is available</span>
          <button
            type="button"
            onClick={handleUpdate}
            data-pressable=""
            className="text-[13px] font-medium px-3 py-1.5 rounded-[8px] min-h-[44px] flex items-center"
            style={{ backgroundColor: "#B3225A" }}
          >
            Refresh
          </button>
        </div>
      )}

      {/* Install banner — z-60 (toasts layer) */}
      {showBanner && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-60 max-w-[430px] w-[calc(100%-32px)] flex items-center gap-3 px-4 py-3 rounded-[12px] no-select"
          style={{
            bottom: "calc(80px + env(safe-area-inset-bottom, 8px))",
            backgroundColor: "white",
            border: "1px solid #F6D9E5",
          }}
        >
          <BrandLogo size={40} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium" style={{ color: "#3B1428" }}>
              Install Swepy
            </p>
            <p className="text-[11px]" style={{ color: "#8A6577" }}>
              Faster booking from your home screen
            </p>
          </div>
          <button
            type="button"
            onClick={handleInstall}
            data-pressable=""
            className="text-[12px] font-medium px-3 py-2 rounded-[8px] text-white shrink-0 min-h-[44px] flex items-center"
            style={{ backgroundColor: "#B3225A" }}
          >
            Install
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 w-[44px] h-[44px] -mr-2 flex items-center justify-center"
            style={{ color: "#8A6577" }}
            aria-label="Dismiss"
          >
            <IconX size={18} />
          </button>
        </div>
      )}

      {/* iOS install sheet — z-40 scrim + z-50 sheet */}
      {showIOSSheet && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onClick={() => setShowIOSSheet(false)}
          />
          <div
            className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 max-w-[430px] w-full rounded-t-[20px] p-5"
            style={{ backgroundColor: "#B3225A", paddingBottom: "calc(20px + env(safe-area-inset-bottom, 8px))" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-medium text-white">
                Add Swepy to your home screen
              </h2>
              <button
                type="button"
                onClick={() => setShowIOSSheet(false)}
                className="text-white w-[44px] h-[44px] flex items-center justify-center -mr-2"
                aria-label="Close"
              >
                <IconX size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-[12px] p-3.5" style={{ backgroundColor: "#FFF1F6" }}>
                <div className="flex items-center gap-3">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-medium text-white shrink-0"
                    style={{ backgroundColor: "#B3225A" }}
                  >
                    1
                  </span>
                  <p className="text-[13px]" style={{ color: "#3B1428" }}>
                    Tap the <strong>Share</strong> button in Safari
                  </p>
                </div>
              </div>
              <div className="rounded-[12px] p-3.5" style={{ backgroundColor: "#FFF1F6" }}>
                <div className="flex items-center gap-3">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-medium text-white shrink-0"
                    style={{ backgroundColor: "#B3225A" }}
                  >
                    2
                  </span>
                  <p className="text-[13px]" style={{ color: "#3B1428" }}>
                    Choose <strong>Add to Home Screen</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
