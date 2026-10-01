import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/providers";
import PwaProvider from "@/components/pwa-provider";
import LaunchScreen from "@/components/launch-screen";

export const metadata: Metadata = {
  title: "Swepy — Helper at your door in 10 minutes",
  description:
    "Book a verified home helper in minutes. Sweeping, mopping, dusting, utensils, washrooms, kitchen and more. No subscriptions.",
  keywords: ["home cleaning", "maid service", "house help", "Bangalore", "instant booking"],
  openGraph: {
    title: "Swepy — Helper at your door in 10 minutes",
    description: "Book a verified home helper in minutes. No subscriptions.",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    title: "Swepy",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#B3225A",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" type="image/png" sizes="64x64" href="/favicon-64.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="shortcut icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="antialiased">
        <Providers>
          <LaunchScreen />
          <PwaProvider />
          {children}
        </Providers>
      </body>
    </html>
  );
}
