"use client";

import clsx from "clsx";
import { useActionState, useState } from "react";
import { Panel } from "./bits";
import { Field, FormMessage, SelectField, SubmitButton } from "@/components/forms";
import { IDLE, type ActionState } from "@/lib/action-state";
import {
  deleteLocation,
  deleteZone,
  saveLocation,
  saveSchedule,
  saveZone,
  setFulfillmentMode,
} from "@/lib/actions/fulfillment-admin";
import { COUNTRIES } from "@/lib/format";
import { WEEKDAYS } from "@/lib/fulfillment";
import { centsToInput } from "@/lib/money";
import type { AdminFulfillment, FulfillmentMode, OpeningRange, PickupLocation, Schedule, Zone } from "@/lib/types";

const MODES: { id: FulfillmentMode; title: string; text: string }[] = [
  { id: "SHIPPING", title: "Parcel shipping", text: "Orders are shipped by parcel with the flat shipping fee. No delivery slots." },
  { id: "LOCAL", title: "Delivery slots and pickup", text: "Customers choose a delivery time window for their postcode, or pick up in a store. Minimum order and delivery fee per area." },
];

function ModeForm({ mode }: { mode: FulfillmentMode }) {
  const [state, action] = useActionState(setFulfillmentMode, IDLE);
  const [value, setValue] = useState(mode);
  return (
    <form action={action} className="space-y-4">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">How orders are fulfilled</legend>
        {MODES.map((m) => (
          <label
            key={m.id}
            className={clsx(
              "block cursor-pointer rounded-control border-2 p-3 transition focus-within:ring-2 focus-within:ring-cobalt",
              value === m.id ? "border-cobalt bg-cobalt/5" : "border-mist hover:border-ink-faint",
            )}
          >
            <input type="radio" name="mode" value={m.id} checked={value === m.id} onChange={() => setValue(m.id)} className="sr-only" />
            <span className="block font-semibold">{m.title}</span>
            <span className="block text-sm text-ink-soft">{m.text}</span>
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton pendingLabel="Saving…" disabled={value === mode}>
          Save
        </SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

/** Save and delete forms of one row (a zone or a store), with a collapsed editor. */
function RowShell({
  title,
  summary,
  defaultOpen,
  onDelete,
  confirm,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  onDelete?: (prev: ActionState) => Promise<ActionState>;
  confirm?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [delState, delAction] = useActionState(onDelete ?? (async () => IDLE), IDLE);
  return (
    <li className="rounded-control border border-mist">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block font-semibold">{title}</span>
          {summary && <span className="block truncate text-sm text-ink-soft">{summary}</span>}
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} className="btn btn-quiet btn-sm">
          {open ? "Close" : "Edit"}
        </button>
        {onDelete && (
          <form
            action={delAction}
            onSubmit={(e) => {
              if (confirm && !window.confirm(confirm)) e.preventDefault();
            }}
          >
            <SubmitButton className="btn btn-danger btn-sm" pendingLabel="Deleting…">
              Delete
            </SubmitButton>
          </form>
        )}
      </div>
      <FormMessage state={delState} className="px-4 pb-3" />
      {open && <div className="border-t border-mist px-4 py-4">{children}</div>}
    </li>
  );
}

function ZoneForm({ zone }: { zone?: Zone }) {
  const [state, action] = useActionState(saveZone.bind(null, zone?.id ?? null), IDLE);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="Name" name="name" defaultValue={zone?.name} required error={fe.name} placeholder="e.g. Berlin Mitte" />
      <Field
        label="Postcode prefixes"
        name="prefixes"
        defaultValue={zone?.postcodePrefixes.join(", ")}
        required
        error={fe.prefixes}
        hint="Comma separated. 101 covers 10115, 10117…"
      />
      <Field label="Delivery fee" name="fee" inputMode="decimal" defaultValue={zone ? centsToInput(zone.feeCents) : "4.90"} required error={fe.fee} hint="In euros, e.g. 4.90" />
      <Field
        label="Free delivery from"
        name="freeFrom"
        inputMode="decimal"
        defaultValue={zone?.freeFromCents != null ? centsToInput(zone.freeFromCents) : ""}
        error={fe.freeFrom}
        hint="Optional. Order value from which delivery is free."
      />
      <Field label="Minimum order" name="minOrder" inputMode="decimal" defaultValue={zone ? centsToInput(zone.minOrderCents) : "20.00"} error={fe.minOrder} hint="0 for no minimum" />
      <div className="flex flex-wrap items-end gap-4 sm:col-span-2">
        <SubmitButton pendingLabel="Saving…">{zone ? "Save area" : "Add area"}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

function LocationForm({ location }: { location?: PickupLocation }) {
  const [state, action] = useActionState(saveLocation.bind(null, location?.id ?? null), IDLE);
  const fe = state.fieldErrors ?? {};
  const a = location?.address;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="Store name" name="name" defaultValue={location?.name} required error={fe.name} className="sm:col-span-2" />
      <Field label="Street and house number" name="line1" defaultValue={a?.line1} required error={fe.line1} />
      <Field label="Address line 2" name="line2" defaultValue={a?.line2 ?? ""} hint="Optional" />
      <Field label="Postal code" name="postalCode" defaultValue={a?.postalCode} required error={fe.postalCode} />
      <Field label="City" name="city" defaultValue={a?.city} required error={fe.city} />
      <SelectField label="Country" name="country" defaultValue={a?.country ?? "DE"} error={fe.country}>
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </SelectField>
      <Field label="Phone" name="phone" type="tel" defaultValue={a?.phone ?? ""} hint="Optional" />
      <Field
        label="Opening hours"
        name="openingHours"
        defaultValue={location?.openingHours}
        required
        error={fe.openingHours}
        hint="Shown to customers, e.g. Mon–Sat 8:00–20:00"
        className="sm:col-span-2"
      />
      <div className="flex flex-wrap items-end gap-4 sm:col-span-2">
        <SubmitButton pendingLabel="Saving…">{location ? "Save store" : "Add store"}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

/** Opening hours as ranges per weekday. Serialised into a hidden field the server action reads. */
function OpeningHoursEditor({ initial, error }: { initial: OpeningRange[]; error?: string }) {
  const [ranges, setRanges] = useState<OpeningRange[]>(initial);
  const update = (i: number, patch: Partial<OpeningRange>) =>
    setRanges((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">Opening hours</legend>
      <p className="text-sm text-ink-soft">Delivery and pickup slots are offered inside these times (shop time zone).</p>
      <input type="hidden" name="openingHours" value={JSON.stringify(ranges)} />
      <div className="space-y-3">
        {WEEKDAYS.map((day) => {
          const mine = ranges.map((r, i) => ({ r, i })).filter(({ r }) => r.dayOfWeek === day.value);
          return (
            <div key={day.value} className="grid gap-2 sm:grid-cols-[7rem_1fr] sm:items-start">
              <p className="pt-2 text-sm font-semibold">{day.label}</p>
              <div className="space-y-2">
                {mine.length === 0 && <p className="pt-2 text-sm text-ink-faint">Closed</p>}
                {mine.map(({ r, i }) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`from-${i}`}>{`${day.label} opens`}</label>
                    <input id={`from-${i}`} type="time" className="field w-32" value={r.from} onChange={(e) => update(i, { from: e.target.value })} required />
                    <span aria-hidden>–</span>
                    <label className="sr-only" htmlFor={`to-${i}`}>{`${day.label} closes`}</label>
                    <input id={`to-${i}`} type="time" className="field w-32" value={r.to} onChange={(e) => update(i, { to: e.target.value })} required />
                    <button
                      type="button"
                      onClick={() => setRanges((rs) => rs.filter((_, idx) => idx !== i))}
                      className="btn btn-quiet btn-sm"
                      aria-label={`Remove this range on ${day.label}`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setRanges((rs) => [...rs, { dayOfWeek: day.value, from: "08:00", to: "20:00" }])}
                  className="text-sm font-semibold text-cobalt hover:underline"
                >
                  Add opening time
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-sm text-signal">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function ScheduleForm({ schedule }: { schedule: Schedule }) {
  const [state, action] = useActionState(saveSchedule, IDLE);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Slot length (minutes)" name="slotMinutes" type="number" min={30} max={240} step={15} defaultValue={schedule.slotMinutes} error={fe.slotMinutes} hint="30 to 240" />
        <Field label="Orders per slot" name="capacityPerSlot" type="number" min={1} max={500} defaultValue={schedule.capacityPerSlot} error={fe.capacityPerSlot} hint="How many orders one slot can take" />
        <Field label="Lead time (minutes)" name="leadTimeMinutes" type="number" min={0} defaultValue={schedule.leadTimeMinutes} error={fe.leadTimeMinutes} hint="Earliest booking from now" />
        <Field label="Booking window (days)" name="horizonDays" type="number" min={1} max={14} defaultValue={schedule.horizonDays} error={fe.horizonDays} hint="How far ahead customers can book" />
      </div>
      <OpeningHoursEditor initial={schedule.openingHours} error={fe.openingHours} />
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton pendingLabel="Saving…">Save schedule</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function FulfillmentAdmin({ data }: { data: AdminFulfillment }) {
  return (
    <div className="max-w-4xl space-y-4">
      <Panel title="Fulfillment mode">
        <ModeForm mode={data.mode} />
      </Panel>

      <Panel title="Delivery areas" actions={<span className="text-sm text-ink-soft">Postcode prefixes with a fee and a minimum order</span>}>
        {data.zones.length === 0 ? (
          <p className="mb-4 text-sm text-ink-soft">No delivery areas yet. Customers can only pick up until you add one.</p>
        ) : (
          <ul className="mb-6 space-y-2">
            {data.zones.map((z) => (
              <RowShell
                key={z.id}
                title={z.name}
                summary={`${z.postcodePrefixes.join(", ")}`}
                onDelete={deleteZone.bind(null, z.id)}
                confirm={`Delete the delivery area “${z.name}”?`}
              >
                <ZoneForm zone={z} />
              </RowShell>
            ))}
          </ul>
        )}
        <h3 className="mb-3 text-sm font-semibold">Add a delivery area</h3>
        <ZoneForm />
      </Panel>

      <Panel title="Pickup stores">
        {data.locations.length === 0 ? (
          <p className="mb-4 text-sm text-ink-soft">No stores yet. Add one to offer click &amp; collect.</p>
        ) : (
          <ul className="mb-6 space-y-2">
            {data.locations.map((l) => (
              <RowShell
                key={l.id}
                title={l.name}
                summary={`${l.address.line1}, ${l.address.postalCode} ${l.address.city} · ${l.openingHours}`}
                onDelete={deleteLocation.bind(null, l.id)}
                confirm={`Delete the store “${l.name}”?`}
              >
                <LocationForm location={l} />
              </RowShell>
            ))}
          </ul>
        )}
        <h3 className="mb-3 text-sm font-semibold">Add a store</h3>
        <LocationForm />
      </Panel>

      <Panel title="Time slots" actions={<span className="text-sm text-ink-soft">Time zone: {data.timeZone}</span>}>
        <ScheduleForm schedule={data.schedule} />
      </Panel>
    </div>
  );
}
