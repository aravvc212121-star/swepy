"use client";

import AppShell from "@/components/app-shell";
import BottomNav from "@/components/bottom-nav";
import { PageTitle, Card, CardStack } from "@/components/ui";
import { IconCheck, IconChevronRight } from "@/components/icons";
import { demoOrders } from "@/lib/mock-data";
import { formatINR, formatDate } from "@/lib/utils";

export default function OrdersPage() {
  return (
    <>
      <AppShell>
        <PageTitle>Orders</PageTitle>

        <CardStack>
          {demoOrders.map((order) => (
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
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "#E4F3EA" }}
                      >
                        <IconCheck size={12} className="text-sage" strokeWidth={2.5} />
                      </div>
                      <span
                        className="text-[13px] font-medium"
                        style={{ color: "#1E6B42" }}
                      >
                        {order.booking.state === "completed" ? "Completed" : "Rated"}
                      </span>
                    </div>
                    <IconChevronRight size={16} className="text-ink-muted" />
                  </div>

                  {/* Row 2: service name + price */}
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-medium" style={{ color: "#1F1A24" }}>
                      {order.booking.service.name}
                    </span>
                    <span className="text-[15px] font-medium" style={{ color: "#1F1A24" }}>
                      {formatINR(order.booking.price_breakdown.total)}
                    </span>
                  </div>

                  {/* Row 3: helper · date */}
                  <span className="text-[12px]" style={{ color: "#6B6270" }}>
                    {order.booking.helper?.name} · {formatDate(order.booking.created_at)}
                  </span>
                </div>
              </Card>
            </a>
          ))}
        </CardStack>

        {demoOrders.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[15px]" style={{ color: "#6B6270" }}>No orders yet</p>
            <a
              href="/"
              className="text-[13px] font-medium mt-2 inline-flex items-center justify-center min-h-[44px] px-4 rounded-[12px] no-underline no-select"
              data-pressable=""
              style={{ color: "#B3295B" }}
            >
              Book your first helper
            </a>
          </div>
        )}
      </AppShell>

      <BottomNav />
    </>
  );
}
