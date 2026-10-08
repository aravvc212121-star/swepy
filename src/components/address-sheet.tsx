"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useAddressStore, type Address } from "@/lib/address-store";
import { useGeo } from "@/lib/geo-store";
import {
  IconX,
  IconSearch,
  IconCurrentLocation,
  IconPlus,
  IconChevronRight,
  IconHome,
  IconCheck,
} from "@/components/icons";
import { useDragToDismiss } from "@/lib/use-drag-to-dismiss";
import AddAddressSheet from "@/components/add-address-sheet";

/* ── tiny helpers ── */
const IconBriefcase = ({ size = 24, className, style }: { size?: number; className?: string; style?: React.CSSProperties }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
    <path d="M3 7m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" />
    <path d="M8 7v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2" />
    <path d="M12 12l0 .01" />
    <path d="M3 13a20 20 0 0 0 18 0" />
  </svg>
);

const IconHeart = ({ size = 24, className, style }: { size?: number; className?: string; style?: React.CSSProperties }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
    <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />
  </svg>
);

const IconDots = ({ size = 24, className, style }: { size?: number; className?: string; style?: React.CSSProperties }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
    <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
    <path d="M12 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
    <path d="M12 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
  </svg>
);

function getTypeIcon(type: Address["type"]) {
  switch (type) {
    case "home": return IconHome;
    case "work": return IconBriefcase;
    default: return IconHeart;
  }
}

