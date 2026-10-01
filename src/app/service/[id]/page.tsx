"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { services, servicePrices, addons } from "@/lib/mock-data";
import { formatINR, formatHomeSize, cn } from "@/lib/utils";
import type { HomeSize } from "@/lib/types";
import {
  IconArrowLeft,
  IconCheck,
  IconPlus,
  IconMinus,
  IconBath,
  IconToolsKitchen,
  IconHanger,
  IconIroning,
  IconArmchair,
} from "@/components/icons";

const homeSizes: HomeSize[] = ["1bhk", "2bhk", "3bhk", "4bhk"];

const addonIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  bath: IconBath,
  "tools-kitchen-2": IconToolsKitchen,
  hanger: IconHanger,
  "ironing-1": IconIroning,
  armchair: IconArmchair,
};

const addonImages: Record<string, string> = {
  bath: "/services/bathroom-cleaning.jpg",
  "tools-kitchen-2": "/services/kitchen-cleaning.jpg",
  hanger: "/services/wardrobe-cleaning.jpg",
  "ironing-1": "/services/ironing-and-folding.jpg",
  armchair: "/services/dusting-and-wiping.jpg",
  fridge: "/services/fridge-cleaning.jpg",
  packing: "/services/packing-unpacking.jpg",
  utensils: "/services/utensils.jpg",
  "kitchen-prep": "/services/kitchen-prep.jpg",
  dusting: "/services/dusting-and-wiping.jpg",
  sweeping: "/services/sweeping-and-mopping.jpg",
  wardrobe: "/services/wardrobe-cleaning.jpg",
  window: "/services/window-cleaning.jpg",
  balcony: "/services/window-cleaning.jpg",
  fan: "/services/dusting-and-wiping.jpg",
  cabinet: "/services/kitchen-cleaning.jpg",
  plant: "/services/sweeping-and-mopping.jpg",
  party: "/services/after-party-clean.jpg",
};

