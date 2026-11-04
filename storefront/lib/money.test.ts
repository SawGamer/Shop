import { describe, expect, it } from "vitest";
import { centsToInput, discountPercent, formatMoney, minorDigits, parsePriceToCents } from "./money";

describe("formatMoney", () => {
  it("formats cents in the money's currency", () => {
    expect(formatMoney({ cents: 12990, currency: "EUR" })).toBe("€129.90");
    expect(formatMoney({ cents: 495, currency: "EUR" })).toBe("€4.95");
    expect(formatMoney({ cents: 0, currency: "GBP" })).toBe("£0.00");
  });

  it("respects currencies without minor units", () => {
    expect(minorDigits("JPY")).toBe(0);
    expect(formatMoney({ cents: 1500, currency: "JPY" })).toBe("JP¥1,500");
  });

  it("returns an empty string for missing money", () => {
    expect(formatMoney(null)).toBe("");
  });
});

describe("parsePriceToCents", () => {
  it.each([
    ["129.90", 12990],
    ["129,9", 12990],
    ["129", 12900],
    [" 0.05 ", 5],
    ["0", 0],
  ])("parses %j", (input, cents) => {
    expect(parsePriceToCents(input)).toBe(cents);
  });

  it.each(["", "abc", "-5", "1.999", "1.2.3", "12e3"])("rejects %j", (input) => {
    expect(parsePriceToCents(input)).toBeNull();
  });
});

describe("centsToInput", () => {
  it("round-trips with parsePriceToCents", () => {
    for (const cents of [0, 5, 495, 12990, 100000]) {
      expect(parsePriceToCents(centsToInput(cents))).toBe(cents);
    }
    expect(centsToInput(null)).toBe("");
  });
});

describe("discountPercent", () => {
  it("rounds the saving to a whole percent", () => {
    expect(discountPercent({ cents: 7990, currency: "EUR" }, { cents: 10990, currency: "EUR" })).toBe(27);
  });
  it("is null when there is no real saving", () => {
    expect(discountPercent({ cents: 100, currency: "EUR" }, null)).toBeNull();
    expect(discountPercent({ cents: 100, currency: "EUR" }, { cents: 100, currency: "EUR" })).toBeNull();
  });
});
