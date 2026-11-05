"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { countdownParts, describeCountdown, formatCountdown } from "@/lib/deals";

/**
 * Live "ends in 2d 03:04:05" timer. The clock text is computed on the server for the first paint
 * (so it never renders empty) and then ticks every second; when it reaches zero the route refreshes so
 * prices fall back to normal.
 */
export function DealCountdown({
  endsAt,
  label = "Ends in",
  className,
  tone = "default",
}: {
  endsAt: string;
  label?: string;
  className?: string;
  tone?: "default" | "inverse" | "strong";
}) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const refreshed = useRef(false);
  const parts = countdownParts(endsAt, now);

  useEffect(() => {
    if (parts.ended) {
      if (!refreshed.current) {
        refreshed.current = true;
        router.refresh();
      }
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [parts.ended, router]);

  return (
    <p
      className={clsx(
        "tabular inline-flex items-center gap-1.5 text-xs font-semibold",
        tone === "inverse" && "text-white",
        tone === "strong" && "text-signal",
        tone === "default" && "text-ink-soft",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2.5M9 2h6" strokeLinecap="round" />
      </svg>
      {parts.ended ? (
        <span>Deal ended</span>
      ) : (
        <>
          <span>{label}</span>
          <span suppressHydrationWarning aria-hidden>
            {formatCountdown(endsAt, now)}
          </span>
          <span className="sr-only" suppressHydrationWarning>
            {describeCountdown(endsAt, now)}
          </span>
        </>
      )}
    </p>
  );
}
