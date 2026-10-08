"use client";

import AppShell from "@/components/app-shell";
import BottomNav from "@/components/bottom-nav";
import { PageTitle, Card, CardStack } from "@/components/ui";
import { IconChevronRight, IconClock, IconSearch } from "@/components/icons";
import { allServices } from "@/data/services";
import { useI18n } from "@/lib/i18n";
import Image from "next/image";
import Link from "next/link";

export default function ActivityPage() {
  const { t } = useI18n();
  
  // Mock recent activities (5 items)
  const recentActivities = [
    {
      id: 1,
      type: "draft",
      service: allServices[0], // Minor clean
      timestamp: "10 mins ago",
    },
    {
      id: 2,
      type: "viewed",
      service: allServices[1], // Major clean
      timestamp: "2 hours ago",
    },
    {
      id: 3,
      type: "draft",
      service: allServices[2], // Bathroom clean
      timestamp: "Yesterday",
    },
    {
      id: 4,
      type: "viewed",
      service: allServices[3], // Kitchen clean
      timestamp: "2 days ago",
    },
    {
      id: 5,
      type: "viewed",
      service: allServices[4], // Sofa clean
      timestamp: "Last week",
    }
  ];

  return (
    <>
      <AppShell>
        <PageTitle>{t("activity.title")}</PageTitle>

        <h2 className="text-[16px] font-medium text-ink mb-4">{t("activity.recentActivity")}</h2>
        
        <CardStack>
          {recentActivities.map((activity) => {
            const serviceName = t(`services.${activity.service.slug}`) !== `services.${activity.service.slug}` 
              ? t(`services.${activity.service.slug}`) 
              : activity.service.name;

            return (
              <Link 
                key={activity.id} 
                href={`/service/${activity.service.slug}`}
                className="no-underline block no-select"
                data-pressable=""
              >
                <Card>
                  <div className="flex items-center gap-4">
                    {/* Service Image */}
                    <div className="relative w-[60px] h-[60px] rounded-[12px] overflow-hidden shrink-0 bg-surface">
                      <Image
                        src={activity.service.image}
                        alt={activity.service.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        {activity.type === "draft" ? (
                          <>
                            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--brand-rose)", opacity: 0.1, position: "absolute" }} />
                            <div className="w-5 h-5 rounded-full flex items-center justify-center">
                              <IconClock size={12} className="text-brand-rose" strokeWidth={2.5} />
                            </div>
                            <span className="text-[12px] font-medium text-brand-rose truncate">
                              {t("activity.continueDraft")}
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="w-5 h-5 rounded-full flex items-center justify-center bg-surface-border">
                              <IconSearch size={12} className="text-ink-muted" strokeWidth={2.5} />
                            </div>
                            <span className="text-[12px] font-medium text-ink-muted truncate">
                              {t("activity.viewService")}
                            </span>
                          </>
                        )}
                      </div>
                      
                      <h3 className="text-[15px] font-medium text-ink truncate mb-0.5">
                        {serviceName}
                      </h3>
                      
                      <p className="text-[13px] text-ink-muted truncate">
                        {activity.type === "draft" 
                          ? t("activity.draftSubtitle", { serviceName })
                          : t("activity.viewedSubtitle", { serviceName })}
                        {" · "}{activity.timestamp}
                      </p>
                    </div>
                    
                    {/* Chevron */}
                    <IconChevronRight size={18} className="text-ink-muted shrink-0" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </CardStack>
      </AppShell>
      <BottomNav />
    </>
  );
}
