"use client";

import { AddressProvider } from "@/lib/address-store";
import { I18nProvider } from "@/lib/i18n";
import { ProfileProvider } from "@/lib/profile-store";
import { PaymentProvider } from "@/lib/payment-store";
import { NotificationProvider } from "@/lib/notification-store";
import { ThemeProvider } from "@/lib/theme-store";
import { GeoProvider } from "@/lib/geo-store";
import { SwepyProvider } from "@/lib/swepy";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SwepyProvider>
      <ThemeProvider>
        <I18nProvider>
          <ProfileProvider>
            <PaymentProvider>
              <NotificationProvider>
                <GeoProvider>
                  <AddressProvider>{children}</AddressProvider>
                </GeoProvider>
              </NotificationProvider>
            </PaymentProvider>
          </ProfileProvider>
        </I18nProvider>
      </ThemeProvider>
    </SwepyProvider>
  );
}
