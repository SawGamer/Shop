"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { api, isApiError } from "@/lib/api";
import { COOKIE_POSTCODE, POSTCODE_COOKIE_MAX_AGE, cookieSecure } from "@/lib/config";
import { toActionState } from "@/lib/action-errors";
import {
  describeReorder,
  describeZone,
  isPlausiblePostcode,
  normalizePostcode,
  type PostcodeState,
  type ReorderState,
  type SlotsResult,
} from "@/lib/fulfillment";
import { getSlotDays, getZone } from "@/lib/fulfillment-data";
import { getShop } from "@/lib/shop";
import type { FulfillmentMethod, ReorderResult, Zone } from "@/lib/types";

/** Header form: checks a postcode and, when the shop delivers there, remembers it in a cookie. */
export async function setPostcode(_prev: PostcodeState, fd: FormData): Promise<PostcodeState> {
  const raw = fd.get("postcode");
  const postcode = normalizePostcode(typeof raw === "string" ? raw : "");
  if (!isPlausiblePostcode(postcode)) {
    return { status: "error", message: "Enter your postcode, for example 10115.", postcode };
  }
  let zone: Zone | null;
  try {
    zone = await getZone(postcode);
  } catch (e) {
    return { status: "error", message: toActionState(e, "We couldn't check that postcode.").message, postcode };
  }
  if (!zone) {
    return { status: "error", message: `Sorry, we don't deliver to ${postcode} yet.`, postcode, zone: null };
  }
  const { settings } = await getShop();
  (await cookies()).set(COOKIE_POSTCODE, postcode, {
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: POSTCODE_COOKIE_MAX_AGE,
  });
  refresh();
  return { status: "success", message: describeZone(zone, postcode, settings.currency), postcode, zone };
}

export async function clearPostcode(): Promise<void> {
  (await cookies()).delete(COOKIE_POSTCODE);
  refresh();
}

/** Looks a postcode up without remembering it (checkout validates the address field with this). */
export async function lookupZone(postcode: string): Promise<{ zone: Zone | null }> {
  if (!isPlausiblePostcode(postcode)) return { zone: null };
  try {
    return { zone: await getZone(postcode) };
  } catch {
    return { zone: null };
  }
}

/** Bookable slots for the picker; called from the browser whenever the postcode or store changes. */
export async function fetchSlots(
  method: FulfillmentMethod,
  postcode: string | null,
  locationId: string | null,
): Promise<SlotsResult> {
  try {
    if (method === "DELIVERY") {
      if (!postcode || !isPlausiblePostcode(postcode)) return { days: [] };
      return { days: await getSlotDays("DELIVERY", { postcode, days: 7 }) };
    }
    if (!locationId) return { days: [] };
    return { days: await getSlotDays("PICKUP", { locationId, days: 7 }) };
  } catch (e) {
    if (isApiError(e, "NOT_FOUND") || isApiError(e, "NOT_DELIVERABLE")) return { days: [] };
    return { error: toActionState(e, "We couldn't load the time slots.").message ?? "We couldn't load the time slots." };
  }
}

/** "Buy again": adds the items of a past order to the cart where they are still available. */
export async function reorderOrder(orderId: string, _prev: ReorderState): Promise<ReorderState> {
  try {
    const res = await api<ReorderResult>(`/api/v1/orders/${encodeURIComponent(orderId)}/reorder`, { method: "POST" });
    refresh(); // the cart badge in the header
    return {
      status: "success",
      added: res.added,
      skipped: res.skipped,
      message: describeReorder(res.added, res.skipped),
    };
  } catch (e) {
    return { status: "error", message: toActionState(e, "We couldn't add those items to your cart.").message };
  }
}
