"use server";

import { refresh, updateTag } from "next/cache";
import { api } from "@/lib/api";
import { fail, ok, optStr, str, type ActionState } from "@/lib/action-state";
import { toActionState } from "@/lib/action-errors";
import { assertAdmin } from "@/lib/auth";
import { COUNTRIES } from "@/lib/format";
import { isValidPrefix, parsePrefixes, validateOpeningHours } from "@/lib/fulfillment";
import { parsePriceToCents } from "@/lib/money";
import type {
  FulfillmentMode,
  LocationUpsert,
  OpeningRange,
  PickupLocation,
  Schedule,
  Zone,
  ZoneUpsert,
} from "@/lib/types";

/** Zones, stores and the mode are read by shoppers through cached calls; expire them on every save. */
function changed(opts: { shop?: boolean } = {}): void {
  updateTag("fulfillment");
  if (opts.shop) updateTag("shop");
  refresh();
}

const COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));

export async function setFulfillmentMode(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const mode = str(fd, "mode") as FulfillmentMode;
  if (mode !== "SHIPPING" && mode !== "LOCAL") return fail("Choose how orders are fulfilled.");
  try {
    await assertAdmin();
    await api<{ mode: FulfillmentMode }>("/api/v1/admin/fulfillment/mode", { method: "PUT", body: { mode } });
  } catch (e) {
    return toActionState(e, "We couldn't change the mode.");
  }
  changed({ shop: true });
  return ok(mode === "LOCAL" ? "Customers now choose a delivery slot or pickup." : "Orders are shipped by parcel again.");
}

function parseZone(fd: FormData): { value?: ZoneUpsert; errors?: Record<string, string> } {
  const errors: Record<string, string> = {};
  const name = str(fd, "name");
  const prefixes = parsePrefixes(str(fd, "prefixes"));
  const fee = parsePriceToCents(str(fd, "fee"));
  const freeRaw = str(fd, "freeFrom");
  const free = freeRaw ? parsePriceToCents(freeRaw) : null;
  const min = parsePriceToCents(str(fd, "minOrder") || "0");
  if (!name) errors.name = "Enter a name";
  else if (name.length > 80) errors.name = "Use at most 80 characters";
  if (prefixes.length === 0) errors.prefixes = "Enter at least one postcode prefix, e.g. 101, 102";
  else if (prefixes.length > 50) errors.prefixes = "Use at most 50 prefixes";
  else if (!prefixes.every(isValidPrefix)) errors.prefixes = "Use letters and digits only, up to 10 each";
  if (fee === null) errors.fee = "Enter an amount like 4.90";
  if (freeRaw && free === null) errors.freeFrom = "Enter an amount like 60, or leave empty";
  if (min === null) errors.minOrder = "Enter an amount like 20, or 0";
  if (Object.keys(errors).length) return { errors };
  return {
    value: { name, postcodePrefixes: prefixes, feeCents: fee!, freeFromCents: free, minOrderCents: min! },
  };
}

export async function saveZone(id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseZone(fd);
  if (!parsed.value) return fail("Check the highlighted fields.", parsed.errors);
  try {
    await assertAdmin();
    await api<Zone>(id ? `/api/v1/admin/fulfillment/zones/${encodeURIComponent(id)}` : "/api/v1/admin/fulfillment/zones", {
      method: id ? "PUT" : "POST",
      body: parsed.value,
    });
  } catch (e) {
    return toActionState(e, "We couldn't save the delivery area.");
  }
  changed();
  return ok(id ? "Saved." : "Delivery area added.");
}

