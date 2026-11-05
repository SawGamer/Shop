"use client";

import { useState } from "react";
import { ActionForm } from "@/components/forms";
import { Notice } from "@/components/ui";
import { deleteAddress, makeDefaultAddress } from "@/lib/actions/addresses";
import { MAX_SAVED_ADDRESSES } from "@/lib/addresses";
import { COUNTRIES } from "@/lib/format";
import type { SavedAddress } from "@/lib/types";
import { AddressForm } from "./address-form";

const countryName = (code: string) => COUNTRIES.find((c) => c.code === code)?.name ?? code;

/** The customer's saved addresses: list, add, edit, make default, delete. */
export function AddressesManager({ addresses }: { addresses: SavedAddress[] }) {
  // "new" shows the add form, an id shows that address's edit form.
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const atLimit = addresses.length >= MAX_SAVED_ADDRESSES;
  const done = () => setEditing(null);

  return (
    <div className="space-y-6">
      {addresses.length === 0 && editing !== "new" && (
        <p className="text-ink-soft">
          You haven&apos;t saved an address yet. Save one here and it is filled in for you at checkout.
        </p>
      )}

      <ul className="grid gap-4 md:grid-cols-2">
        {addresses.map((a) =>
          editing === a.id ? (
            <li key={a.id} className="md:col-span-2">
              <AddressForm address={a} onDone={done} onCancel={done} makeDefault={false} />
            </li>
          ) : (
            <li key={a.id} className="flex flex-col rounded-tag bg-white p-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{a.label || a.fullName}</h3>
                {a.isDefault && (
                  <span className="rounded-tag bg-moss/12 px-1.5 py-0.5 text-xs font-semibold text-moss">Default</span>
                )}
              </div>
              <address className="flex-1 text-sm not-italic text-ink-soft">
                {a.label && <span className="block">{a.fullName}</span>}
                <span className="block">{a.line1}</span>
                {a.line2 && <span className="block">{a.line2}</span>}
                <span className="block">
                  {a.postalCode} {a.city}
                </span>
                <span className="block">{countryName(a.country)}</span>
                {a.phone && <span className="block">{a.phone}</span>}
              </address>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-mist pt-3">
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditing(a.id)}>
                  Edit
                </button>
                {!a.isDefault && (
                  <ActionForm action={makeDefaultAddress.bind(null, a.id)} className="flex items-center gap-2">
                    <button type="submit" className="btn btn-quiet btn-sm">
                      Make default
                    </button>
                  </ActionForm>
                )}
                <ActionForm
                  action={deleteAddress.bind(null, a.id)}
                  className="flex items-center gap-2"
                  confirm={`Delete this address (${a.label || a.line1})?`}
                >
                  <button type="submit" className="btn btn-quiet btn-sm text-signal">
                    Delete
                  </button>
                </ActionForm>
              </div>
            </li>
          ),
        )}
      </ul>

      {editing === "new" ? (
        <AddressForm address={null} onDone={done} onCancel={done} makeDefault={addresses.length === 0} />
      ) : atLimit ? (
        <Notice tone="info" title={`You've saved the maximum of ${MAX_SAVED_ADDRESSES} addresses`}>
          Delete one you no longer use to add another.
        </Notice>
      ) : (
        <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
          Add an address
        </button>
      )}
    </div>
  );
}
