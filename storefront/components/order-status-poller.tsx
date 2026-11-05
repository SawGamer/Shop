"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const INTERVAL_MS = 1500;
const TIMEOUT_MS = 30_000;

/**
 * The cart is emptied by the API right after the payment event is processed, which can be a moment after
 * the order shows as paid. Re-render once shortly after so the header's cart badge catches up.
 */
export function RefreshSoon({ delayMs = 1500 }: { delayMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setTimeout(() => router.refresh(), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, router]);
  return null;
}

/** Polls the order until the payment provider has confirmed it, then re-renders the page. */
export function OrderStatusPoller({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let stopped = false;
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      try {
        const res = await fetch(`/bff/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });
        if (res.ok) {
          const { status } = (await res.json()) as { status: string };
          if (status !== "PENDING_PAYMENT") {
            router.refresh();
            return;
          }
        }
      } catch {
        // Network blip: keep polling until the timeout.
      }
      if (stopped) return;
      if (Date.now() - started > TIMEOUT_MS) {
        setTimedOut(true);
        return;
      }
      timer = setTimeout(tick, INTERVAL_MS);
    }

    timer = setTimeout(tick, INTERVAL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [orderId, router]);

  if (timedOut) {
    return (
      <p className="text-ink-soft">
        Your payment is still being confirmed. This page doesn&apos;t need to stay open: the order will show as paid in
        your account as soon as it&apos;s confirmed.
      </p>
    );
  }
  return (
    <p className="flex items-center gap-3 text-ink-soft" role="status">
      <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-mist border-t-cobalt" />
      Waiting for the payment confirmation…
    </p>
  );
}
