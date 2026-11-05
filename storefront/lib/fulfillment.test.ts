import { describe, expect, it } from "vitest";
import {
  buildCheckoutPayload,
  centsToFreeDelivery,
  centsToMinimum,
  dayChipLabel,
  deliveryFeeCents,
  describeFulfillment,
  formatSlotRange,
  groupSlotsByDay,
  isPlausiblePostcode,
  normalizePostcode,
  normalizeSlotDays,
  parsePrefixes,
  scarcityLabel,
  validateOpeningHours,
} from "./fulfillment";
import type { Address, PickupLocation, Slot } from "./types";

const TZ = "Europe/Berlin";

describe("postcodes", () => {
  it("normalises spaces and case", () => {
    expect(normalizePostcode(" 10 115 ")).toBe("10115");
    expect(normalizePostcode("sw1a 1aa")).toBe("SW1A1AA");
    expect(normalizePostcode(null)).toBe("");
  });
  it("rejects obviously wrong input before calling the API", () => {
    expect(isPlausiblePostcode("10115")).toBe(true);
    expect(isPlausiblePostcode("SW1A 1AA")).toBe(true);
    expect(isPlausiblePostcode("12")).toBe(false);
    expect(isPlausiblePostcode("10115; drop")).toBe(false);
    expect(isPlausiblePostcode("")).toBe(false);
  });
});

describe("minimum order and delivery fee", () => {
  const zone = { minOrderCents: 2000, freeFromCents: 6000, feeCents: 490 };
  it("tells how much is missing to the minimum", () => {
    expect(centsToMinimum(1250, zone)).toBe(750);
    expect(centsToMinimum(2000, zone)).toBe(0);
    expect(centsToMinimum(5000, zone)).toBe(0);
    expect(centsToMinimum(100, { minOrderCents: 0 })).toBe(0);
    expect(centsToMinimum(100, null)).toBe(0);
  });
  it("tells how much is missing to free delivery", () => {
    expect(centsToFreeDelivery(4500, zone)).toBe(1500);
    expect(centsToFreeDelivery(6000, zone)).toBe(0);
    expect(centsToFreeDelivery(100, { freeFromCents: null })).toBeNull();
    expect(centsToFreeDelivery(100, null)).toBeNull();
  });
  it("charges the fee below the threshold and nothing from it", () => {
    expect(deliveryFeeCents(5999, zone)).toBe(490);
    expect(deliveryFeeCents(6000, zone)).toBe(0);
    expect(deliveryFeeCents(100, { feeCents: 490, freeFromCents: null })).toBe(490);
  });
});

function slot(id: string, startsAt: string, endsAt: string, remaining = 5): Slot {
  return { id, startsAt, endsAt, remaining };
}

