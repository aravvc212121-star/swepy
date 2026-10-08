"use client";

import { useState, useMemo } from "react";
import AppShell from "@/components/app-shell";
import BottomNav from "@/components/bottom-nav";
import { PageTitle, Card, CardStack } from "@/components/ui";
import { IconCheck, IconChevronRight, IconClock, IconSparkles } from "@/components/icons";
import { demoOrders } from "@/lib/mock-data";
import { formatINR, formatDate } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type Tab = "ongoing" | "scheduled" | "history";

export default function OrdersPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>("ongoing");

  const { ongoing, scheduled, history } = useMemo(() => {
    const ong = [];
    const sch = [];
    const hist = [];

    for (const order of demoOrders) {
      const state = order.booking.state;
      if (state === "completed" || state === "rated" || state === "cancelled") {
        hist.push(order);
      } else if (!order.booking.instant && order.booking.scheduled_for) {
        sch.push(order);
      } else {
        ong.push(order);
      }
    }
    return { ongoing: ong, scheduled: sch, history: hist };
  }, []);

  const visibleOrders = 
    activeTab === "ongoing" ? ongoing : 
    activeTab === "scheduled" ? scheduled : 
    history;

  return (
    <>
      <AppShell>
        <PageTitle>{t("orders.title")}</PageTitle>

        {/* ── Tabs ── */}
        <div className="flex bg-surface p-1 rounded-[16px] mb-6 shadow-sm border border-[var(--surface-border)]">
          {(["ongoing", "scheduled", "history"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-[13px] font-medium rounded-[12px] transition-all no-select ${
                activeTab === tab
                  ? "bg-brand-rose text-white shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {t(`orders.${tab}`)}
            </button>
          ))}
        </div>

        {/* ── Order List ── */}
        <CardStack>
          {visibleOrders.map((order) => {
            const isCompleted = order.booking.state === "completed" || order.booking.state === "rated";
            return (
              <a
                key={order.id}
                href={`/booking/${order.booking.id}`}
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
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: "#E4F3EA" }}
                          >
                            <IconCheck size={12} className="text-sage" strokeWidth={2.5} />
                          </div>
                        ) : activeTab === "scheduled" ? (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: "var(--brand-rose)", opacity: 0.1 }}
                          >
                            <IconClock size={12} className="text-brand-rose" strokeWidth={2.5} />
                          </div>
                        ) : (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: "rgba(255, 59, 48, 0.1)" }}
                          >
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#FF3B30", boxShadow: "0 0 6px rgba(255, 59, 48, 0.6)" }} />
                          </div>
                        )}
                        <span
                          className="text-[13px] font-medium"
                          style={{
                            color: isCompleted
                              ? "#1E6B42"
                              : activeTab === "scheduled"
                              ? "var(--brand-rose)"
                              : "#FF3B30",
                          }}
                        >
                          {isCompleted
                            ? t(order.booking.state === "completed" ? "orders.completed" : "orders.rated")
                            : activeTab === "scheduled"
                            ? t("orders.scheduled")
                            : t("orders.ongoing")}
                        </span>
                      </div>
                      <IconChevronRight size={16} className="text-ink-muted" />
                    </div>

                    {/* Row 2: service name + price */}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[15px] font-medium text-ink">
                        {order.booking.service.name}
                      </span>
                      <span className="text-[15px] font-medium text-ink">
                        {formatINR(order.booking.price_breakdown.total)}
                      </span>
                    </div>

                    {/* Row 3: helper · date */}
                    <span className="text-[12px] text-ink-muted mt-0.5">
                      {order.booking.helper?.name || "Assigning..."} ·{" "}
                      {activeTab === "scheduled" && order.booking.scheduled_for
                        ? formatDate(order.booking.scheduled_for)
                        : formatDate(order.booking.created_at)}
                    </span>
                  </div>
                </Card>
              </a>
            );
          })}
        </CardStack>

        {visibleOrders.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[15px] text-ink-muted">{t("orders.noBookings")}</p>
            <a
              href="/"
              className="text-[13px] font-medium mt-2 inline-flex items-center justify-center min-h-[44px] px-4 rounded-[12px] no-underline no-select bg-surface"
              data-pressable=""
              style={{ color: "var(--brand-rose)" }}
            >
              {t("orders.bookFirst")}
            </a>
          </div>
        )}
      </AppShell>

      <BottomNav />
    </>
  );
}
