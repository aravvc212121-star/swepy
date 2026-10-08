"use client";

import { useState, useCallback } from "react";
import { IconArrowLeft, IconCurrentLocation } from "@/components/icons";
import { useGeo } from "@/lib/geo-store";
import { useAddressStore } from "@/lib/address-store";

type AddressFormData = {
  label: string;
  type: "home" | "work" | "other";
  locality: string;
  pincode: string;
  state: string;
  city: string;
  landmark: string;
  buildingNo: string;
  apartment: string;
};

const EMPTY: AddressFormData = {
  label: "",
  type: "home",
  locality: "",
  pincode: "",
  state: "",
  city: "",
  landmark: "",
  buildingNo: "",
  apartment: "",
};

async function reverseGeocodeFull(lat: number, lng: number) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (data?.address) {
      const a = data.address;
      return {
        locality: a.suburb || a.neighbourhood || a.village || a.hamlet || a.road || "",
        pincode: a.postcode || "",
        state: a.state || "",
        city: a.city || a.town || a.state_district || a.county || "",
      };
    }
  } catch { /* ignore */ }
  return { locality: "", pincode: "", state: "", city: "" };
}

export default function AddAddressSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const geo = useGeo();
  const { addAddress } = useAddressStore();
  const [form, setForm] = useState<AddressFormData>(EMPTY);
  const [fetching, setFetching] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<string | null>(null);

  const update = (key: keyof AddressFormData, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const handleAutoFetch = useCallback(async () => {
    if (!navigator.geolocation) {
      setFetchStatus("Geolocation not supported");
      return;
    }
    setFetching(true);
    setFetchStatus("Fetching your location…");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const result = await reverseGeocodeFull(latitude, longitude);
        setForm((p) => ({
          ...p,
          locality: result.locality,
          pincode: result.pincode,
          state: result.state,
          city: result.city,
        }));
        setFetching(false);
        setFetchStatus("Address fetched!");
        // Also update the global geo store
        geo.requestLocation();
      },
      (err) => {
        setFetching(false);
        if (err.code === err.PERMISSION_DENIED) {
          setFetchStatus("Location denied. Enable in settings.");
        } else {
          setFetchStatus("Could not fetch location. Try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, [geo]);

  const handleSave = () => {
    const line = [form.apartment, form.buildingNo, form.landmark, form.locality, form.city, form.state, form.pincode]
      .filter(Boolean)
      .join(", ");

    if (!line.trim()) return;

    addAddress({
      id: `addr_${Date.now()}`,
      label: form.label || (form.type === "home" ? "Home" : form.type === "work" ? "Work" : "Other"),
      type: form.type,
      line,
    });

    setForm(EMPTY);
    setFetchStatus(null);
    onClose();
  };

  if (!open) return null;

  const typeOptions: { value: AddressFormData["type"]; label: string }[] = [
    { value: "home", label: "🏠 Home" },
    { value: "work", label: "💼 Work" },
    { value: "other", label: "📍 Other" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "var(--app-bg)" }}>
      {/* Header */}
      <div
        className="shrink-0 flex items-center gap-3 px-4"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
          paddingBottom: 12,
          borderBottom: "1px solid var(--surface-border)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full"
          style={{ border: "1px solid var(--surface-border)" }}
          aria-label="Back"
        >
          <IconArrowLeft size={18} className="text-ink" />
        </button>
        <h2 className="text-[16px] font-medium text-ink">Add new address</h2>
      </div>

      {/* Scrollable form */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4"
        style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
      >
        {/* Auto-fetch button */}
        <button
          type="button"
          onClick={handleAutoFetch}
          disabled={fetching}
          data-pressable=""
          className="w-full flex items-center gap-3 rounded-[12px] p-3 mb-4 no-select"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--surface-border)" }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: "var(--brand-rose)" }}
          >
            <IconCurrentLocation size={18} className="text-white" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[14px] font-medium" style={{ color: "var(--brand-rose)" }}>
              {fetching ? "Fetching…" : "Auto-fetch from location"}
            </p>
            <p className="text-[12px] text-ink-muted truncate">
              {fetchStatus || "Fills locality, pincode & state automatically"}
            </p>
          </div>
        </button>

        {/* Address type */}
        <label className="text-[12px] font-medium text-ink-muted mb-2 block">Save as</label>
        <div className="flex gap-2 mb-4">
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("type", opt.value)}
              className="flex-1 py-2 rounded-[10px] text-[13px] font-medium transition-colors"
              style={{
                backgroundColor: form.type === opt.value ? "var(--brand-rose)" : "var(--surface)",
                color: form.type === opt.value ? "#fff" : "var(--ink)",
                border: `1px solid ${form.type === opt.value ? "var(--brand-rose)" : "var(--surface-border)"}`,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Label */}
        <InputField label="Address name" placeholder="e.g. Home, Mom's place" value={form.label} onChange={(v) => update("label", v)} />

        {/* Auto-fetched fields */}
        <div className="flex gap-3">
          <div className="flex-1">
            <InputField label="Locality / Area" placeholder="Koramangala" value={form.locality} onChange={(v) => update("locality", v)} />
          </div>
          <div className="w-[120px]">
            <InputField label="Pincode" placeholder="560034" value={form.pincode} onChange={(v) => update("pincode", v)} inputMode="numeric" />
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <InputField label="City" placeholder="Bengaluru" value={form.city} onChange={(v) => update("city", v)} />
          </div>
          <div className="flex-1">
            <InputField label="State" placeholder="Karnataka" value={form.state} onChange={(v) => update("state", v)} />
          </div>
        </div>

        {/* Divider */}
        <div className="my-4" style={{ height: 1, backgroundColor: "var(--surface-border)" }} />
        <p className="text-[12px] text-ink-muted mb-3">Details (helps the helper find you)</p>

        {/* User-entered fields */}
        <InputField label="Apartment / Flat name" placeholder="Sunrise Heights" value={form.apartment} onChange={(v) => update("apartment", v)} />
        <InputField label="Building / Floor no." placeholder="Tower B, 4th floor, 402" value={form.buildingNo} onChange={(v) => update("buildingNo", v)} />
        <InputField label="Landmark" placeholder="Near SBI ATM" value={form.landmark} onChange={(v) => update("landmark", v)} />
      </div>

      {/* Save button */}
      <div
        className="shrink-0 px-4 py-3"
        style={{
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          borderTop: "1px solid var(--surface-border)",
          backgroundColor: "var(--app-bg)",
        }}
      >
        <button
          type="button"
          onClick={handleSave}
          data-pressable=""
          className="w-full h-[48px] rounded-[12px] text-[15px] font-medium text-white no-select"
          style={{ backgroundColor: "var(--brand-rose)" }}
        >
          Save address
        </button>
      </div>
    </div>
  );
}

/* ── Reusable Input Field ── */
function InputField({
  label,
  placeholder,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "text" | "numeric";
}) {
  return (
    <div className="mb-3">
      <label className="text-[12px] font-medium text-ink-muted mb-1 block">{label}</label>
      <input
        type="text"
        inputMode={inputMode || "text"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-[44px] rounded-[10px] px-3 text-[14px] text-ink outline-none"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--surface-border)",
          caretColor: "var(--brand-rose)",
        }}
      />
    </div>
  );
}
