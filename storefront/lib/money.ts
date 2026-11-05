import { LOCALE } from "./config";
import type { Money } from "./types";

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: string): Intl.NumberFormat {
  let f = formatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE, { style: "currency", currency });
    formatters.set(currency, f);
  }
  return f;
}

/** Number of minor-unit digits for a currency (2 for EUR, 0 for JPY). */
export function minorDigits(currency: string): number {
  return formatter(currency).resolvedOptions().maximumFractionDigits ?? 2;
}

export function formatMoney(money: Money | null | undefined): string {
  if (!money) return "";
  const digits = minorDigits(money.currency);
  return formatter(money.currency).format(money.cents / 10 ** digits);
}

/** Whole-number percentage saved, e.g. 20 for 100 → 80. */
export function discountPercent(price: Money, compareAt: Money | null): number | null {
  if (!compareAt || compareAt.cents <= price.cents || compareAt.cents === 0) return null;
  return Math.round(((compareAt.cents - price.cents) / compareAt.cents) * 100);
}

/**
 * Parses a price typed by an admin ("129.90", "129,9", "129") into cents.
 * Returns null for anything that is not a non-negative amount with at most two decimals.
 */
export function parsePriceToCents(input: string | null | undefined): number | null {
  if (input == null) return null;
  const s = input.trim().replace(/\s/g, "");
  if (!/^\d{1,9}([.,]\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(/[.,]/);
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

/** Cents → "129.90" for pre-filling admin inputs. */
export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  const whole = Math.trunc(cents / 100);
  const frac = Math.abs(cents % 100).toString().padStart(2, "0");
  return `${whole}.${frac}`;
}
