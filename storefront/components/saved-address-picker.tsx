"use client";

import { useId } from "react";
import { describeAddress, savedAddressToFields, type AddressFields } from "@/lib/addresses";
import type { SavedAddress } from "@/lib/types";

const FIELD_NAMES: (keyof AddressFields)[] = ["fullName", "line1", "line2", "postalCode", "city", "country", "phone"];

/**
 * Sets an input's value the way a user typing would, so React-controlled inputs (the postcode check in the
 * local checkout) notice it: go through the native setter, then fire the matching DOM event.
 */
function setFieldValue(el: HTMLInputElement | HTMLSelectElement, value: string) {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
}

/**
 * "Use a saved address": fills the address fields of the surrounding form. The fields stay editable and the
 * select itself is not submitted. The default address is preselected (the form's initial values come from it).
 */
export function SavedAddressPicker({ addresses, defaultId }: { addresses: SavedAddress[]; defaultId: string | null }) {
  const id = useId();
  if (addresses.length === 0) return null;

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const form = e.target.form;
    if (!form) return;
    const chosen = addresses.find((a) => a.id === e.target.value);
    // "Enter a new address" clears the address but keeps the name and country.
    const fields = chosen ? savedAddressToFields(chosen) : null;
    for (const name of FIELD_NAMES) {
      const el = form.elements.namedItem(name);
      if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) continue;
      if (fields) setFieldValue(el, fields[name]);
      else if (name !== "fullName" && name !== "country") setFieldValue(el, "");
    }
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        Use a saved address
      </label>
      <select id={id} className="field" defaultValue={defaultId ?? ""} onChange={onChange}>
        {addresses.map((a) => (
          <option key={a.id} value={a.id}>
            {describeAddress(a)}
            {a.isDefault ? " (default)" : ""}
          </option>
        ))}
        <option value="">Enter a new address</option>
      </select>
    </div>
  );
}