describe("slot formatting and grouping", () => {
  it("formats a window in the shop's time zone, not the viewer's", () => {
    // 09:00Z is 10:00 in Berlin in winter and 11:00 in summer.
    expect(formatSlotRange("2026-11-06T09:00:00Z", "2026-11-06T10:00:00Z", TZ)).toBe("10:00–11:00");
    expect(formatSlotRange("2026-07-06T09:00:00Z", "2026-07-06T10:00:00Z", TZ)).toBe("11:00–12:00");
  });

  it("groups by local calendar day, sorted, even when the API order is mixed", () => {
    const slots = [
      slot("c", "2026-11-07T08:00:00Z", "2026-11-07T09:00:00Z"),
      slot("a", "2026-11-06T09:00:00Z", "2026-11-06T10:00:00Z"),
      slot("b", "2026-11-06T10:00:00Z", "2026-11-06T11:00:00Z"),
    ];
    const days = groupSlotsByDay(slots, TZ);
    expect(days.map((d) => d.date)).toEqual(["2026-11-06", "2026-11-07"]);
    expect(days[0].slots.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("puts a late evening slot on the shop's day, not the UTC day", () => {
    // 23:30 UTC on 6 Nov is 00:30 on 7 Nov in Berlin.
    const days = groupSlotsByDay([slot("x", "2026-11-06T23:30:00Z", "2026-11-07T00:30:00Z")], TZ);
    expect(days[0].date).toBe("2026-11-07");
  });

  it("merges duplicate days and drops empty ones when normalising", () => {
    const days = normalizeSlotDays(
      [
        { date: "2026-11-06", slots: [slot("a", "2026-11-06T09:00:00Z", "2026-11-06T10:00:00Z")] },
        { date: "2026-11-06", slots: [slot("b", "2026-11-06T10:00:00Z", "2026-11-06T11:00:00Z")] },
        { date: "2026-11-07", slots: [] },
      ],
      TZ,
    );
    expect(days).toHaveLength(1);
    expect(days[0].slots.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("labels day chips Today, Tomorrow or by date", () => {
    const now = new Date("2026-11-06T08:00:00Z");
    const day = (date: string, iso: string) => ({ date, slots: [slot("s", iso, iso)] });
    expect(dayChipLabel(day("2026-11-06", "2026-11-06T12:00:00Z"), TZ, now)).toBe("Today");
    expect(dayChipLabel(day("2026-11-07", "2026-11-07T12:00:00Z"), TZ, now)).toBe("Tomorrow");
    expect(dayChipLabel(day("2026-11-09", "2026-11-09T12:00:00Z"), TZ, now)).toMatch(/Mon/);
  });

  it("warns only when a slot is nearly full", () => {
    expect(scarcityLabel(1)).toBe("only 1 left");
    expect(scarcityLabel(3)).toBe("only 3 left");
    expect(scarcityLabel(4)).toBeNull();
    expect(scarcityLabel(0)).toBe("full");
  });

  it("describes a delivery and a pickup for order pages", () => {
    const slotWindow = { startsAt: "2026-11-06T09:00:00Z", endsAt: "2026-11-06T10:00:00Z" };
    expect(
      describeFulfillment({ method: "DELIVERY", slot: slotWindow, zoneName: "Berlin Mitte", feeCents: 490, locationName: null }, TZ),
    ).toMatch(/^Delivery Fri, 6 Nov, 10:00–11:00 · Berlin Mitte$|^Delivery Fri 6 Nov, 10:00–11:00 · Berlin Mitte$/);
    expect(
      describeFulfillment({ method: "PICKUP", slot: slotWindow, zoneName: null, feeCents: null, locationName: "Mitte Market" }, TZ),
    ).toContain("Pickup");
    expect(
      describeFulfillment({ method: "PICKUP", slot: slotWindow, zoneName: null, feeCents: null, locationName: "Mitte Market" }, TZ),
    ).toContain("· Mitte Market");
  });
});

describe("checkout payload", () => {
  const address: Address = {
    fullName: "Erika Mustermann",
    line1: "Hauptstraße 1",
    line2: null,
    postalCode: "10 115",
    city: "Berlin",
    country: "DE",
    phone: "0170 1234567",
  };
  const location: PickupLocation = {
    id: "loc-1",
    name: "Mitte Market",
    openingHours: "Mon–Sat 8–20",
    address: { fullName: "", line1: "Invalidenstraße 5", line2: null, postalCode: "10115", city: "Berlin", country: "DE", phone: null },
  };

  it("keeps the customer's address for delivery and normalises the postcode", () => {
    const payload = buildCheckoutPayload({ method: "DELIVERY", slotId: "s1", address });
    expect(payload.fulfillment).toEqual({ method: "DELIVERY", slotId: "s1" });
    expect(payload.shippingAddress.line1).toBe("Hauptstraße 1");
    expect(payload.shippingAddress.postalCode).toBe("10115");
  });

  it("uses the store's address plus the customer's name and phone for pickup", () => {
    const payload = buildCheckoutPayload({ method: "PICKUP", slotId: "s2", address, location });
    expect(payload.fulfillment).toEqual({ method: "PICKUP", slotId: "s2", locationId: "loc-1" });
    expect(payload.shippingAddress).toMatchObject({
      fullName: "Erika Mustermann",
      phone: "0170 1234567",
      line1: "Invalidenstraße 5",
      postalCode: "10115",
      city: "Berlin",
    });
  });

  it("refuses a pickup without a store", () => {
    expect(() => buildCheckoutPayload({ method: "PICKUP", slotId: "s", address })).toThrow();
  });
});

describe("admin form helpers", () => {
  it("parses a comma separated prefix list", () => {
    expect(parsePrefixes("101, 102;12 ab,101")).toEqual(["101", "102", "12", "AB"]);
    expect(parsePrefixes("")).toEqual([]);
  });

  it("validates opening hours", () => {
    expect(validateOpeningHours([{ dayOfWeek: 1, from: "08:00", to: "20:00" }])).toBeNull();
    expect(validateOpeningHours([{ dayOfWeek: 1, from: "20:00", to: "08:00" }])).toMatch(/after/);
    expect(validateOpeningHours([{ dayOfWeek: 1, from: "8:00", to: "20:00" }])).toMatch(/times/);
    expect(
      validateOpeningHours([
        { dayOfWeek: 2, from: "08:00", to: "12:00" },
        { dayOfWeek: 2, from: "11:00", to: "14:00" },
      ]),
    ).toMatch(/overlap/);
    expect(
      validateOpeningHours([
        { dayOfWeek: 2, from: "08:00", to: "12:00" },
        { dayOfWeek: 2, from: "13:00", to: "20:00" },
        { dayOfWeek: 3, from: "08:00", to: "12:00" },
      ]),
    ).toBeNull();
  });
});
