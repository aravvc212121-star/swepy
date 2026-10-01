"use client";

import { useState } from "react";
import AppShell from "@/components/app-shell";
import BottomNav from "@/components/bottom-nav";
import { PageTitle, SectionTitle, Card, ListCard, ListCardRow } from "@/components/ui";
import { IconBrandWhatsapp, IconAlertTriangle, IconChevronDown } from "@/components/icons";
import { faqData } from "@/lib/mock-data";

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <AppShell>
        <PageTitle>Help</PageTitle>

        {/* Action cards — 2-column grid */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href="https://wa.me/919876543210"
            target="_blank"
            rel="noopener noreferrer"
            className="no-underline no-select"
            data-pressable=""
          >
            <Card className="min-h-24 flex flex-col items-start gap-2">
              <IconBrandWhatsapp size={24} className="text-sage" />
              <span className="text-[14px] font-medium" style={{ color: "#1F1A24" }}>
                Chat on WhatsApp
              </span>
            </Card>
          </a>
          <button type="button" className="text-left w-full no-select" data-pressable="">
            <Card className="min-h-24 flex flex-col items-start gap-2">
              <IconAlertTriangle size={24} className="text-brand-rose" />
              <span className="text-[14px] font-medium" style={{ color: "#1F1A24" }}>
                Report a problem
              </span>
            </Card>
          </button>
        </div>

        {/* FAQ */}
        <SectionTitle>Frequently asked questions</SectionTitle>
        <ListCard>
          {faqData.map((faq, i) => (
            <div key={i}>
              <ListCardRow
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                last={i === faqData.length - 1 && openFaq !== i}
              >
                <span className="flex-1 text-[14px]" style={{ color: "#1F1A24" }}>
                  {faq.question}
                </span>
                <IconChevronDown
                  size={16}
                  className={`text-ink-muted shrink-0 transition-transform duration-200 ${
                    openFaq === i ? "rotate-180" : ""
                  }`}
                />
              </ListCardRow>
              {openFaq === i && (
                <div
                  className="px-4 pb-3.5"
                  style={
                    i !== faqData.length - 1
                      ? { borderBottom: "0.5px solid #E6DEE2" }
                      : undefined
                  }
                >
                  <p className="text-[13px] leading-relaxed" style={{ color: "#6B6270" }}>
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </ListCard>
      </AppShell>

      <BottomNav />
    </>
  );
}
