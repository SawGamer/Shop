"use client";

import clsx from "clsx";
import { useActionState, useState } from "react";
import { ActionForm, FormMessage, SubmitButton } from "@/components/forms";
import { removeDeal, saveDeal } from "@/lib/actions/admin";
import { IDLE } from "@/lib/action-state";
import { dealStatus, type DealStatus } from "@/lib/deals";
import type { Deal } from "@/lib/types";

/** ISO instant → value for <input type="datetime-local"> in the browser's time zone. */
function toLocalInput(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

/** datetime-local value (browser time zone) → ISO UTC, or "" when empty or invalid. */
function toIso(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

const STATUS: Record<DealStatus, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "bg-cloud text-ink" },
  running: { label: "Running", className: "bg-moss/15 text-moss" },
  ended: { label: "Ended", className: "bg-mist text-ink-soft" },
};

function defaultWindow(): { start: string; end: string } {
  const start = new Date();
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + 24 * 3600_000);
  return { start: toLocalInput(start.toISOString()), end: toLocalInput(end.toISOString()) };
}

/** Schedule a time-limited percentage discount for the whole product. */
export function DealEditor({ productId, deal }: { productId: string; deal: Deal | null }) {
  const [state, formAction] = useActionState(saveDeal.bind(null, productId), IDLE);
  const [initial] = useState(() =>
    deal ? { start: toLocalInput(deal.startsAt), end: toLocalInput(deal.endsAt) } : defaultWindow(),
  );
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const fe = state.fieldErrors ?? {};
  const status = deal ? dealStatus(deal) : null;

  return (
    <div>
      {deal && status && (
        <p className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className={clsx("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS[status].className)}>
            {STATUS[status].label}
          </span>
          −{deal.percentOff}% from {new Date(deal.startsAt).toLocaleString()} to {new Date(deal.endsAt).toLocaleString()}
        </p>
      )}
      <form action={formAction} className="grid items-end gap-3 sm:grid-cols-[8rem_1fr_1fr_auto]">
        <input type="hidden" name="startsAt" value={toIso(start)} />
        <input type="hidden" name="endsAt" value={toIso(end)} />
        <div>
          <label htmlFor={`deal-pct-${productId}`} className="mb-1 block text-xs font-semibold text-ink-soft">
            Percent off
          </label>
          <input
            id={`deal-pct-${productId}`}
            name="percentOff"
            type="number"
            min={1}
            max={90}
            required
            defaultValue={deal?.percentOff ?? 15}
            className="field tabular py-1.5 text-sm"
            aria-invalid={!!fe.percentOff}
          />
          {fe.percentOff && <p className="mt-1 text-xs text-signal">{fe.percentOff}</p>}
        </div>
        <div>
          <label htmlFor={`deal-start-${productId}`} className="mb-1 block text-xs font-semibold text-ink-soft">
            Starts (your time)
          </label>
          <input
            id={`deal-start-${productId}`}
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
            className="field py-1.5 text-sm"
            aria-invalid={!!fe.startsAt}
          />
          {fe.startsAt && <p className="mt-1 text-xs text-signal">{fe.startsAt}</p>}
        </div>
        <div>
          <label htmlFor={`deal-end-${productId}`} className="mb-1 block text-xs font-semibold text-ink-soft">
            Ends (your time)
          </label>
          <input
            id={`deal-end-${productId}`}
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            required
            className="field py-1.5 text-sm"
            aria-invalid={!!fe.endsAt}
          />
          {fe.endsAt && <p className="mt-1 text-xs text-signal">{fe.endsAt}</p>}
        </div>
        <SubmitButton className="btn btn-primary btn-sm" pendingLabel="Saving…">
          {deal ? "Update deal" : "Start deal"}
        </SubmitButton>
        <FormMessage state={state} className="sm:col-span-4" />
      </form>
      {deal && (
        <ActionForm action={removeDeal.bind(null, productId)} className="mt-3" confirm="Remove this deal?">
          <SubmitButton className="btn btn-quiet btn-sm text-signal" pendingLabel="Removing…">
            Remove deal
          </SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
