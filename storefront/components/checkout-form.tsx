"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, SelectField, SubmitButton } from "./forms";
import { Notice } from "./ui";
import { placeOrder } from "@/lib/actions/checkout";
import { IDLE } from "@/lib/action-state";
import { COUNTRIES } from "@/lib/format";

export function CheckoutForm({
  defaultName,
  itemNames,
}: {
  defaultName: string;
  /** variantId → "Product, size 42" for readable stock errors. */
  itemNames: Record<string, string>;
}) {
  const [state, formAction] = useActionState(placeOrder, IDLE);
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.status === "error" && state.stock && state.stock.length > 0 ? (
        <Notice tone="error" title="Some items sold out while you were shopping">
          <ul className="mt-1 list-disc pl-5">
            {state.stock.map((s) => (
              <li key={s.variantId}>
                {itemNames[s.variantId] ?? "An item"}: you asked for {s.requested}, {s.available} left.
              </li>
            ))}
          </ul>
          <p className="mt-2">
            <Link href="/cart" className="font-semibold text-cobalt hover:underline">
              Update your cart
            </Link>{" "}
            and try again.
          </p>
        </Notice>
      ) : state.status === "error" ? (
        <Notice tone="error" title={state.message} />
      ) : null}

      <fieldset className="space-y-4">
        <legend className="headline mb-1 text-xl">Shipping address</legend>
        <Field label="Full name" name="fullName" autoComplete="name" defaultValue={v.fullName ?? defaultName} required error={fe.fullName} />
        <Field label="Street and house number" name="line1" autoComplete="address-line1" defaultValue={v.line1} required error={fe.line1} />
        <Field
          label="Apartment, floor, c/o"
          name="line2"
          autoComplete="address-line2"
          defaultValue={v.line2}
          hint="Optional"
          error={fe.line2}
        />
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <Field label="Postal code" name="postalCode" autoComplete="postal-code" defaultValue={v.postalCode} required error={fe.postalCode} />
          <Field label="City" name="city" autoComplete="address-level2" defaultValue={v.city} required error={fe.city} />
        </div>
        <SelectField label="Country" name="country" autoComplete="country" defaultValue={v.country ?? "DE"} key={v.country ?? "DE"} error={fe.country}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <Field
          label="Phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={v.phone}
          hint="Optional. Only used by the delivery service."
          error={fe.phone}
        />
      </fieldset>

      <SubmitButton className="btn btn-primary w-full text-base" pendingLabel="Placing your order…">
        Place order and pay
      </SubmitButton>
      <p className="text-sm text-ink-soft">
        You&apos;ll pay on the next page. We hold your items for 30 minutes while you pay.
      </p>
    </form>
  );
}