export default function ServiceDetailPage() {
  const params = useParams();
  const service = services.find((s) => s.id === params.id) || services[0];
  const [selectedSize, setSelectedSize] = useState<HomeSize>("2bhk");
  const [extensions, setExtensions] = useState(0);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  // Minor clean shows only the original 5 add-ons; Major shows all
  const minorAddonIds = ["addon_washroom", "addon_kitchen", "addon_laundry", "addon_ironing", "addon_sofa"];
  const visibleAddons = service.id === "svc_minor"
    ? addons.filter((a) => minorAddonIds.includes(a.id))
    : addons;

  const price = servicePrices.find(
    (p) => p.service_id === service.id && p.home_size === selectedSize
  );

  if (!price) return null;

  const toggleAddon = (id: string) => {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const addonsTotal = selectedAddons.reduce((sum, id) => {
    const addon = addons.find((a) => a.id === id);
    return sum + (addon?.price || 0);
  }, 0);

  const total = price.price + extensions * price.extension_price + addonsTotal;

  return (
    <div className="bg-app-bg min-h-dvh" style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}>
      {/* Header */}
      <div className="px-4 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3 py-3">
          <Link
            href="/"
            className="w-11 h-11 flex items-center justify-center rounded-full no-select"
            style={{ border: "0.5px solid var(--surface-border)" }}
            data-pressable=""
            aria-label="Back to home"
          >
            <IconArrowLeft size={20} className="text-ink" />
          </Link>
          <h1 className="text-[17px] font-medium text-ink">{service.name}</h1>
        </div>
      </div>

      {/* Scope card */}
      <div className="px-4 mt-2">
        <div className="bg-surface rounded-[14px] p-4" style={{ border: "0.5px solid var(--surface-border)" }}>
          <p className="text-[13px] font-medium text-ink mb-3">What is included</p>
          <div className="space-y-2">
            {service.included.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-sage-soft flex items-center justify-center shrink-0">
                  <IconCheck size={12} className="text-sage" strokeWidth={2.5} />
                </div>
                <span className="text-[13px] text-ink">{item}</span>
              </div>
            ))}
          </div>
          <p className="text-[13px] font-medium text-ink mt-4 mb-3">Not included</p>
          <div className="space-y-2">
            {service.not_included.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--step-inactive)" }}>
                  <IconMinus size={10} className="text-ink-muted" strokeWidth={2.5} />
                </div>
                <span className="text-[13px] text-ink-muted">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Home size picker */}
      <div className="px-4 mt-4">
        <p className="text-[13px] font-medium text-ink mb-3">Select home size</p>
        <div className="flex gap-2">
          {homeSizes.map((size) => {
            const isSelected = size === selectedSize;
            return (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                data-pressable=""
                className="flex-1 py-2.5 rounded-[10px] text-[13px] font-medium min-h-[44px] no-select"
                style={{
                  backgroundColor: isSelected ? "var(--teal-soft)" : "var(--surface)",
                  border: `0.5px solid ${isSelected ? "var(--teal)" : "var(--surface-border)"}`,
                  color: isSelected ? "var(--teal-dark)" : "var(--ink)",
                }}
              >
                {formatHomeSize(size)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price and duration */}
      <div className="px-4 mt-4">
        <div className="bg-surface rounded-[14px] p-4" style={{ border: "0.5px solid var(--surface-border)" }}>
          <div className="flex justify-between mb-2">
            <span className="text-[13px] text-ink-muted">Base price</span>
            <span className="text-[14px] font-medium text-ink">{formatINR(price.price)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[13px] text-ink-muted">Duration</span>
            <span className="text-[14px] font-medium text-ink">{price.base_minutes} min</span>
          </div>
        </div>
      </div>

      {/* Extension stepper */}
      <div className="px-4 mt-4">
        <div className="bg-surface rounded-[14px] p-4 flex items-center justify-between" style={{ border: "0.5px solid var(--surface-border)" }}>
          <div>
            <p className="text-[13px] font-medium text-ink">Extra time</p>
            <p className="text-[12px] text-ink-muted">
              {formatINR(price.extension_price)} per {price.extension_minutes} min
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setExtensions(Math.max(0, extensions - 1))}
              className="w-11 h-11 rounded-full flex items-center justify-center no-select"
              style={{ border: "0.5px solid var(--surface-border)", backgroundColor: "var(--surface)" }}
              disabled={extensions === 0}
              aria-label="Decrease extra time"
              data-pressable=""
            >
              <IconMinus size={14} className={extensions === 0 ? "text-ink-muted/40" : "text-ink"} />
            </button>
            <span className="text-[14px] font-medium text-ink w-4 text-center">{extensions}</span>
            <button
              type="button"
              onClick={() => setExtensions(extensions + 1)}
              className="w-11 h-11 rounded-full flex items-center justify-center no-select"
              style={{ border: "0.5px solid var(--surface-border)", backgroundColor: "var(--surface)" }}
              aria-label="Increase extra time"
              data-pressable=""
            >
              <IconPlus size={14} className="text-ink" />
            </button>
          </div>
        </div>
      </div>

      {/* Add-on toggles */}
      <div className="px-4 mt-4">
        <p className="text-[13px] font-medium text-ink mb-3">Add-ons</p>
        <div className="grid grid-cols-2 gap-3">
          {visibleAddons.map((addon) => {
            const isSelected = selectedAddons.includes(addon.id);
            return (
              <button
                key={addon.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleAddon(addon.id)}
                data-pressable=""
                className="flex flex-col gap-2 rounded-[14px] p-3 text-left relative no-select"
                style={{
                  border: isSelected
                    ? "2px solid #B3225A"
                    : "1px solid #F6D9E5",
                  backgroundColor: isSelected ? "#FFF1F6" : "var(--surface)",
                }}
              >
                {/* Check badge */}
                <div
                  className="absolute top-2.5 right-2.5 flex items-center justify-center shrink-0"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    backgroundColor: isSelected ? "#B3225A" : "transparent",
                    border: isSelected ? "none" : "1.5px solid #F6D9E5",
                  }}
                >
                  {isSelected && <IconCheck size={13} className="text-white" strokeWidth={2.5} />}
                </div>

                {/* Poster image */}
                <div className="relative w-full h-20 rounded-[10px] overflow-hidden">
                  <Image
                    src={addonImages[addon.icon] || "/services/bathroom-cleaning.jpg"}
                    alt={addon.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 430px) 45vw, 200px"
                  />
                </div>

                {/* Label */}
                <div>
                  <p className="text-[13px] font-medium" style={{ color: isSelected ? "#B3225A" : "var(--ink)" }}>
                    {addon.name}
                  </p>
                  <p className="text-[11px] text-ink-muted mt-0.5">{addon.unit}</p>
                </div>

                {/* Price */}
                <p className="text-[12px] font-medium" style={{ color: isSelected ? "#B3225A" : "var(--ink)" }}>
                  {formatINR(addon.price)}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fixed bottom bar */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface px-4 py-3 z-10"
        style={{
          borderTop: "0.5px solid var(--surface-border)",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] text-ink-muted">Total</span>
          <span className="text-[18px] font-medium text-ink">{formatINR(total)}</span>
        </div>
        <Link
          href="/checkout"
          data-pressable=""
          className="w-full flex items-center justify-center py-3.5 rounded-[12px] text-[14px] font-medium text-white no-select min-h-[48px]"
          style={{ backgroundColor: "var(--brand-rose)" }}
        >
          Continue to checkout
        </Link>
      </div>
    </div>
  );
}