export async function deleteZone(id: string, _prev: ActionState): Promise<ActionState> {
  try {
    await assertAdmin();
    await api<void>(`/api/v1/admin/fulfillment/zones/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (e) {
    return toActionState(e, "We couldn't delete the delivery area.");
  }
  changed();
  return ok("Deleted.");
}

function parseLocation(fd: FormData): { value?: LocationUpsert; errors?: Record<string, string> } {
  const errors: Record<string, string> = {};
  const name = str(fd, "name");
  const line1 = str(fd, "line1");
  const postalCode = str(fd, "postalCode");
  const city = str(fd, "city");
  const country = str(fd, "country").toUpperCase();
  const openingHours = str(fd, "openingHours");
  if (!name) errors.name = "Enter a name";
  if (!line1) errors.line1 = "Enter a street and house number";
  if (!postalCode) errors.postalCode = "Enter a postal code";
  if (!city) errors.city = "Enter a city";
  if (!COUNTRY_CODES.has(country)) errors.country = "Choose a country";
  if (!openingHours) errors.openingHours = "Describe the opening hours, e.g. Mon–Sat 8:00–20:00";
  else if (openingHours.length > 200) errors.openingHours = "Use at most 200 characters";
  if (Object.keys(errors).length) return { errors };
  return {
    value: {
      name,
      openingHours,
      address: { fullName: name, line1, line2: optStr(fd, "line2"), postalCode, city, country, phone: optStr(fd, "phone") },
    },
  };
}

export async function saveLocation(id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseLocation(fd);
  if (!parsed.value) return fail("Check the highlighted fields.", parsed.errors);
  try {
    await assertAdmin();
    await api<PickupLocation>(
      id ? `/api/v1/admin/fulfillment/locations/${encodeURIComponent(id)}` : "/api/v1/admin/fulfillment/locations",
      { method: id ? "PUT" : "POST", body: parsed.value },
    );
  } catch (e) {
    return toActionState(e, "We couldn't save the store.");
  }
  changed();
  return ok(id ? "Saved." : "Store added.");
}

export async function deleteLocation(id: string, _prev: ActionState): Promise<ActionState> {
  try {
    await assertAdmin();
    await api<void>(`/api/v1/admin/fulfillment/locations/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (e) {
    return toActionState(e, "We couldn't delete the store.");
  }
  changed();
  return ok("Deleted.");
}

function intField(fd: FormData, key: string, min: number, max: number, label: string, errors: Record<string, string>): number {
  const n = Number(str(fd, key));
  if (!Number.isInteger(n) || n < min || n > max) {
    errors[key] = `${label}: a whole number from ${min} to ${max}`;
    return min;
  }
  return n;
}

export async function saveSchedule(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const errors: Record<string, string> = {};
  const slotMinutes = intField(fd, "slotMinutes", 30, 240, "Slot length", errors);
  const capacityPerSlot = intField(fd, "capacityPerSlot", 1, 500, "Orders per slot", errors);
  const leadTimeMinutes = intField(fd, "leadTimeMinutes", 0, 10080, "Lead time", errors);
  const horizonDays = intField(fd, "horizonDays", 1, 14, "Booking window", errors);

  let openingHours: OpeningRange[] = [];
  try {
    const parsed = JSON.parse(str(fd, "openingHours") || "[]") as OpeningRange[];
    openingHours = parsed.map((r) => ({ dayOfWeek: Number(r.dayOfWeek) as OpeningRange["dayOfWeek"], from: String(r.from), to: String(r.to) }));
  } catch {
    errors.openingHours = "The opening hours could not be read. Reload the page and try again.";
  }
  const hoursError = errors.openingHours ? errors.openingHours : validateOpeningHours(openingHours);
  if (hoursError) errors.openingHours = hoursError;
  else if (openingHours.some((r) => !Number.isInteger(r.dayOfWeek) || r.dayOfWeek < 1 || r.dayOfWeek > 7)) {
    errors.openingHours = "Choose a weekday for every range.";
  } else if (openingHours.length === 0) {
    errors.openingHours = "Add at least one opening time, otherwise no slots can be booked.";
  }
  if (Object.keys(errors).length) return fail("Check the highlighted fields.", errors);

  const body: Schedule = { slotMinutes, capacityPerSlot, leadTimeMinutes, horizonDays, openingHours };
  try {
    await assertAdmin();
    await api<Schedule>("/api/v1/admin/fulfillment/schedule", { method: "PUT", body });
  } catch (e) {
    return toActionState(e, "We couldn't save the schedule.");
  }
  changed();
  return ok("Schedule saved. New slots follow it from now on; booked slots stay as they are.");
}
