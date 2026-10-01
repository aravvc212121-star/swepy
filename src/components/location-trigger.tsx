"use client";

import { useRef, useState } from "react";
import { useAddressStore } from "@/lib/address-store";
import { IconMapPin, IconChevronDown } from "@/components/icons";
import AddressSheet from "@/components/address-sheet";

/**
 * LocationTrigger — tappable row on the home screen that opens the
 * address selection bottom sheet. Displays "<Label>, <first part of line>".
 */
export default function LocationTrigger() {
  const { currentAddress } = useAddressStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleClose = () => {
    setSheetOpen(false);
    // Return focus to trigger
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  // Derive display text: "<Label>, <first comma-separated part of the address line>"
  const displayText = currentAddress
    ? `${currentAddress.label}, ${currentAddress.line.split(",")[0].trim()}`
    : "Select location";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setSheetOpen(true)}
        data-pressable=""
        className="flex items-center gap-2 mt-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 rounded-[8px] min-h-[44px] px-2 -ml-2 no-select"
        style={{ outlineColor: "#F6B21A" }}
        aria-label={`Delivery location: ${displayText}. Tap to change.`}
      >
        <IconMapPin size={16} className="text-white shrink-0" />
        <span className="text-[13px] truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
          {displayText}
        </span>
        <IconChevronDown size={14} className="text-white/50 shrink-0" />
      </button>

      <AddressSheet open={sheetOpen} onClose={handleClose} />
    </>
  );
}
