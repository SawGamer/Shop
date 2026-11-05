// Product comparison list: up to four product slugs in a cookie the server can read (for /compare) and the
// browser can update instantly (compare toggles and the sticky bar). Pure functions, no server imports.

export const COMPARE_COOKIE = "za_compare";
export const COMPARE_MAX = 4;
/** Name, image and price of each compared product for the sticky bar (browser storage, best effort). */
export const COMPARE_META_KEY = "za_compare_meta";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Parses the cookie value: valid slugs only, no duplicates, at most {@link COMPARE_MAX}, order kept. */
export function parseCompare(raw: string | null | undefined): string[] {
  if (!raw) return [];
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // keep raw
  }
  const out: string[] = [];
  for (const part of decoded.split(",")) {
    const slug = part.trim();
    if (slug && slug.length <= 160 && SLUG.test(slug) && !out.includes(slug)) out.push(slug);
    if (out.length === COMPARE_MAX) break;
  }
  return out;
}

export function serializeCompare(slugs: string[]): string {
  return parseCompare(slugs.join(",")).join(",");
}

/**
 * Adds or removes a slug. Adding to a full list is refused (`full: true`), so the shopper decides what to drop.
 */
export function toggleCompare(slugs: string[], slug: string): { slugs: string[]; full: boolean } {
  const current = parseCompare(slugs.join(","));
  if (current.includes(slug)) return { slugs: current.filter((s) => s !== slug), full: false };
  if (current.length >= COMPARE_MAX) return { slugs: current, full: true };
  return { slugs: [...current, slug], full: false };
}
