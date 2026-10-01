"use client";

import { useState, useEffect } from "react";
import { demoBooking } from "@/lib/mock-data";
import { formatINR, formatHomeSize } from "@/lib/utils";
import {
  IconArrowLeft,
  IconCheck,
  IconPhone,
  IconBrandWhatsapp,
  IconMapPin,
  IconNavigation,
  IconClock,
} from "@/components/icons";
import type { TrackingStep } from "@/lib/types";
import Link from "next/link";

function getTrackingSteps(state: string): TrackingStep[] {
  switch (state) {
    case "assigned":
    case "en_route":
      return [
        { label: "Booked", status: "completed" },
        { label: "On the way", status: "active" },
        { label: "Arrived", status: "upcoming" },
      ];
    case "arrived":
      return [
        { label: "Booked", status: "completed" },
        { label: "On the way", status: "completed" },
        { label: "Arrived", status: "active" },
      ];
    case "in_progress":
      return [
        { label: "Booked", status: "completed" },
        { label: "On the way", status: "completed" },
        { label: "Arrived", status: "completed" },
      ];
    default:
      return [
        { label: "Booked", status: "completed" },
        { label: "On the way", status: "active" },
        { label: "Arrived", status: "upcoming" },
      ];
  }
}

function StepDot({ status }: { status: "completed" | "active" | "upcoming" }) {
  if (status === "completed") {
    return (
      <div className="w-7 h-7 rounded-full bg-sage-soft flex items-center justify-center">
        <IconCheck size={14} className="text-sage" strokeWidth={2.5} />
      </div>
    );
  }
  if (status === "active") {
    return (
      <div className="w-7 h-7 rounded-full bg-teal flex items-center justify-center relative">
        <div className="w-2.5 h-2.5 rounded-full bg-white" />
        <div className="absolute inset-0 rounded-full bg-teal/30 animate-ping" />
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--step-inactive)" }}>
      <div className="w-2.5 h-2.5 rounded-full bg-white/70" />
    </div>
  );
}

function StepLine({ status }: { status: "completed" | "active" | "upcoming" }) {
  return (
    <div className="flex-1 h-[3px] rounded-full mx-1" style={{
      backgroundColor: status === "completed" ? "var(--sage)" : status === "active" ? "var(--teal)" : "var(--step-inactive)",
    }} />
  );
}

function OTPDigit({ digit }: { digit: string }) {
  return (
    <div
      className="w-12 h-14 flex items-center justify-center text-xl font-medium text-ink rounded-[10px]"
      style={{
        backgroundColor: "var(--amber-soft)",
        border: "0.5px solid var(--amber-border)",
      }}
    >
      {digit}
    </div>
  );
}

