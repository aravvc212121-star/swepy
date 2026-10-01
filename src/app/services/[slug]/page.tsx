"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { IconArrowLeft, IconCheck, IconX } from "@/components/icons";
import { allServices, getServiceBySlug, type Service } from "@/data/services";
import { notFound } from "next/navigation";
import { use, useEffect, useRef } from "react";

/* ── IncludedList ── */
function IncludedList({
  items,
  variant,
}: {
  items: string[];
  variant: "included" | "excluded";
}) {
  const isIncluded = variant === "included";
  const circleColor = isIncluded ? "#1E9C8C" : "#D64550";
  const label = isIncluded ? "What's included" : "Not included";
  const Icon = isIncluded ? IconCheck : IconX;

  return (
    <div
      className="rounded-[12px] p-3.5 mt-3"
      style={{ backgroundColor: "#FFF1F6" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2.5">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: circleColor }}
        >
          <Icon size={14} className="text-white" />
        </div>
        <span className="text-[15px] font-medium" style={{ color: "#3B1428" }}>
          {label}
        </span>
      </div>
      {/* List */}
      <ul className="list-none m-0 p-0">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 py-[5px]"
          >
            <Icon
              size={16}
              className="shrink-0 mt-0.5"
              aria-hidden="true"
              {...{ style: { color: circleColor } }}
            />
            <span
              className="text-[13px] leading-[1.45]"
              style={{ color: "#3B1428" }}
            >
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── StickyBookBar ── */
function StickyBookBar({ slug }: { slug: string }) {
  return (
    <div
      className="sticky bottom-0 left-0 right-0 z-10"
      style={{
        backgroundColor: "#FFFFFF",
        borderTop: "1px solid #F6D9E5",
        padding: "12px 16px",
        paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <a
        href={`/book?service=${slug}`}
        data-pressable=""
        className="flex items-center justify-center w-full h-[48px] rounded-[12px] text-[14px] font-medium no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-2 no-select"
        style={{
          backgroundColor: "#B3225A",
          color: "#FFFFFF",
          outlineColor: "#F6B21A",
        }}
      >
        Book this service
      </a>
    </div>
  );
}

/* ── ServiceDetailPage ── */
export default function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const service = getServiceBySlug(slug);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to top on mount
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [slug]);

  if (!service) {
    notFound();
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-app-bg w-full max-w-[430px] mx-auto relative">
      {/* Header */}
      <div
        className="flex items-center gap-3 shrink-0"
        style={{
          backgroundColor: "#B3225A",
          padding: "12px 16px",
        }}
      >
        <button
          type="button"
          onClick={handleBack}
          data-pressable=""
          className="w-11 h-11 rounded-full bg-white flex items-center justify-center outline-none focus-visible:outline-2 focus-visible:outline-offset-2 no-select"
          style={{ outlineColor: "#F6B21A" }}
          aria-label="Back"
        >
          <IconArrowLeft size={16} style={{ color: "#B3225A" }} />
        </button>
        <h1
          className="text-[15px] font-medium truncate"
          style={{ color: "#FFFFFF" }}
        >
          {service.name}
        </h1>
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {/* Hero image card */}
        <div
          className="rounded-[16px] h-[176px] flex items-center justify-center p-4 overflow-hidden"
          style={{ backgroundColor: "#FFFFFF" }}
        >
          <div className="relative w-full h-full">
            <Image
              src={service.detailImage || service.image}
              alt={service.name}
              fill
              className="object-contain"
              sizes="(max-width: 430px) 90vw, 400px"
              priority
            />
          </div>
        </div>

        {/* Title */}
        <h2
          className="text-[20px] font-medium mt-4"
          style={{ color: "#3B1428" }}
        >
          {service.name}
        </h2>

        {/* Description */}
        <p
          className="text-[13px] leading-[1.5] mt-1"
          style={{ color: "#6E4A5C" }}
        >
          {service.description}
        </p>

        {/* Lists */}
        <IncludedList items={service.included} variant="included" />
        <IncludedList items={service.notIncluded} variant="excluded" />

        {/* Bottom spacer for sticky bar */}
        <div className="h-20" />
      </div>

      {/* Sticky bottom */}
      <StickyBookBar slug={service.slug} />

    </div>
  );
}
