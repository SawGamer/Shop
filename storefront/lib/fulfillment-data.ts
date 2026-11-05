import "server-only";
import { cookies } from "next/headers";
import { api, isApiError } from "./api";
import { COOKIE_POSTCODE, DEFAULT_TIME_ZONE } from "./config";
import { normalizePostcode } from "./fulfillment";
import { getShop } from "./shop";
import type { AdminFulfillment, FulfillmentMethod, FulfillmentMode, PickupLocation, SlotDay, Zone } from "./types";

// Zones and stores change rarely and are the same for everybody, so they are cached briefly under the
// "fulfillment" tag; the admin Fulfillment page expires it on every save. Slots are never cached.
const TTL = 60;

export type FulfillmentConfig = { mode: FulfillmentMode; timeZone: string };

/** Mode and time zone from the shop settings; parcel shipping when the API doesn't say. */
export async function getFulfillmentConfig(): Promise<FulfillmentConfig> {
  const { settings } = await getShop();
  return { mode: settings.fulfillmentMode === "LOCAL" ? "LOCAL" : "SHIPPING", timeZone: settings.timeZone || DEFAULT_TIME_ZONE };
}

/** The postcode the shopper last checked, if any. */
export async function getPostcodeCookie(): Promise<string | null> {
  const value = normalizePostcode((await cookies()).get(COOKIE_POSTCODE)?.value);
  return value || null;
}

/** The zone serving a postcode, or null when the shop doesn't deliver there (or the API is unreachable). */
export async function getZone(postcode: string): Promise<Zone | null> {
  const code = normalizePostcode(postcode);
  if (!code) return null;
  try {
    return await api<Zone>("/api/v1/fulfillment/zone", {
      auth: false,
      query: { postcode: code },
      revalidate: TTL,
      tags: ["fulfillment"],
    });
  } catch (e) {
    if (isApiError(e, "NOT_FOUND") || isApiError(e, "FULFILLMENT_DISABLED") || isApiError(e, "API_UNAVAILABLE")) return null;
    throw e;
  }
}

export async function getLocations(): Promise<PickupLocation[]> {
  try {
    return await api<PickupLocation[]>("/api/v1/fulfillment/locations", {
      auth: false,
      revalidate: TTL,
      tags: ["fulfillment"],
    });
  } catch (e) {
    if (isApiError(e, "FULFILLMENT_DISABLED") || isApiError(e, "API_UNAVAILABLE")) return [];
    throw e;
  }
}

export async function getSlotDays(
  method: FulfillmentMethod,
  opts: { postcode?: string; locationId?: string; days?: number },
): Promise<SlotDay[]> {
  return api<SlotDay[]>("/api/v1/fulfillment/slots", {
    auth: false,
    query: {
      method,
      postcode: opts.postcode ? normalizePostcode(opts.postcode) : undefined,
      locationId: opts.locationId,
      days: opts.days ?? 7,
    },
  });
}

export async function getAdminFulfillment(): Promise<AdminFulfillment> {
  return api<AdminFulfillment>("/api/v1/admin/fulfillment");
}
