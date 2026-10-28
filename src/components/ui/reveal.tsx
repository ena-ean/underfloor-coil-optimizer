"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  /** Classes for the wrapper itself — layout is the caller's business. */
  className?: string;
  /** Stagger inside one group, in milliseconds. */
  delay?: number;
}

/**
 * Entrance animation that waits for the block to come into view.
 *
 * The result screen is taller than a phone screen, so animating on mount means
 * everything below the fold has already finished by the time it is scrolled to.
 * This wrapper adds the same `animate-card-in` keyframes only when an
 * `IntersectionObserver` reports the block near the viewport, with a positive
 * bottom `rootMargin` so the animation starts just before the block appears.
 *
 * Nothing is hidden beforehand: without JavaScript, in a browser without
 * `IntersectionObserver` and under `prefers-reduced-motion`, the content is
 * simply there.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px 15% 0px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(visible && "animate-card-in", className)}
      style={visible && delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
