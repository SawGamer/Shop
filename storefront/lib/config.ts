// Server-side configuration. Read lazily so `next build` never needs these set.

export const COOKIE_ACCESS = "za_at";
export const COOKIE_REFRESH = "za_rt";
export const COOKIE_CART = "za_cart";

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

/** Guest carts live for 30 days, matching the API's cart TTL. */
export const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
