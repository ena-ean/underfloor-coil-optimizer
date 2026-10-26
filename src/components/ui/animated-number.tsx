"use client";

import { useEffect, useRef, useState } from "react";

const easeOutCubic = (progress: number): number => 1 - Math.pow(1 - progress, 3);

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface AnimatedNumberProps {
  value: number;
  /** How the current (animated) value is rendered. */
  format: (value: number) => string;
  className?: string;
  /** Animation length in milliseconds. */
  duration?: number;
}

/**
 * A number that counts up from zero on mount and then eases to every new value
 * (up or down) instead of jumping. The animation runs on `requestAnimationFrame`
 * and is skipped entirely when the visitor asked for reduced motion.
 */
export function AnimatedNumber({ value, format, className, duration = 700 }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);

  useEffect(() => {
    const target = Number.isFinite(value) ? value : 0;
    const from = displayRef.current;
    let frame = 0;

    const commit = (next: number) => {
      displayRef.current = next;
      setDisplay(next);
    };

    if (from === target || prefersReducedMotion()) {
      // Still async: the first paint shows the final number, no flicker.
      frame = requestAnimationFrame(() => commit(target));
      return () => cancelAnimationFrame(frame);
    }

    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      if (progress >= 1) {
        commit(target);
        return;
      }
      commit(from + (target - from) * easeOutCubic(progress));
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span className={className}>{format(display)}</span>;
}
