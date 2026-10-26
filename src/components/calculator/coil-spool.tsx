"use client";

import { cn } from "@/lib/utils";

interface CoilSpoolProps {
  /** Size of the coil relative to the largest one in the plan, 0..1. */
  scale: number;
  /** Fill level in percent, drawn as the outer ring. */
  fillPercent: number;
  /** Accessible description, e.g. "Coil 2: 200 m, 92% full". */
  label: string;
  className?: string;
}

/**
 * A wound coil of pipe. Its diameter follows the coil size, so a 500 m coil
 * looks noticeably bigger than a 50 m one, and the outer ring shows how full
 * the coil is.
 */
export function CoilSpool({ scale, fillPercent, label, className }: CoilSpoolProps) {
  const ratio = Math.min(1, Math.max(0, Number.isFinite(scale) ? scale : 0));
  const pixels = Math.round(20 + 20 * ratio);
  const fill = Math.min(100, Math.max(0, Number.isFinite(fillPercent) ? fillPercent : 0));

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 40 40"
      width={pixels}
      height={pixels}
      fill="none"
      className={cn("animate-spool text-primary shrink-0", className)}
    >
      <circle cx="20" cy="20" r="16" stroke="currentColor" strokeOpacity="0.16" strokeWidth="3.2" />
      <circle
        className="animate-spool-arc"
        cx="20"
        cy="20"
        r="16"
        pathLength={100}
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeDasharray="100"
        style={{ strokeDashoffset: 100 - fill }}
        transform="rotate(-90 20 20)"
      />
      <circle
        cx="20"
        cy="20"
        r="10.5"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="1.4"
        strokeDasharray="3 3"
      />
      <circle
        cx="20"
        cy="20"
        r="6"
        stroke="currentColor"
        strokeOpacity="0.28"
        strokeWidth="1.2"
        strokeDasharray="2 3"
      />
      <circle cx="20" cy="20" r="1.6" fill="currentColor" fillOpacity="0.5" />
    </svg>
  );
}
