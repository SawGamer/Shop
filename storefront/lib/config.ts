// Server-side configuration. Read lazily so `next build` never needs these set.

export const COOKIE_ACCESS = "za_at";
export const COOKIE_REFRESH = "za_rt";
export const COOKIE_CART = "za_cart";
/** The postcode a shopper checked for delivery (LOCAL fulfillment mode). Not a secret. */
export const COOKIE_POSTCODE = "za_postcode";

export function apiUrl(): string {
  return (process.env.API_URL ?? "http://localhost:8080").replace(/\/+$/, "");
}

export function cookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === "false") return false;
  if (process.env.COOKIE_SECURE === "true") return true;
  return process.env.NODE_ENV === "production";
}

/** Locale used for money and date formatting. */
export const LOCALE = "en-GB";

/** Remembered delivery postcode, 90 days. */
export const POSTCODE_COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

/** Time zone of slots when the API doesn't say. */
export const DEFAULT_TIME_ZONE = "Europe/Berlin";

/** Guest carts live for 30 days, matching the API's cart TTL. */
export const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
