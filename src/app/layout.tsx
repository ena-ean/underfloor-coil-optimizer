import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { AppProviders } from "@/components/app-providers";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

/** Canonical origin; override with NEXT_PUBLIC_SITE_URL when deploying. */
function siteUrl(): URL {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: [
    "underfloor heating",
    "pipe coil calculator",
    "bin packing",
    "warm floor",
    "тёплый пол",
    "расчёт бухт",
  ],
  authors: [{ name: "ena-ean", url: "https://github.com/ena-ean" }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    type: "website",
    locale: "en_US",
    alternateLocale: ["ru_RU"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#171719" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
