// Pure helpers for delivery slots, pickup and the minimum order. No server-only imports, so they are
// unit-tested and usable from both server and client components.
import { DEFAULT_TIME_ZONE, LOCALE } from "./config";
import { formatMoney } from "./money";
import type {
  Address,
  FulfillmentMethod,
  OpeningRange,
  OrderFulfillment,
  PickupLocation,
  Slot,
  SlotDay,
  Zone,
} from "./types";

// ---------- postcodes ----------

/** Upper-case, no spaces: " 10 115 " → "10115". The API matches zones on this form. */
export function normalizePostcode(input: string | null | undefined): string {
  return (input ?? "").replace(/\s+/g, "").toUpperCase();
}

/** Cheap sanity check before calling the API: 3–10 letters or digits. */
export function isPlausiblePostcode(input: string | null | undefined): boolean {
  return /^[A-Z0-9]{3,10}$/.test(normalizePostcode(input));
}

// ---------- money ----------

/** Cents still missing to reach the zone's minimum order; 0 when reached or when there is no minimum. */
export function centsToMinimum(subtotalCents: number, zone: Pick<Zone, "minOrderCents"> | null | undefined): number {
  if (!zone || zone.minOrderCents <= 0) return 0;
  return Math.max(0, zone.minOrderCents - subtotalCents);
}

/** Cents still missing for free delivery; null when the zone has no free-delivery threshold. */
export function centsToFreeDelivery(
  subtotalCents: number,
  zone: Pick<Zone, "freeFromCents"> | null | undefined,
): number | null {
  if (!zone || zone.freeFromCents == null) return null;
  return Math.max(0, zone.freeFromCents - subtotalCents);
}

/** Delivery fee for a subtotal: the zone's fee, or 0 once the free-delivery threshold is reached. */
export function deliveryFeeCents(subtotalCents: number, zone: Pick<Zone, "feeCents" | "freeFromCents">): number {
  if (zone.freeFromCents != null && subtotalCents >= zone.freeFromCents) return 0;
  return zone.feeCents;
}

// ---------- slots ----------

function dayKey(iso: string, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );
}

/** Groups slots by calendar day in the shop's time zone, earliest first. Empty days are dropped. */
export function groupSlotsByDay(slots: Slot[], timeZone: string = DEFAULT_TIME_ZONE): SlotDay[] {
  const byDay = new Map<string, Slot[]>();
  for (const slot of [...slots].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))) {
    const key = dayKey(slot.startsAt, timeZone);
    const list = byDay.get(key);
    if (list) list.push(slot);
    else byDay.set(key, [slot]);
  }
  return [...byDay.entries()].map(([date, list]) => ({ date, slots: list }));
}

/** Re-groups whatever the API sent so days are unique, sorted and non-empty. */
export function normalizeSlotDays(days: SlotDay[], timeZone: string = DEFAULT_TIME_ZONE): SlotDay[] {
  return groupSlotsByDay(
    days.flatMap((d) => d.slots),
    timeZone,
  );
}

