"use client";

import { useActionState } from "react";
import { Field, FormMessage, SelectField, SubmitButton } from "@/components/forms";
import { IDLE, type ActionState } from "@/lib/action-state";
import { saveAddress } from "@/lib/actions/addresses";
import { savedAddressToFields } from "@/lib/addresses";
import { COUNTRIES } from "@/lib/format";
import type { SavedAddress } from "@/lib/types";

/** Add (address = null) or edit one saved address. Calls onDone after a successful save. */
export function AddressForm({
  address,
  onDone,
  onCancel,
  makeDefault,
}: {
  address: SavedAddress | null;
  onDone: () => void;
  onCancel: () => void;
  /** Preselect "use as default" (the first address a customer saves becomes the default anyway). */
  makeDefault: boolean;
}) {
  const [state, formAction] = useActionState(async (prev: ActionState, fd: FormData) => {
    const next = await saveAddress(address?.id ?? null, prev, fd);
    if (next.status === "success") onDone();
    return next;
  }, IDLE);
  const fe = state.fieldErrors ?? {};
  const init = address ? savedAddressToFields(address) : null;
  const v = state.values ?? {};
  const val = (key: string, fallback: string) => v[key] ?? fallback;

  return (
    <form action={formAction} className="space-y-4 rounded-tag border border-mist bg-white p-5" noValidate>
      <h3 className="headline text-xl">{address ? "Edit address" : "New address"}</h3>
      {state.status === "error" && !Object.keys(fe).length && (
        <p role="alert" className="text-sm text-signal">
          {state.message}
        </p>
      )}
      <Field
        label="Label"
        name="label"
        defaultValue={val("label", address?.label ?? "")}
        hint="Optional, e.g. Home or Work"
        maxLength={40}
        error={fe.label}
      />
      <Field label="Full name" name="fullName" autoComplete="name" required defaultValue={val("fullName", init?.fullName ?? "")} error={fe.fullName} />
      <Field label="Street and house number" name="line1" autoComplete="address-line1" required defaultValue={val("line1", init?.line1 ?? "")} error={fe.line1} />
      <Field label="Apartment, floor, c/o" name="line2" autoComplete="address-line2" defaultValue={val("line2", init?.line2 ?? "")} hint="Optional" error={fe.line2} />
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <Field label="Postal code" name="postalCode" autoComplete="postal-code" required defaultValue={val("postalCode", init?.postalCode ?? "")} error={fe.postalCode} />
        <Field label="City" name="city" autoComplete="address-level2" required defaultValue={val("city", init?.city ?? "")} error={fe.city} />
      </div>
      <SelectField label="Country" name="country" autoComplete="country" defaultValue={val("country", init?.country || "DE")} error={fe.country}>
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </SelectField>
      <Field label="Phone" name="phone" type="tel" autoComplete="tel" defaultValue={val("phone", init?.phone ?? "")} hint="Optional" error={fe.phone} />
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          name="isDefault"
          defaultChecked={state.values ? state.values.isDefault === "on" : (address?.isDefault ?? makeDefault)}
          className="size-4 accent-cobalt"
        />
        Use as default address
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
          {address ? "Save changes" : "Save address"}
        </SubmitButton>
        <button type="button" className="btn btn-quiet" onClick={onCancel}>
          Cancel
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