export default function BookedPage() {
  const booking = demoBooking;
  const helper = booking.helper!;
  const steps = getTrackingSteps(booking.state);

  // Simulate live ETA countdown
  const [eta, setEta] = useState(booking.eta_minutes);
  useEffect(() => {
    const interval = setInterval(() => {
      setEta((prev) => Math.max(1, prev - 1));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Simulated helper position for map
  const [helperProgress, setHelperProgress] = useState(0.3);
  useEffect(() => {
    const interval = setInterval(() => {
      setHelperProgress((prev) => Math.min(0.95, prev + 0.02));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const otpDigits = booking.start_otp.split("");

  return (
    <div className="mobile-frame bg-app-bg min-h-screen pb-6">
      {/* ── Blush header with rounded bottom ── */}
      <div
        className="px-4 pt-[env(safe-area-inset-top)] pb-6"
        style={{
          backgroundColor: "var(--blush)",
          borderRadius: "0 0 20px 20px",
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between pt-3 mb-5">
          <Link href="/" className="w-9 h-9 flex items-center justify-center rounded-full bg-white/80">
            <IconArrowLeft size={20} className="text-ink" />
          </Link>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-[13px] font-medium text-ink"
            style={{ border: "0.5px solid var(--surface-border)" }}
          >
            Help
          </div>
        </div>

        {/* Booked confirmation */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-sage-soft flex items-center justify-center">
            <IconCheck size={14} className="text-sage" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[13px] font-medium text-sage-text">Helper booked</p>
            <p className="text-[11px] text-ink-muted">Thanks for trusting Swepy</p>
          </div>
        </div>

        {/* Headline with ETA */}
        <h1 className="text-[22px] font-medium text-ink leading-tight mb-5">
          {helper.name} is arriving in{" "}
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-[8px] text-ink font-medium"
            style={{ backgroundColor: "var(--amber)" }}
          >
            {eta} min
          </span>
        </h1>

        {/* Progress steps */}
        <div className="flex items-center mb-2">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center" style={{ flex: i < steps.length - 1 ? 1 : "none" }}>
              <StepDot status={step.status} />
              {i < steps.length - 1 && (
                <StepLine status={steps[i + 1].status === "upcoming" ? "upcoming" : step.status === "completed" ? "completed" : "active"} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between px-1">
          {steps.map((step) => (
            <span
              key={step.label}
              className="text-[11px]"
              style={{
                color:
                  step.status === "completed"
                    ? "var(--sage-text)"
                    : step.status === "active"
                    ? "var(--teal-dark)"
                    : "var(--ink-muted)",
                fontWeight: step.status === "active" ? 500 : 400,
              }}
            >
              {step.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Helper card ── */}
      <div className="px-4 mt-4">
        <div
          className="bg-surface rounded-[14px] p-4 flex items-center gap-3"
          style={{ border: "0.5px solid var(--surface-border)" }}
        >
          {/* Avatar initial */}
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium shrink-0"
            style={{
              backgroundColor: "var(--teal-soft)",
              color: "var(--teal-dark)",
            }}
          >
            {helper.avatar_initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-medium text-ink">
              {helper.name}, your Swepy pro
            </p>
            <p className="text-[13px] text-ink-muted">
              {helper.jobs_completed} jobs · {helper.rating} rating
            </p>
          </div>
          {/* Call button */}
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: "var(--brand-rose)" }}
            aria-label="Call helper"
          >
            <IconPhone size={18} className="text-white" />
          </button>
        </div>
      </div>

      {/* ── OTP card ── */}
      <div className="px-4 mt-3">
        <div
          className="bg-surface rounded-[14px] p-4"
          style={{ border: "0.5px solid var(--surface-border)" }}
        >
          <p className="text-[13px] text-ink-muted mb-3">
            Share this OTP with {helper.name} when she arrives
          </p>
          <div className="flex gap-3 justify-center">
            {otpDigits.map((digit, i) => (
              <OTPDigit key={i} digit={digit} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Map card ── */}
      <div className="px-4 mt-3">
        <div
          className="bg-surface rounded-[14px] overflow-hidden"
          style={{ border: "0.5px solid var(--surface-border)" }}
        >
          {/* Fake map */}
          <div
            className="relative h-[200px] overflow-hidden"
            style={{ backgroundColor: "#EDF3F3" }}
          >
            {/* Road grid */}
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Horizontal roads */}
              <line x1="0" y1="60" x2="400" y2="60" stroke="white" strokeWidth="8" />
              <line x1="0" y1="120" x2="400" y2="120" stroke="white" strokeWidth="6" />
              <line x1="0" y1="170" x2="400" y2="170" stroke="white" strokeWidth="8" />
              {/* Vertical roads */}
              <line x1="80" y1="0" x2="80" y2="220" stroke="white" strokeWidth="6" />
              <line x1="200" y1="0" x2="200" y2="220" stroke="white" strokeWidth="8" />
              <line x1="320" y1="0" x2="320" y2="220" stroke="white" strokeWidth="6" />
              {/* Parks */}
              <rect x="100" y="75" width="80" height="35" rx="6" fill="#D9EDE0" />
              <rect x="230" y="130" width="70" height="30" rx="6" fill="#D9EDE0" />
            </svg>

            {/* Route line */}
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <path
                d={`M ${80 + helperProgress * 240} ${60} L 200 60 L 200 120 L 320 120 L 320 170`}
                stroke="var(--teal)"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* Helper pin (teal, moving) */}
            <div
              className="absolute transition-all duration-[5000ms] ease-linear"
              style={{
                left: `${80 + helperProgress * 240}px`,
                top: "46px",
              }}
            >
              <div className="w-8 h-8 rounded-full bg-teal flex items-center justify-center shadow-sm -translate-x-1/2">
                <span className="text-white text-[11px] font-medium">
                  {helper.avatar_initial}
                </span>
              </div>
            </div>

            {/* Home pin (brand rose) */}
            <div className="absolute" style={{ left: "312px", top: "155px" }}>
              <div className="w-8 h-8 -translate-x-1/2">
                <IconMapPin size={28} className="text-brand-rose" strokeWidth={2} />
              </div>
            </div>

            {/* Distance/ETA chip */}
            <div
              className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-[12px] font-medium text-ink"
              style={{ border: "0.5px solid var(--surface-border)" }}
            >
              <IconNavigation size={14} className="text-teal" />
              {booking.distance_km} km · {eta} min
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary row ── */}
      <div className="px-4 mt-3">
        <div
          className="bg-surface rounded-[14px] p-4"
          style={{ border: "0.5px solid var(--surface-border)" }}
        >
          <div className="space-y-2.5">
            <div className="flex justify-between text-[13px]">
              <span className="text-ink-muted">Service</span>
              <span className="text-ink font-medium">{booking.service.name}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-ink-muted">Home size</span>
              <span className="text-ink font-medium">{formatHomeSize(booking.home_size)}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-ink-muted">Duration</span>
              <span className="text-ink font-medium">{booking.service_price.base_minutes} min</span>
            </div>
            {booking.addons.length > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-ink-muted">Add-ons</span>
                <span className="text-ink font-medium">
                  {booking.addons.map((a) => a.name).join(", ")}
                </span>
              </div>
            )}
            <div
              className="pt-2.5 mt-1 flex justify-between text-[14px]"
              style={{ borderTop: "0.5px solid var(--surface-border)" }}
            >
              <span className="text-ink font-medium">Total</span>
              <span className="text-ink font-medium">{formatINR(booking.price_breakdown.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Share details ── */}
      <div className="px-4 mt-3">
        <button
          className="w-full bg-surface rounded-[14px] p-4 flex items-center justify-center gap-2 text-[13px] text-ink-muted font-medium"
          style={{ border: "0.5px solid var(--surface-border)" }}
        >
          <IconBrandWhatsapp size={18} className="text-[#25D366]" />
          Booked for someone else? Share details
        </button>
      </div>
    </div>
  );
}
