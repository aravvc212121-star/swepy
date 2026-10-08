"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useProfileStore } from "@/lib/profile-store";
import { IconArrowLeft, IconCamera, IconUser, IconCheck } from "@/components/icons";
import Link from "next/link";

function Toast({ message, visible }: { message: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-60 px-4 py-2.5 rounded-[12px] text-[13px] font-medium text-white flex items-center gap-2"
      style={{ backgroundColor: "#1F1A24" }}
    >
      <IconCheck size={16} /> {message}
    </div>
  );
}

export default function EditProfilePage() {
  const { t } = useI18n();
  const router = useRouter();
  const profile = useProfileStore();

  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [avatar, setAvatar] = useState<string | null>(profile.avatar);
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync from store after hydration
  useEffect(() => {
    setName(profile.name);
    setEmail(profile.email);
    setAvatar(profile.avatar);
  }, [profile.name, profile.email, profile.avatar]);

  const isDirty =
    name !== profile.name ||
    email !== profile.email ||
    avatar !== profile.avatar;

  const validate = (): boolean => {
    let valid = true;
    if (!name.trim()) {
      setNameError(t("editProfile.fullNameRequired"));
      valid = false;
    } else if (name.trim().length < 2) {
      setNameError(t("editProfile.fullNameMinLength"));
      valid = false;
    } else if (name.trim().length > 50) {
      setNameError(t("editProfile.fullNameMaxLength"));
      valid = false;
    } else {
      setNameError("");
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError(t("editProfile.emailInvalid"));
      valid = false;
    } else {
      setEmailError("");
    }
    return valid;
  };

  const handleSave = () => {
    if (!validate()) return;
    profile.updateProfile({
      name: name.trim(),
      email: email.trim(),
      avatar,
    });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
    setTimeout(() => router.back(), 500);
  };

  const handleBack = () => {
    if (isDirty) {
      if (confirm(t("editProfile.unsavedMessage"))) {
        router.back();
      }
    } else {
      router.back();
    }
  };

  const processImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = Math.min(img.width, img.height, 512);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
        setAvatar(canvas.toDataURL("image/jpeg", 0.8));
        setShowAvatarMenu(false);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  return (
    <div
      className="bg-app-bg min-h-dvh w-full max-w-[430px] mx-auto"
      style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}
    >
      <Toast message={t("editProfile.saved")} visible={showToast} />

      {/* Header */}
      <div className="px-4 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3 py-3">
          <button
            type="button"
            onClick={handleBack}
            className="w-11 h-11 flex items-center justify-center rounded-full no-select"
            style={{ border: "0.5px solid var(--surface-border)" }}
            aria-label={t("common.back")}
            data-pressable=""
          >
            <IconArrowLeft size={20} className="text-ink" />
          </button>
          <h1 className="text-[17px] font-medium text-ink">
            {t("editProfile.title")}
          </h1>
        </div>
      </div>

      {/* Avatar section */}
      <div className="flex flex-col items-center mt-4 mb-6">
        <div className="relative">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: "var(--teal-soft)" }}
          >
            {avatar ? (
              <img
                src={avatar}
                alt={t("editProfile.avatar")}
                className="w-full h-full object-cover"
              />
            ) : (
              <IconUser size={32} style={{ color: "var(--teal-dark)" }} />
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowAvatarMenu(!showAvatarMenu)}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "var(--brand-rose)" }}
            aria-label={t("editProfile.avatar")}
          >
            <IconCamera size={14} className="text-white" />
          </button>
        </div>

        {/* Avatar menu */}
        {showAvatarMenu && (
          <div
            className="mt-2 flex gap-2"
          >
            <button
              type="button"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = "image/*";
                  fileInputRef.current.capture = "environment";
                  fileInputRef.current.click();
                }
              }}
              className="px-3 py-2 rounded-[10px] text-[12px] font-medium"
              style={{
                backgroundColor: "var(--teal-soft)",
                color: "var(--teal-dark)",
                border: "0.5px solid var(--teal)",
              }}
              data-pressable=""
            >
              {t("editProfile.camera")}
            </button>
            <button
              type="button"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = "image/*";
                  fileInputRef.current.removeAttribute("capture");
                  fileInputRef.current.click();
                }
              }}
              className="px-3 py-2 rounded-[10px] text-[12px] font-medium"
              style={{
                backgroundColor: "var(--teal-soft)",
                color: "var(--teal-dark)",
                border: "0.5px solid var(--teal)",
              }}
              data-pressable=""
            >
              {t("editProfile.gallery")}
            </button>
            {avatar && (
              <button
                type="button"
                onClick={() => {
                  setAvatar(null);
                  setShowAvatarMenu(false);
                }}
                className="px-3 py-2 rounded-[10px] text-[12px] font-medium"
                style={{
                  backgroundColor: "var(--surface)",
                  color: "var(--brand-rose)",
                  border: "0.5px solid var(--surface-border)",
                }}
                data-pressable=""
              >
                {t("editProfile.remove")}
              </button>
            )}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Form fields */}
      <div className="px-4 space-y-3">
        {/* Full name */}
        <div
          className="bg-white rounded-[14px] p-4"
          style={{ border: `0.5px solid ${nameError ? "var(--brand-rose)" : "var(--surface-border)"}` }}
        >
          <label className="text-[12px] font-medium text-ink-muted block mb-1">
            {t("editProfile.fullName")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError("");
            }}
            className="w-full bg-transparent outline-none text-ink"
            style={{ fontSize: "16px" }}
          />
          {nameError && (
            <p className="text-[12px] mt-1" style={{ color: "var(--brand-rose)" }}>
              {nameError}
            </p>
          )}
        </div>

        {/* Phone (read-only) */}
        <div
          className="bg-white rounded-[14px] p-4"
          style={{ border: "0.5px solid var(--surface-border)" }}
        >
          <div className="flex items-center justify-between mb-1">
            <label className="text-[12px] font-medium text-ink-muted">
              {t("editProfile.phone")}
            </label>
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "var(--sage-soft)", color: "var(--sage-text)" }}
            >
              {t("editProfile.phoneVerified")}
            </span>
          </div>
          <p className="text-[16px] text-ink" style={{ opacity: 0.6 }}>
            {profile.phone}
          </p>
          <p className="text-[11px] text-ink-muted mt-1">
            {t("editProfile.phoneHelper")}
          </p>
        </div>

        {/* Email */}
        <div
          className="bg-white rounded-[14px] p-4"
          style={{ border: `0.5px solid ${emailError ? "var(--brand-rose)" : "var(--surface-border)"}` }}
        >
          <div className="flex items-center justify-between mb-1">
            <label className="text-[12px] font-medium text-ink-muted">
              {t("editProfile.email")}
            </label>
            <span className="text-[11px] text-ink-muted">
              {t("editProfile.emailOptional")}
            </span>
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError("");
            }}
            placeholder="name@example.com"
            className="w-full bg-transparent outline-none text-ink placeholder:text-ink-muted/50"
            style={{ fontSize: "16px" }}
          />
          <p className="text-[11px] text-ink-muted mt-1">
            {t("editProfile.emailHelper")}
          </p>
          {emailError && (
            <p className="text-[12px] mt-1" style={{ color: "var(--brand-rose)" }}>
              {emailError}
            </p>
          )}
        </div>
      </div>

      {/* Save button */}
      <div className="px-4 mt-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty}
          className="w-full h-12 rounded-[12px] text-[15px] font-medium text-white flex items-center justify-center"
          style={{
            backgroundColor: isDirty ? "var(--brand-rose)" : "var(--surface-border)",
            cursor: isDirty ? "pointer" : "not-allowed",
          }}
          data-pressable={isDirty ? "" : undefined}
        >
          {t("editProfile.saveChanges")}
        </button>
      </div>
    </div>
  );
}
