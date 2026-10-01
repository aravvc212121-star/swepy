"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/app-shell";
import BottomNav from "@/components/bottom-nav";
import { PageTitle, Card, ListCard, ListCardRow } from "@/components/ui";
import {
  IconUser,
  IconEdit,
  IconMapPin,
  IconWallet,
  IconLanguage,
  IconLogout,
  IconChevronRight,
  IconBolt,
} from "@/components/icons";
import { demoUser, demoAddress } from "@/lib/mock-data";

export default function ProfilePage() {
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [isStandaloneMode, setIsStandaloneMode] = useState(true); // default true to avoid flash

  useEffect(() => {
    setIsStandaloneMode(
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    );
  }, []);

  return (
    <>
      <AppShell>
        <PageTitle>Profile</PageTitle>

        {/* User info card */}
        <Card>
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: "#E3F4F5" }}
            >
              <IconUser size={22} style={{ color: "#0A5A61" }} />
            </div>
            {/* Name + phone */}
            <div className="flex-1 min-w-0">
              <p className="text-[16px] font-medium" style={{ color: "#1F1A24" }}>
                {demoUser.name}
              </p>
              <p className="text-[13px]" style={{ color: "#6B6270" }}>
                {demoUser.phone}
              </p>
            </div>
            {/* Edit button */}
            <button
              type="button"
              className="w-11 h-11 flex items-center justify-center rounded-full shrink-0 no-select"
              style={{ border: "0.5px solid #E6DEE2" }}
              aria-label="Edit profile"
              data-pressable=""
            >
              <IconEdit size={18} className="text-ink-muted" />
            </button>
          </div>
        </Card>

        {/* Addresses + Payment methods */}
        <div className="mt-3">
          <ListCard>
            <ListCardRow onClick={() => {}}>
              <IconMapPin size={20} className="text-teal shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium" style={{ color: "#1F1A24" }}>
                  Saved addresses
                </p>
                <p className="text-[12px]" style={{ color: "#6B6270" }}>
                  {demoAddress.label}, {demoAddress.tower} {demoAddress.flat}
                </p>
              </div>
              <IconChevronRight size={16} className="text-ink-muted shrink-0" />
            </ListCardRow>
            <ListCardRow last onClick={() => {}}>
              <IconWallet size={20} className="text-teal shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium" style={{ color: "#1F1A24" }}>
                  Payment methods
                </p>
                <p className="text-[12px]" style={{ color: "#6B6270" }}>
                  UPI, cards
                </p>
              </div>
              <IconChevronRight size={16} className="text-ink-muted shrink-0" />
            </ListCardRow>
          </ListCard>
        </div>

        {/* Language card */}
        <div className="mt-3">
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <IconLanguage size={20} className="text-ink-muted" />
              <span className="text-[14px] font-medium" style={{ color: "#1F1A24" }}>
                Language
              </span>
            </div>
            <div className="flex gap-2">
              {(
                [
                  { key: "en", label: "English" },
                  { key: "hi", label: "हिन्दी" },
                ] as const
              ).map((lang) => {
                const isSelected = language === lang.key;
                return (
                  <button
                    key={lang.key}
                    type="button"
                    onClick={() => setLanguage(lang.key)}
                    data-pressable=""
                    className="flex-1 h-11 rounded-[10px] text-[13px] font-medium no-select"
                    style={{
                      backgroundColor: isSelected ? "#E3F4F5" : "#FFFFFF",
                      border: `0.5px solid ${isSelected ? "#0F8B94" : "#E6DEE2"}`,
                      color: isSelected ? "#0A5A61" : "#1F1A24",
                    }}
                  >
                    {lang.label}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Install app (hidden when already standalone) */}
        {!isStandaloneMode && (
          <div className="mt-3">
            <ListCard>
              <ListCardRow last onClick={() => {}}>
                <IconBolt size={20} className="text-teal shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium" style={{ color: "#1F1A24" }}>
                    Install app
                  </p>
                  <p className="text-[12px]" style={{ color: "#6B6270" }}>
                    Faster booking from your home screen
                  </p>
                </div>
                <IconChevronRight size={16} className="text-ink-muted shrink-0" />
              </ListCardRow>
            </ListCard>
          </div>
        )}

        {/* Logout */}
        <div className="mt-3">
          <ListCard>
            <ListCardRow last onClick={() => {}}>
              <IconLogout size={20} style={{ color: "#B3295B" }} />
              <span className="text-[14px] font-medium" style={{ color: "#B3295B" }}>
                Log out
              </span>
            </ListCardRow>
          </ListCard>
        </div>
      </AppShell>

      <BottomNav />
    </>
  );
}
