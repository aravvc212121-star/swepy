"use client";

import AppShell from "@/components/app-shell";
import BottomNav from "@/components/bottom-nav";
import { PageTitle } from "@/components/ui";
import ServiceCard from "@/components/service-card";
import { allServices } from "@/data/services";

export default function ActivityPage() {
  // Use the first 6 services to mock "recently visited" services
  const recentServices = allServices.slice(0, 6);

  return (
    <>
      <AppShell>
        <PageTitle>Activity</PageTitle>

        <div className="mb-4">
          <h2 className="text-[16px] font-medium text-ink mb-3">Recently visited</h2>
          <div className="grid grid-cols-2 gap-3">
            {recentServices.map((service) => (
              <ServiceCard
                key={service.slug}
                slug={service.slug}
                title={service.name}
                image={service.image}
                href={`/services/${service.slug}`}
              />
            ))}
          </div>
        </div>
      </AppShell>
      <BottomNav />
    </>
  );
}
