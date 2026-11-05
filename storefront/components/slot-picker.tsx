"use client";

import clsx from "clsx";
import { useEffect, useId, useState } from "react";
import { fetchSlots } from "@/lib/actions/fulfillment";
import {
  dayChipLabel,
  formatSlotRange,
  isPlausiblePostcode,
  normalizePostcode,
  normalizeSlotDays,
  scarcityLabel,
} from "@/lib/fulfillment";
import type { FulfillmentMethod, SlotDay } from "@/lib/types";

/**
 * Day chips and time windows. Loads the bookable slots itself whenever the postcode (delivery) or the
 * store (pickup) changes, and tells the parent which slot is chosen. Bump `reloadKey` to reload, for
 * example after the API said a slot just filled up.
 */
export function SlotPicker({
  method,
  postcode,
  locationId,
  timeZone,
  value,
  onChange,
  error,
  reloadKey = 0,
}: {
  method: FulfillmentMethod;
  postcode: string | null;
  locationId: string | null;
  timeZone: string;
  value: string | null;
  onChange: (slotId: string | null) => void;
  error?: string;
  reloadKey?: number;
}) {
  const legendId = useId();
  const [activeDate, setActiveDate] = useState<string | null>(null);
  // The answer is stored with the request it belongs to, so "loading" and "stale" are derived, not set.
  const [result, setResult] = useState<{ key: string; days: SlotDay[]; problem: string | null } | null>(null);

  const code = postcode ? normalizePostcode(postcode) : "";
  const ready = method === "DELIVERY" ? isPlausiblePostcode(code) : !!locationId;
  const key = ready ? `${method}|${code}|${locationId ?? ""}|${reloadKey}` : null;
  const current = result && result.key === key ? result : null;
  const days = current?.days ?? [];
  const problem = current?.problem ?? null;
  const loading = key !== null && current === null;

  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    // Wait briefly so typing a postcode doesn't fire a request per keystroke.
    const timer = setTimeout(async () => {
      const res = await fetchSlots(method, code || null, locationId);
      if (cancelled) return;
      if (res.error !== undefined) {
        setResult({ key, days: [], problem: res.error });
        onChange(null);
        return;
      }
      const next = normalizeSlotDays(res.days, timeZone);
      setResult({ key, days: next, problem: null });
      // Drop a selection that is no longer offered.
      const ids = new Set(next.flatMap((d) => d.slots.map((sl) => sl.id)));
      if (value && !ids.has(value)) onChange(null);
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `value` and `onChange` are deliberately left out: this reloads only when what to load changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, timeZone]);

  const active = days.find((d) => d.date === activeDate) ?? days[0];

  return (
    <fieldset className="space-y-3" aria-describedby={error ? `${legendId}-err` : undefined}>
      <legend id={legendId} className="headline mb-1 text-xl">
        {method === "DELIVERY" ? "Delivery time" : "Pickup time"}
      </legend>

      {!ready ? (
        <p className="text-sm text-ink-soft">
          {method === "DELIVERY" ? "Enter your postcode to see delivery times." : "Choose a store to see pickup times."}
        </p>
      ) : problem ? (
        <p role="alert" className="text-sm text-signal">
          {problem}
        </p>
      ) : loading ? (
        <p className="text-sm text-ink-soft" role="status">
          Loading times…
        </p>
      ) : days.length === 0 ? (
        <p className="text-sm text-ink-soft" role="status">
          {method === "DELIVERY"
            ? "No delivery times are available for this postcode right now."
            : "No pickup times are available at this store right now."}
        </p>
      ) : (
        <>
          <div role="group" aria-label="Day" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {days.map((d) => (
              <button
                key={d.date}
                type="button"
                aria-pressed={d.date === active?.date}
                onClick={() => setActiveDate(d.date)}
                className={clsx(
                  "shrink-0 rounded-control border px-3 py-2 text-sm font-semibold transition",
                  d.date === active?.date ? "border-cobalt bg-cobalt text-white" : "border-mist bg-white hover:border-ink-faint",
                )}
              >
                {dayChipLabel(d, timeZone)}
              </button>
            ))}
          </div>
          <div role="radiogroup" aria-label="Time" className={clsx("grid grid-cols-2 gap-2 sm:grid-cols-3", loading && "opacity-60")}>
            {active?.slots.map((slot) => {
              const selected = slot.id === value;
              const scarce = scarcityLabel(slot.remaining);
              return (
                <label
                  key={slot.id}
                  className={clsx(
                    "block cursor-pointer rounded-control border px-3 py-2 text-center text-sm transition focus-within:ring-2 focus-within:ring-cobalt",
                    selected ? "border-cobalt bg-cobalt/8 font-semibold" : "border-mist bg-white hover:border-ink-faint",
                  )}
                >
                  <input
                    type="radio"
                    name="slot-choice"
                    value={slot.id}
                    checked={selected}
                    onChange={() => onChange(slot.id)}
                    className="sr-only"
                  />
                  <span className="tabular block">{formatSlotRange(slot.startsAt, slot.endsAt, timeZone)}</span>
                  {scarce && <span className="block text-xs text-signal">{scarce}</span>}
                </label>
              );
            })}
          </div>
        </>
      )}
      {error && (
        <p id={`${legendId}-err`} role="alert" className="text-sm text-signal">
          {error}
        </p>
      )}
    </fieldset>
  );
}
