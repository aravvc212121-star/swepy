"use client";

import { useRef, useState } from "react";
import { useAddressStore } from "@/lib/address-store";
import { useGeo } from "@/lib/geo-store";
import { IconMapPin, IconChevronDown } from "@/components/icons";
import AddressSheet from "@/components/address-sheet";
import { useI18n } from "@/lib/i18n";

/**
 * LocationTrigger — tappable row on the home screen that opens the
 * address selection bottom sheet. Displays "<Label>, <first part of line>".
 */
export default function LocationTrigger() {
  const { currentAddress } = useAddressStore();
  const geo = useGeo();
  const { t } = useI18n();
  const [sheetOpen, setSheetOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleClose = () => {
    setSheetOpen(false);
    // Return focus to trigger
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  // If geolocation is granted and we have a reverse-geocoded address, show it
  // Otherwise fall back to the saved address store
  let displayText: string;
  if (geo.status === "granted" && geo.address) {
    displayText = geo.pincode ? `${geo.address} - ${geo.pincode}` : geo.address;
  } else if (currentAddress) {
    displayText = `${currentAddress.label}, ${currentAddress.line.split(",")[0].trim()}`;
  } else {
    displayText = t("location.selectLocation");
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setSheetOpen(true)}
        data-pressable=""
        className="flex items-center gap-1 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 rounded-[6px] py-1 px-1 no-select min-w-0 max-w-[200px]"
        style={{ outlineColor: "#F6B21A" }}
        aria-label={t("location.deliveryLocation").replace("{{address}}", displayText)}
        suppressHydrationWarning
      >
        <IconMapPin size={14} className="text-white shrink-0" />
        <span className="text-[13px] font-medium truncate leading-none" style={{ color: "rgba(255,255,255,0.92)" }} suppressHydrationWarning>
          {displayText}
        </span>
        <IconChevronDown size={12} className="text-white/60 shrink-0" />
      </button>

      <AddressSheet open={sheetOpen} onClose={handleClose} />
    </>
  );
}