/** "10:00–11:00" in the shop's time zone. */
export function formatSlotRange(startsAt: string, endsAt: string, timeZone: string = DEFAULT_TIME_ZONE): string {
  const fmt = new Intl.DateTimeFormat(LOCALE, { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${fmt.format(new Date(startsAt))}–${fmt.format(new Date(endsAt))}`;
}

/** "Thu 7 Nov" for an ISO instant. */
export function formatSlotDate(iso: string, timeZone: string = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone, weekday: "short", day: "numeric", month: "short" }).format(
    new Date(iso),
  );
}

/** Label of a day chip: "Today", "Tomorrow" or "Thu 7 Nov". `now` is injectable for tests. */
export function dayChipLabel(day: SlotDay, timeZone: string = DEFAULT_TIME_ZONE, now: Date = new Date()): string {
  const first = day.slots[0];
  if (!first) return day.date;
  const todayKey = dayKey(now.toISOString(), timeZone);
  if (day.date === todayKey) return "Today";
  const tomorrowKey = dayKey(new Date(now.getTime() + 24 * 3600 * 1000).toISOString(), timeZone);
  if (day.date === tomorrowKey) return "Tomorrow";
  return formatSlotDate(first.startsAt, timeZone);
}

/** "only 2 left" when a slot is nearly full, otherwise null. */
export function scarcityLabel(remaining: number): string | null {
  if (remaining <= 0) return "full";
  return remaining <= 3 ? `only ${remaining} left` : null;
}

/** "Delivery Thu 7 Nov, 10:00–11:00 · Berlin Mitte" or "Pickup Thu 7 Nov, 10:00–11:00 · Mitte Market". */
export function describeFulfillment(f: OrderFulfillment, timeZone: string = DEFAULT_TIME_ZONE): string {
  const when = `${formatSlotDate(f.slot.startsAt, timeZone)}, ${formatSlotRange(f.slot.startsAt, f.slot.endsAt, timeZone)}`;
  const place = f.method === "DELIVERY" ? f.zoneName : f.locationName;
  return `${f.method === "DELIVERY" ? "Delivery" : "Pickup"} ${when}${place ? ` · ${place}` : ""}`;
}

// ---------- checkout payload ----------

export type CheckoutInput = {
  method: FulfillmentMethod;
  slotId: string;
  /** The customer's contact details; for delivery the full address. */
  address: Address;
  /** Required for pickup. */
  location?: PickupLocation | null;
};

export type CheckoutPayload = {
  shippingAddress: Address;
  fulfillment: { method: FulfillmentMethod; slotId: string; locationId?: string };
};

/**
 * Body of POST /checkout in LOCAL mode. For pickup the store's address stands in for the shipping address
 * (the API replaces it with the store's own anyway); only the customer's name and phone are theirs.
 */
export function buildCheckoutPayload(input: CheckoutInput): CheckoutPayload {
  if (input.method === "PICKUP") {
    const loc = input.location;
    if (!loc) throw new Error("A pickup location is required");
    return {
      shippingAddress: {
        fullName: input.address.fullName,
        phone: input.address.phone,
        line1: loc.address.line1,
        line2: loc.address.line2,
        postalCode: loc.address.postalCode,
        city: loc.address.city,
        country: loc.address.country,
      },
      fulfillment: { method: "PICKUP", slotId: input.slotId, locationId: loc.id },
    };
  }
  return {
    shippingAddress: { ...input.address, postalCode: normalizePostcode(input.address.postalCode) },
    fulfillment: { method: "DELIVERY", slotId: input.slotId },
  };
}

// ---------- admin form helpers ----------

/** "101, 102;12 ab" → ["101","102","12","AB"] (unique, normalised). */
export function parsePrefixes(input: string | null | undefined): string[] {
  const out = new Set<string>();
  for (const part of (input ?? "").split(/[\s,;]+/)) {
    const p = normalizePostcode(part);
    if (p) out.add(p);
  }
  return [...out];
}

export function isValidPrefix(prefix: string): boolean {
  return /^[A-Z0-9]{1,10}$/.test(prefix);
}

export const WEEKDAYS: { value: OpeningRange["dayOfWeek"]; label: string }[] = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isHHMM(value: string): boolean {
  return HHMM.test(value);
}

/** Validates opening-hour ranges: valid times, from < to, no overlap within a weekday. Returns an error or null. */
export function validateOpeningHours(ranges: OpeningRange[]): string | null {
  for (const r of ranges) {
    if (!isHHMM(r.from) || !isHHMM(r.to)) return "Use times like 08:00.";
    if (r.from >= r.to) return `${WEEKDAYS[r.dayOfWeek - 1]?.label ?? "A day"}: closing time must be after opening time.`;
  }
  for (const day of WEEKDAYS) {
    const list = ranges.filter((r) => r.dayOfWeek === day.value).sort((a, b) => a.from.localeCompare(b.from));
    for (let i = 1; i < list.length; i++) {
      if (list[i].from < list[i - 1].to) return `${day.label}: opening hours overlap.`;
    }
  }
  return null;
}

// ---------- action result shapes (shared by server actions and client components) ----------

export type PostcodeState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** The zone found for the postcode, when the shop delivers there. */
  zone?: Zone | null;
  postcode?: string;
};

export type ReorderState = {
  status: "idle" | "success" | "error";
  message?: string;
  added?: number;
  skipped?: { productName: string; reason: "UNAVAILABLE" | "OUT_OF_STOCK" }[];
};

export type SlotsResult = { days: SlotDay[]; error?: undefined } | { days?: undefined; error: string };

/** Human text for the reorder outcome: "Added 5 items. 1 item is no longer available." */
export function describeReorder(added: number, skipped: ReorderState["skipped"] = []): string {
  const parts: string[] = [];
  parts.push(added === 0 ? "Nothing could be added." : `Added ${added} ${added === 1 ? "item" : "items"} to your cart.`);
  const unavailable = skipped.filter((s) => s.reason === "UNAVAILABLE").length;
  const outOfStock = skipped.filter((s) => s.reason === "OUT_OF_STOCK").length;
  if (unavailable > 0) parts.push(`${unavailable} ${unavailable === 1 ? "item is" : "items are"} no longer available.`);
  if (outOfStock > 0) parts.push(`${outOfStock} ${outOfStock === 1 ? "item is" : "items are"} out of stock.`);
  return parts.join(" ");
}

/** "We deliver to 10115 · €4.90 delivery · free from €60 · min. €20" */
export function describeZone(zone: Zone, postcode: string, currency: string): string {
  const fee = zone.feeCents === 0 ? "free delivery" : `${formatMoney({ cents: zone.feeCents, currency })} delivery`;
  const parts = [`We deliver to ${postcode}`, fee];
  if (zone.freeFromCents != null && zone.feeCents > 0) {
    parts.push(`free from ${formatMoney({ cents: zone.freeFromCents, currency })}`);
  }
  if (zone.minOrderCents > 0) parts.push(`min. ${formatMoney({ cents: zone.minOrderCents, currency })}`);
  return parts.join(" · ");
}
