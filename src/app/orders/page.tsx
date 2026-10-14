"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/app-shell";
import BottomNav from "@/components/bottom-nav";
import { Card, CardStack } from "@/components/ui";
import { IconCheck, IconChevronRight, IconClock, IconMapPin, IconSparkles, IconHeadphones } from "@/components/icons";
import { formatINR, formatDate } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useSwepy } from "@/lib/swepy/provider";
import type { Booking as SwepyBooking } from "@/lib/swepy";

type Tab = "ongoing" | "scheduled" | "history";

interface DisplayOrder {
  id: string;
  bookingId: string;
  serviceName: string;
  homeSize: string;
  price: number;
  status: string;
  helperName: string | null;
  scheduledFor?: string | null;
  createdAt: string;
  isReal: boolean;
}

function OrdersContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const { store, ready } = useSwepy();

  const urlTab = searchParams.get("tab") as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(
    urlTab === "history" || urlTab === "scheduled" || urlTab === "ongoing"
      ? urlTab
      : "ongoing"
  );

  // Sync tab with URL if param changes
  useEffect(() => {
    if (urlTab === "history" || urlTab === "scheduled" || urlTab === "ongoing") {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  // Read local store bookings
  const [storeBookings, setStoreBookings] = useState<SwepyBooking[]>([]);

  const loadStoreBookings = () => {
    if (!store) return;
    try {
      const all = store.getAllBookings?.() || store.listBookingsForUser("customer") || [];
      setStoreBookings(all);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (ready) {
      loadStoreBookings();
    }
  }, [ready, store]);

  // Keep synced across tabs/storage changes
  useEffect(() => {
    const handleStorage = () => loadStoreBookings();
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const { ongoing, scheduled, history } = useMemo(() => {
    const ong: DisplayOrder[] = [];
    const sch: DisplayOrder[] = [];
    const hist: DisplayOrder[] = [];
    const seenBookingIds = new Set<string>();

    // 1. Process real bookings from Swepy store
    for (const b of storeBookings) {
      seenBookingIds.add(b.id);
      const isTerminal =
        b.status === "completed" ||
        b.status === "cancelled" ||
        b.status === "expired" ||
        (b.status as string) === "rated";

      const orderItem: DisplayOrder = {
        id: b.id,
        bookingId: b.id,
        serviceName: b.service_name,
        homeSize: b.home_size,
        price: b.price,
        status: b.status,
        helperName: b.helper_name,
        scheduledFor: b.scheduled_for,
        createdAt: b.created_at,
        isReal: true,
      };

      if (isTerminal) {
        hist.push(orderItem);
      } else if (b.scheduled_for) {
        sch.push(orderItem);
      } else {
        ong.push(orderItem);
      }
    }

    return { ongoing: ong, scheduled: sch, history: hist };
  }, [storeBookings]);

  const visibleOrders =
    activeTab === "ongoing"
      ? ongoing
      : activeTab === "scheduled"
      ? scheduled
      : history;

  const getStatusLabel = (order: DisplayOrder) => {
    if (order.status === "completed" || order.status === "rated") {
      return t("orders.completed");
    }
    if (order.status === "cancelled") {
      return t("booking.cancelled");
    }
    if (activeTab === "scheduled") {
      return t("orders.scheduled");
    }
    if (order.status === "on_the_way") {
      return "On the way";
    }
    if (order.status === "arrived") {
      return "Helper arrived";
    }
    if (order.status === "in_progress") {
      return "In progress";
    }
    if (order.status === "accepted") {
      return "Helper assigned";
    }
    if (order.status === "searching") {
      return "Searching helper";
    }
    return t("orders.ongoing");
  };

  return (
    <AppShell className="!pt-2">
      {/* ── Top Header: Booking + Help ── */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--surface-border)]">
        <h1 className="text-[15px] font-semibold text-ink tracking-tight">
          {t("orders.title")}
        </h1>
        <Link
          href="/help"
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[12px] font-semibold text-ink transition-colors border border-[var(--surface-border)] bg-surface no-select shadow-xs hover:border-brand-rose/40"
          data-pressable=""
        >
          <IconHeadphones size={13.5} className="text-brand-rose shrink-0" />
          <span>Help</span>
        </Link>
      </div>

      {/* ── Tabs ── */}
      <div className="flex bg-surface p-[3px] rounded-[12px] mb-4 shadow-xs border border-[var(--surface-border)]">
        {(["ongoing", "scheduled", "history"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-[12px] font-medium rounded-[9px] transition-all no-select cursor-pointer ${
              activeTab === tab
                ? "bg-brand-rose text-white shadow-xs"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {t(`orders.${tab}`)}
            {tab === "ongoing" && ongoing.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-white/20">
                {ongoing.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Order List ── */}
      <CardStack>
        {visibleOrders.map((order) => {
          const isCompleted =
            order.status === "completed" || order.status === "rated";
          const isCancelled = order.status === "cancelled";

          return (
            <a
              key={order.id}
              href={`/booking/${order.bookingId}`}
              className="no-underline block no-select"
              data-pressable=""
            >
              <Card>
                <div className="flex flex-col gap-2">
                  {/* Row 1: status + chevron */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: "#E4F3EA" }}
                        >
                          <IconCheck size={12} className="text-sage" strokeWidth={2.5} />
                        </div>
                      ) : activeTab === "scheduled" ? (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: "rgba(217, 80, 127, 0.12)" }}
                        >
                          <IconClock size={12} className="text-brand-rose" strokeWidth={2.5} />
                        </div>
                      ) : isCancelled ? (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: "#FEF2F2" }}
                        >
                          <span className="text-[10px] text-red-600 font-bold">✕</span>
                        </div>
                      ) : (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: "rgba(217, 80, 127, 0.15)" }}
                        >
                          <div
                            className="w-2 h-2 rounded-full animate-pulse"
                            style={{
                              backgroundColor: "var(--brand-rose)",
                              boxShadow: "0 0 6px rgba(217, 80, 127, 0.6)",
                            }}
                          />
                        </div>
                      )}
                      <span
                        className="text-[13px] font-medium"
                        style={{
                          color: isCompleted
                            ? "#1E6B42"
                            : isCancelled
                            ? "#B3261E"
                            : activeTab === "scheduled"
                            ? "var(--brand-rose)"
                            : "var(--brand-rose)",
                        }}
                      >
                        {getStatusLabel(order)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {activeTab === "ongoing" && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={{
                            backgroundColor: "rgba(217, 80, 127, 0.1)",
                            color: "var(--brand-rose)",
                          }}
                        >
                          Track live →
                        </span>
                      )}
                      <IconChevronRight size={16} className="text-ink-muted" />
                    </div>
                  </div>

                  {/* Row 2: service name + price */}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[15px] font-medium text-ink">
                      {order.serviceName} · {order.homeSize}
                    </span>
                    <span className="text-[15px] font-medium text-ink">
                      {formatINR(order.price)}
                    </span>
                  </div>

                  {/* Row 3: helper · date */}
                  <div className="flex items-center justify-between text-[12px] text-ink-muted mt-0.5">
                    <span>
                      {order.helperName ? `Helper: ${order.helperName}` : "Assigning helper..."}
                    </span>
                    <span>
                      {activeTab === "scheduled" && order.scheduledFor
                        ? formatDate(order.scheduledFor)
                        : formatDate(order.createdAt)}
                    </span>
                  </div>
                </div>
              </Card>
            </a>
          );
        })}
      </CardStack>

      {visibleOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center min-h-[55dvh] py-8">
          <p className="text-[17px] font-bold text-black dark:text-white">{t("orders.noBookings")}</p>
          <a
            href="/"
            className="text-[13px] font-semibold mt-1.5 inline-flex items-center justify-center no-underline no-select transition-opacity hover:opacity-85"
            data-pressable=""
            style={{ color: "var(--brand-rose)" }}
          >
            {t("orders.bookFirst")}
          </a>
        </div>
      )}
    </AppShell>
  );
}

export default function OrdersPage() {
  return (
    <>
      <Suspense
        fallback={
          <AppShell>
            <div className="flex items-center justify-center py-20">
              <div className="w-7 h-7 rounded-full border-2 border-brand-rose border-t-transparent animate-spin" />
            </div>
          </AppShell>
        }
      >
        <OrdersContent />
      </Suspense>
      <BottomNav />
    </>
  );
}
