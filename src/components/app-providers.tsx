"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { LocaleProvider } from "@/lib/i18n/provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <LocaleProvider>
        {children}
        <Toaster position="top-center" offset={16} />
      </LocaleProvider>
    </ThemeProvider>
  );
}
