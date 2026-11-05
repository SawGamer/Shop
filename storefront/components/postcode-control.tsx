"use client";

import clsx from "clsx";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { clearPostcode, setPostcode } from "@/lib/actions/fulfillment";
import { describeZone, type PostcodeState } from "@/lib/fulfillment";
import type { Zone } from "@/lib/types";

const IDLE: PostcodeState = { status: "idle" };

function Pin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={clsx("size-4 shrink-0", className)} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M10 18s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
      <circle cx="10" cy="8" r="2.2" />
    </svg>
  );
}

function CheckButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary btn-sm shrink-0" disabled={pending}>
      {pending ? "Checking…" : "Check"}
    </button>
  );
}

/** The postcode form and its result line. Shared by the header popover and the inline variant. */
function PostcodeForm({
  postcode,
  zone,
  currency,
  inputId,
}: {
  postcode: string | null;
  zone: Zone | null;
  currency: string;
  inputId: string;
}) {
  const [state, action] = useActionState(setPostcode, IDLE);
  // What to say before the shopper submits anything: the zone of the remembered postcode.
  const message =
    state.status !== "idle"
      ? state.message
      : postcode && zone
        ? describeZone(zone, postcode, currency)
        : postcode
          ? `Sorry, we don't deliver to ${postcode} yet.`
          : undefined;
  const bad = state.status === "error" || (state.status === "idle" && !!postcode && !zone);

  return (
    <div className="space-y-2">
      <form action={action} className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={inputId} className="mb-1 block text-sm font-semibold">
            Your postcode
          </label>
          <input
            id={inputId}
            name="postcode"
            inputMode="numeric"
            autoComplete="postal-code"
            defaultValue={state.postcode ?? postcode ?? ""}
            placeholder="e.g. 10115"
            maxLength={10}
            className="field"
            aria-describedby={`${inputId}-result`}
            aria-invalid={bad}
          />
        </div>
        <CheckButton />
      </form>
      <p
        id={`${inputId}-result`}
        role="status"
        aria-live="polite"
        className={clsx("min-h-5 text-sm", bad ? "text-signal" : "text-moss")}
      >
        {message}
      </p>
      {postcode && (
        <form action={clearPostcode}>
          <button type="submit" className="text-sm font-semibold text-ink-soft hover:underline">
            Forget this postcode
          </button>
        </form>
      )}
    </div>
  );
}

/**
 * "Deliver to: 10115" with a small popover in the header, or the plain form (`inline`) where there is
 * room, e.g. in the cart.
 */
export function PostcodeControl({
  postcode,
  zone,
  currency,
  variant = "header",
  tone = "light",
}: {
  postcode: string | null;
  zone: Zone | null;
  currency: string;
  variant?: "header" | "inline";
  tone?: "light" | "dark";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const inputId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  if (variant === "inline") {
    return (
      <div className="rounded-tag bg-white p-4">
        <h2 className="mb-2 flex items-center gap-2 text-base font-bold">
          <Pin /> Where should we deliver?
        </h2>
        <PostcodeForm postcode={postcode} zone={zone} currency={currency} inputId={inputId} />
      </div>
    );
  }

  const deliverable = !!postcode && !!zone;
  return (
    <div ref={rootRef} className="relative inline-block text-sm">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-control px-2 py-1.5 font-semibold transition",
          tone === "dark" ? "text-white/90 hover:bg-white/15" : "text-ink-soft hover:bg-cloud hover:text-ink",
        )}
      >
        <Pin />
        {postcode ? (
          <>
            <span className="font-normal opacity-80">Deliver to</span>
            <span className="tabular">{postcode}</span>
            {!deliverable && <span className="rounded-tag bg-signal px-1 text-xs text-white">not served</span>}
          </>
        ) : (
          "Enter your postcode"
        )}
      </button>
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label="Delivery area"
          className="absolute left-0 top-full z-40 mt-1 w-[min(23rem,calc(100vw-2rem))] rounded-tag border border-mist bg-white p-4 text-ink shadow-xl"
        >
          <PostcodeForm postcode={postcode} zone={zone} currency={currency} inputId={inputId} />
        </div>
      )}
    </div>
  );
}
