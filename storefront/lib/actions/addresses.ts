"use server";

import { refresh } from "next/cache";
import { api } from "@/lib/api";
import { fail, formValues, ok, withValues, type ActionState } from "@/lib/action-state";
import { toActionState } from "@/lib/action-errors";
import { parseAddressForm } from "@/lib/addresses";
import { getMyAddresses } from "@/lib/addresses-data";
import type { SavedAddress, SavedAddressInput } from "@/lib/types";

/** Adds (id = null) or updates a saved address. */
export async function saveAddress(id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = formValues(fd);
  const { value, errors } = parseAddressForm(values);
  if (!value) return fail("Check the highlighted fields.", errors, values);
  try {
    await api<SavedAddress>(id ? `/api/v1/me/addresses/${encodeURIComponent(id)}` : "/api/v1/me/addresses", {
      method: id ? "PUT" : "POST",
      body: value,
    });
  } catch (e) {
    return withValues(toActionState(e, "We couldn't save that address."), values);
  }
  refresh();
  return ok(id ? "Address updated." : "Address saved.");
}

export async function deleteAddress(id: string, _prev: ActionState): Promise<ActionState> {
  try {
    await api<void>(`/api/v1/me/addresses/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (e) {
    return toActionState(e, "We couldn't delete that address.");
  }
  refresh();
  return ok("Address deleted.");
}

/** Marks an address as the default by saving it again with the flag set. */
export async function makeDefaultAddress(id: string, _prev: ActionState): Promise<ActionState> {
  try {
    const current = (await getMyAddresses()).find((a) => a.id === id);
    if (!current) return fail("That address no longer exists.");
    const body: SavedAddressInput = {
      label: current.label,
      fullName: current.fullName,
      line1: current.line1,
      line2: current.line2,
      postalCode: current.postalCode,
      city: current.city,
      country: current.country,
      phone: current.phone,
      isDefault: true,
    };
    await api<SavedAddress>(`/api/v1/me/addresses/${encodeURIComponent(id)}`, { method: "PUT", body });
  } catch (e) {
    return toActionState(e, "We couldn't change the default address.");
  }
  refresh();
  return ok("Default address changed.");
}
