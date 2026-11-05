"use client";

import clsx from "clsx";
import { useActionState, useEffect, useState } from "react";
import { CheckoutNotice } from "./checkout-form";
import { useCheckoutState } from "./checkout-context";
import { Field, SelectField, SubmitButton } from "./forms";
import { SlotPicker } from "./slot-picker";
import { Notice } from "./ui";
import { IDLE, type ActionState } from "@/lib/action-state";
import { lookupZone } from "@/lib/actions/fulfillment";
import { placeOrder } from "@/lib/actions/checkout";
import { centsToMinimum, isPlausiblePostcode, normalizePostcode } from "@/lib/fulfillment";
import { COUNTRIES } from "@/lib/format";
import { pickDefaultAddress, savedAddressToFields } from "@/lib/addresses";
import { formatMoney } from "@/lib/money";
import type { FulfillmentMethod, PickupLocation, SavedAddress, Zone } from "@/lib/types";
import { SavedAddressPicker } from "./saved-address-picker";

const METHODS: { id: FulfillmentMethod; title: string; hint: string }[] = [
  { id: "DELIVERY", title: "Delivery", hint: "To your door in a time window" },
  { id: "PICKUP", title: "Pickup", hint: "Collect in a store, no minimum" },
];

type ZoneCheck = "idle" | "checking" | "ok" | "no";