/* ── css vars ── */
const sheetVars = {
  "--sheet-bg": "#FFF5F8",
  "--box": "#FFFFFF",
  "--ink": "#1F1A24",
  "--sub": "#6B6270",
  "--div": "#EFE0E6",
  "--ico-bg": "#FCE8F0",
  "--ico-fg": "#B3225A",
  "--pill-bg": "#FCE8F0",
  "--pill-fg": "#8F1F45",
} as React.CSSProperties;

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   AddressRow
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function AddressRow({
  address,
  isCurrent,
  onSelect,
  onMenu,
}: {
  address: Address;
  isCurrent: boolean;
  onSelect: () => void;
  onMenu?: () => void;
}) {
  const TypeIcon = getTypeIcon(address.type);

  return (
    <button
      type="button"
      onClick={onSelect}
      data-pressable=""
      className="w-full flex items-center gap-3 rounded-[12px] p-3 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 no-select"
      style={{
        backgroundColor: "var(--box)",
        minHeight: 48,
        outlineColor: "#F6B21A",
      }}
    >
      {/* Icon circle */}
      <div
        className="shrink-0 w-[38px] h-[38px] rounded-full flex items-center justify-center"
        style={{
          backgroundColor: isCurrent ? "var(--ico-fg)" : "var(--ico-bg)",
        }}
      >
        <TypeIcon
          size={18}
          className={isCurrent ? "text-white" : ""}
          {...(!isCurrent ? { style: { color: "var(--ico-fg)" } } : {})}
        />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
            {address.label}
          </span>
          {isCurrent && (
            <span
              className="inline-flex items-center px-[7px] py-[1px] rounded-full text-[11px] font-medium"
              style={{ backgroundColor: "var(--pill-bg)", color: "var(--pill-fg)" }}
            >
              Delivering here
            </span>
          )}
        </div>
        <p
          className="text-[12px] mt-0.5 truncate"
          style={{ color: "var(--sub)" }}
        >
          {address.line}
        </p>
      </div>

      {/* Right action */}
      {isCurrent ? (
        <div
          className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "var(--ico-fg)" }}
        >
          <IconCheck size={12} className="text-white" />
        </div>
      ) : onMenu ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMenu();
          }}
          className="shrink-0 w-[44px] h-[44px] -mr-3 flex items-center justify-center outline-none focus-visible:outline-2 focus-visible:outline-offset-2 no-select"
          style={{ outlineColor: "#F6B21A" }}
          aria-label={`Options for ${address.label}`}
        >
          <IconDots size={20} style={{ color: "var(--sub)" }} />
        </button>
      ) : null}
    </button>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   QuickActions
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function QuickActions({
  onUseCurrentLocation,
  onAddNew,
}: {
  onUseCurrentLocation: () => void;
  onAddNew: () => void;
}) {
  const geo = useGeo();

  const handleGeo = useCallback(() => {
    geo.requestLocation();
    onUseCurrentLocation();
  }, [geo, onUseCurrentLocation]);

  const statusText =
    geo.status === "requesting"
      ? "Locating…"
      : geo.status === "granted" && geo.address
      ? geo.address
      : geo.status === "denied"
      ? "Location denied. Enable in browser settings."
      : geo.status === "error"
      ? "Unable to get location. Try again."
      : "Turn on GPS for accurate delivery";

  return (
    <div className="rounded-[12px] overflow-hidden mt-3" style={{ backgroundColor: "var(--box)" }}>
      {/* Row 1: Use current location */}
      <button
        type="button"
        onClick={handleGeo}
        data-pressable=""
        className="w-full flex items-center gap-3 px-3 min-h-[52px] text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 no-select"
        style={{ outlineColor: "#F6B21A" }}
      >
        <IconCurrentLocation size={20} style={{ color: "var(--ico-fg)" }} />
        <div className="flex-1 min-w-0">
          <span className="text-[14px] font-medium" style={{ color: "var(--ico-fg)" }}>
            {geo.status === "granted" ? "Location enabled" : "Use current location"}
          </span>
          <p className="text-[12px]" style={{ color: geo.status !== "idle" ? "var(--ico-fg)" : "var(--sub)" }}>
            {statusText}
          </p>
        </div>
      </button>

      {/* Divider */}
      <div className="mx-3" style={{ height: 1, backgroundColor: "var(--div)" }} />

      {/* Row 2: Add new address */}
      <button
        type="button"
        onClick={onAddNew}
        data-pressable=""
        className="w-full flex items-center gap-3 px-3 min-h-[52px] text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 no-select"
        style={{ outlineColor: "#F6B21A" }}
      >
        <IconPlus size={20} style={{ color: "var(--ico-fg)" }} />
        <span className="flex-1 text-[14px] font-medium" style={{ color: "var(--ico-fg)" }}>
          Add new address
        </span>
        <IconChevronRight size={16} style={{ color: "var(--sub)" }} />
      </button>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   AddressSheet
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function AddressSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { addresses, currentId, selectAddress, deleteAddress, currentAddress } = useAddressStore();
  const contentRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const historyPushed = useRef(false);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // History integration: push state so back gesture closes sheet
  useEffect(() => {
    if (!open) {
      historyPushed.current = false;
      return;
    }

    // Push a history entry
    window.history.pushState({ sheet: "address" }, "");
    historyPushed.current = true;

    const handlePop = () => {
      if (historyPushed.current) {
        historyPushed.current = false;
        onClose();
      }
    };

    window.addEventListener("popstate", handlePop);
    return () => {
      window.removeEventListener("popstate", handlePop);
    };
  }, [open, onClose]);

  const handleClose = useCallback(() => {
    // Pop the history entry we pushed
    if (historyPushed.current) {
      historyPushed.current = false;
      window.history.back();
    }
    onClose();
  }, [onClose]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, handleClose]);

  // Focus trap (simple: focus first focusable on open)
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      const first = sheetRef.current?.querySelector<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const handleSelect = useCallback((id: string) => {
    if (id === currentId) return;
    selectAddress(id);
    setMenuOpenId(null);
    closeTimerRef.current = setTimeout(handleClose, 350);
  }, [currentId, selectAddress, handleClose]);

  const handleDelete = useCallback((id: string) => {
    deleteAddress(id);
    setMenuOpenId(null);
  }, [deleteAddress]);

  const handleAddNew = useCallback(() => {
    setAddSheetOpen(true);
  }, []);

  const handleUseCurrentLocation = useCallback(() => {
    // TODO: reverse-geocode and add/update address
  }, []);

  // Drag-to-dismiss
  const { sheetRef, handlePointerDown, handlePointerMove, handlePointerUp } = useDragToDismiss({
    enabled: open,
    onDismiss: handleClose,
    direction: "down",
    threshold: 0.5,
    velocityThreshold: 0.5,
    onScrimUpdate: (opacity) => {
      if (scrimRef.current) {
        scrimRef.current.style.opacity = String(opacity);
      }
    },
    contentScrollRef: contentRef,
  });

  // Derived lists
  const currentAddr = currentAddress;
  const alternates = addresses.filter((a) => a.id !== currentId);

  const prefersReduced = typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      style={sheetVars}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Scrim */}
      <div
        ref={scrimRef}
        className="absolute inset-0"
        style={{
          backgroundColor: "rgba(17,16,24,0.6)",
          animation: prefersReduced ? "none" : "sheetScrimIn 250ms ease-out forwards",
        }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Select delivery location"
        className="absolute bottom-0 left-0 right-0 flex flex-col"
        style={{
          maxHeight: "85dvh",
          backgroundColor: "var(--sheet-bg)",
          borderRadius: "20px 20px 0 0",
          animation: prefersReduced ? "none" : "sheetSlideUp 300ms ease-out forwards",
        }}
      >
        {/* Drag handle + header — touch-action: none for drag zone */}
        <div
          className="shrink-0"
          style={{ touchAction: "none" }}
          onPointerDown={(e) => handlePointerDown(e, true)}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-2 pb-3">
            <div
              className="rounded-full"
              style={{
                width: 36,
                height: 4,
                backgroundColor: "rgba(179, 34, 90, 0.2)",
              }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-[16px] font-medium" style={{ color: "var(--ink)" }}>
              Select delivery location
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="w-[44px] h-[44px] -mr-2 rounded-full flex items-center justify-center outline-none focus-visible:outline-2 focus-visible:outline-offset-2 no-select"
              style={{ outlineColor: "#F6B21A" }}
              aria-label="Close"
            >
              <div className="w-[30px] h-[30px] rounded-full bg-white flex items-center justify-center">
                <IconX size={16} style={{ color: "var(--ico-fg)" }} />
              </div>
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto overscroll-contain px-4"
          style={{
            paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          }}
          onPointerDown={(e) => handlePointerDown(e, false)}
        >
          {/* Search */}
          <div
            className="flex items-center gap-2 h-[44px] rounded-[12px] px-3"
            style={{ backgroundColor: "var(--box)" }}
          >
            <IconSearch size={18} style={{ color: "var(--sub)" }} />
            <input
              type="text"
              placeholder="Search area, society or landmark"
              className="flex-1 bg-transparent border-none outline-none"
              style={{ color: "var(--ink)", fontSize: "16px" }}
              // TODO: wire to places/autocomplete provider
            />
          </div>

          {/* Quick actions */}
          <QuickActions
            onUseCurrentLocation={handleUseCurrentLocation}
            onAddNew={handleAddNew}
          />

          {/* Current address */}
          {currentAddr && (
            <>
              <p
                className="text-[12px] font-medium mt-4 mb-2"
                style={{ color: "var(--sub)" }}
              >
                Current address
              </p>
              <AddressRow
                address={currentAddr}
                isCurrent
                onSelect={() => {}}
              />
            </>
          )}

          {/* Alternates */}
          {alternates.length > 0 && (
            <>
              <p
                className="text-[12px] font-medium mt-4 mb-2"
                style={{ color: "var(--sub)" }}
              >
                Alternate addresses
              </p>
              <div className="flex flex-col gap-2">
                {alternates.map((addr) => (
                  <div key={addr.id} className="relative">
                    <AddressRow
                      address={addr}
                      isCurrent={false}
                      onSelect={() => handleSelect(addr.id)}
                      onMenu={() => setMenuOpenId(menuOpenId === addr.id ? null : addr.id)}
                    />
                    {/* Inline menu */}
                    {menuOpenId === addr.id && (
                      <div
                        className="absolute right-0 top-full mt-1 rounded-[12px] py-1 z-10 shadow-lg"
                        style={{ backgroundColor: "var(--box)", minWidth: 140 }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            // TODO: navigate to edit flow
                            alert(`Edit address: ${addr.label} (placeholder)`);
                            setMenuOpenId(null);
                          }}
                          className="w-full text-left px-4 py-2 text-[13px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 min-h-[44px] flex items-center"
                          style={{ color: "var(--ink)", outlineColor: "#F6B21A" }}
                        >
                          Edit
                        </button>
                        <div className="mx-3" style={{ height: 1, backgroundColor: "var(--div)" }} />
                        <button
                          type="button"
                          onClick={() => handleDelete(addr.id)}
                          className="w-full text-left px-4 py-2 text-[13px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 min-h-[44px] flex items-center"
                          style={{ color: "#B3225A", outlineColor: "#F6B21A" }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Empty state */}
          {addresses.length === 0 && (
            <div className="mt-6 text-center">
              <p className="text-[14px] font-medium mb-3" style={{ color: "var(--ink)" }}>
                No saved addresses yet
              </p>
              <button
                type="button"
                onClick={handleAddNew}
                data-pressable=""
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[12px] text-[14px] font-medium outline-none focus-visible:outline-2 focus-visible:outline-offset-2 no-select"
                style={{
                  backgroundColor: "var(--box)",
                  color: "var(--ico-fg)",
                  outlineColor: "#F6B21A",
                }}
              >
                <IconPlus size={16} />
                Add new address
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes sheetSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes sheetScrimIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Nested Add Address Sheet */}
      <AddAddressSheet open={addSheetOpen} onClose={() => setAddSheetOpen(false)} />
    </div>
  );
}
