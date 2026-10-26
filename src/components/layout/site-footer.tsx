"use client";

import { LICENSE, REPO_URL } from "@/lib/constants";
import { useLocale } from "@/lib/i18n/provider";

export function SiteFooter() {
  const { dict } = useLocale();

  return (
    <footer className="no-print border-border/70 mt-10 border-t">
      <div className="container-page text-muted-foreground flex flex-wrap items-center justify-between gap-2 py-6 text-xs">
        <p>{dict.footer.note}</p>
        <p className="flex items-center gap-3">
          <a
            href={REPO_URL}
            className="hover:text-foreground underline underline-offset-4"
            target="_blank"
            rel="noreferrer noopener"
          >
            {dict.footer.source}
          </a>
          <span>{LICENSE}</span>
        </p>
      </div>
    </footer>
  );
}