/** Checkout for shops that deliver in slots or offer pickup (fulfillment mode LOCAL). */
export function LocalCheckoutForm({
  defaultName,
  itemNames,
  locations,
  timeZone,
  initialPostcode,
  addresses = [],
}: {
  /** The customer's saved addresses; the default one pre-fills the delivery address. */
  addresses?: SavedAddress[];
  defaultName: string;
  itemNames: Record<string, string>;
  locations: PickupLocation[];
  timeZone: string;
  /** The postcode remembered from the header control. */
  initialPostcode: string | null;
}) {
  const { method, setMethod, zone, setZone, subtotalCents, currency } = useCheckoutState();
  const [locationId, setLocationId] = useState<string | null>(locations[0]?.id ?? null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // The API can say the chosen slot filled up meanwhile: forget it and reload the list.
  const [state, formAction] = useActionState(async (prev: ActionState, fd: FormData) => {
    const next = await placeOrder(prev, fd);
    if (next.status === "error" && next.fieldErrors?.slot) {
      setSlotId(null);
      setReloadKey((k) => k + 1);
    }
    return next;
  }, IDLE);
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};

  const saved = pickDefaultAddress(addresses);
  const init = saved ? savedAddressToFields(saved) : null;
  const [postcode, setPostcode] = useState(v.postalCode ?? (init?.postalCode || initialPostcode || ""));
  const location = locations.find((l) => l.id === locationId) ?? null;

  // Check the postcode against the delivery zones as the customer types. The answer is kept together
  // with the postcode it belongs to, so "checking" and "no zone" are derived while typing.
  const code = normalizePostcode(postcode);
  const [checked, setChecked] = useState<{ code: string; zone: Zone | null } | null>(
    initialPostcode && zone ? { code: normalizePostcode(initialPostcode), zone } : null,
  );
  const plausible = method === "DELIVERY" && isPlausiblePostcode(code);
  const zoneCheck: ZoneCheck = !plausible ? "idle" : checked?.code === code ? (checked.zone ? "ok" : "no") : "checking";

  useEffect(() => {
    if (!plausible || checked?.code === code) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const res = await lookupZone(code);
      if (cancelled) return;
      setChecked({ code, zone: res.zone });
      setZone(res.zone);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [plausible, code, checked, setZone]);

  const missing = method === "DELIVERY" && zone ? centsToMinimum(subtotalCents, zone) : 0;
  const belowMinimum = missing > 0 && zone !== null;
  const notDeliverable = method === "DELIVERY" && zoneCheck === "no";
  const canSubmit = !!slotId && !belowMinimum && !notDeliverable && (method === "DELIVERY" || !!location);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <CheckoutNotice state={state} itemNames={itemNames} />

      <fieldset>
        <legend className="headline mb-3 text-xl">How do you want it?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {METHODS.map((m) => {
            const selected = method === m.id;
            const disabled = m.id === "PICKUP" && locations.length === 0;
            return (
              <label
                key={m.id}
                className={clsx(
                  "block rounded-control border-2 bg-white p-3 transition focus-within:ring-2 focus-within:ring-cobalt",
                  selected ? "border-cobalt" : "border-mist hover:border-ink-faint",
                  disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer",
                )}
              >
                <input
                  type="radio"
                  name="method-choice"
                  value={m.id}
                  checked={selected}
                  disabled={disabled}
                  onChange={() => {
                    setMethod(m.id);
                    setSlotId(null);
                  }}
                  className="sr-only"
                />
                <span className="block font-semibold">{m.title}</span>
                <span className="block text-sm text-ink-soft">{disabled ? "No stores available" : m.hint}</span>
              </label>
            );
          })}
        </div>
        {fe.method && <p className="mt-1 text-sm text-signal">{fe.method}</p>}
      </fieldset>

      <input type="hidden" name="method" value={method} />
      <input type="hidden" name="slotId" value={slotId ?? ""} />
      {method === "PICKUP" && <input type="hidden" name="locationId" value={locationId ?? ""} />}

      {method === "DELIVERY" ? (
        <fieldset className="space-y-4">
          <legend className="headline mb-1 text-xl">Delivery address</legend>
          <SavedAddressPicker addresses={addresses} defaultId={saved?.id ?? null} />
          <Field label="Full name" name="fullName" autoComplete="name" defaultValue={v.fullName ?? (init?.fullName || defaultName)} required error={fe.fullName} />
          <Field label="Street and house number" name="line1" autoComplete="address-line1" defaultValue={v.line1 ?? init?.line1} required error={fe.line1} />
          <Field label="Apartment, floor, c/o" name="line2" autoComplete="address-line2" defaultValue={v.line2 ?? init?.line2} hint="Optional" error={fe.line2} />
          <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <div>
              <Field
                label="Postal code"
                name="postalCode"
                autoComplete="postal-code"
                value={postcode}
                onChange={(e) => {
                  setPostcode(e.target.value);
                  setSlotId(null);
                }}
                inputMode="numeric"
                required
                error={fe.postalCode ?? (zoneCheck === "no" ? `We don't deliver to ${normalizePostcode(postcode)} yet` : undefined)}
              />
              <p className="mt-1 text-xs text-ink-faint" role="status" aria-live="polite">
                {zoneCheck === "checking" ? "Checking…" : zoneCheck === "ok" && zone ? `Delivery area: ${zone.name}` : ""}
              </p>
            </div>
            <Field label="City" name="city" autoComplete="address-level2" defaultValue={v.city ?? init?.city} required error={fe.city} />
          </div>
          <SelectField label="Country" name="country" autoComplete="country" defaultValue={v.country ?? (init?.country || "DE")} key={v.country ?? "DE"} error={fe.country}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <Field label="Phone" name="phone" type="tel" autoComplete="tel" defaultValue={v.phone ?? init?.phone} hint="Optional. The driver may call if they can't find you." error={fe.phone} />
        </fieldset>
      ) : (
        <fieldset className="space-y-4">
          <legend className="headline mb-1 text-xl">Pick up in a store</legend>
          <div role="radiogroup" aria-label="Store" className="space-y-2">
            {locations.map((l) => {
              const selected = l.id === locationId;
              return (
                <label
                  key={l.id}
                  className={clsx(
                    "block cursor-pointer rounded-control border-2 bg-white p-3 transition focus-within:ring-2 focus-within:ring-cobalt",
                    selected ? "border-cobalt" : "border-mist hover:border-ink-faint",
                  )}
                >
                  <input
                    type="radio"
                    name="store-choice"
                    value={l.id}
                    checked={selected}
                    onChange={() => {
                      setLocationId(l.id);
                      setSlotId(null);
                    }}
                    className="sr-only"
                  />
                  <span className="block font-semibold">{l.name}</span>
                  <span className="block text-sm text-ink-soft">
                    {l.address.line1}, {l.address.postalCode} {l.address.city}
                  </span>
                  <span className="block text-sm text-ink-faint">{l.openingHours}</span>
                </label>
              );
            })}
          </div>
          {fe.location && <p className="text-sm text-signal">{fe.location}</p>}
          <Field label="Name for the pickup" name="fullName" autoComplete="name" defaultValue={v.fullName ?? defaultName} required error={fe.fullName} />
          <Field label="Phone" name="phone" type="tel" autoComplete="tel" defaultValue={v.phone} hint="Optional. We call only if there is a problem with your order." error={fe.phone} />
          {location && (
            <>
              <input type="hidden" name="line1" value={location.address.line1} />
              <input type="hidden" name="line2" value={location.address.line2 ?? ""} />
              <input type="hidden" name="postalCode" value={location.address.postalCode} />
              <input type="hidden" name="city" value={location.address.city} />
              <input type="hidden" name="country" value={location.address.country} />
            </>
          )}
        </fieldset>
      )}

      <SlotPicker
        method={method}
        postcode={method === "DELIVERY" && zoneCheck !== "no" ? postcode : null}
        locationId={method === "PICKUP" ? locationId : null}
        timeZone={timeZone}
        value={slotId}
        onChange={setSlotId}
        error={fe.slot}
        reloadKey={reloadKey}
      />

      {belowMinimum && zone && (
        <Notice tone="warning" title="Your order is below the minimum for delivery">
          Add {formatMoney({ cents: missing, currency })} more to reach the minimum of{" "}
          {formatMoney({ cents: zone.minOrderCents, currency })}, or choose pickup (no minimum).
        </Notice>
      )}

      <SubmitButton className="btn btn-primary w-full text-base" pendingLabel="Placing your order…" disabled={!canSubmit}>
        Place order and pay
      </SubmitButton>
      {!canSubmit && (
        <p className="text-sm text-ink-soft" role="status">
          {belowMinimum
            ? "Reach the minimum order or choose pickup to continue."
            : notDeliverable
              ? "Enter a postcode we deliver to, or choose pickup."
              : "Choose a time slot to continue."}
        </p>
      )}
      <p className="text-sm text-ink-soft">
        You&apos;ll pay on the next page. We hold your items and your time slot for 30 minutes while you pay.
      </p>
    </form>
  );
}
