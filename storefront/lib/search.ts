// URL <-> search query mapping for /search and /c/[slug]. Pure functions, no server imports.

export const SORTS = ["relevance", "newest", "price_asc", "price_desc", "deal_ending"] as const;
export type Sort = (typeof SORTS)[number];

export const SORT_LABELS: Record<Sort, string> = {
  relevance: "Best match",
  newest: "Newest",
  price_asc: "Price, low to high",
  price_desc: "Price, high to low",
  deal_ending: "Deals ending soon",
};

/** Spec filters arrive as `spec.<key>=value` URL params; keys are snake_case ids from the API. */
export const SPEC_PREFIX = "spec.";
const SPEC_KEY = /^[a-z0-9_]{1,40}$/;

export const PAGE_SIZE = 24;

export type SearchQuery = {
  q: string;
  category: string;
  brand: string[];
  size: string[];
  color: string[];
  /** Whole currency units as typed in the URL (?min=50). */
  min: string;
  max: string;
  inStock: boolean;
  onSale: boolean;
  /** Only products with a running deal. */
  deal: boolean;
  /** Selected spec values per spec key (OR within a key, AND across keys). */
  specs: Record<string, string[]>;
  sort: Sort | "";
  page: number;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

function all(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  return (Array.isArray(v) ? v : [v]).map((s) => s.trim()).filter(Boolean);
}

function wholeUnits(v: string): string {
  return /^\d{1,7}$/.test(v) ? v : "";
}

export function parseSpecs(sp: RawSearchParams): Record<string, string[]> {
  const specs: Record<string, string[]> = {};
  for (const [name, value] of Object.entries(sp)) {
    if (!name.startsWith(SPEC_PREFIX)) continue;
    const key = name.slice(SPEC_PREFIX.length);
    if (!SPEC_KEY.test(key)) continue;
    const values = [...new Set(all(value).map((v) => v.slice(0, 100)))].slice(0, 20);
    if (values.length) specs[key] = values;
  }
  return specs;
}

/** `[param, value]` pairs for the spec filters, in a stable order (shared by URLs and API calls). */
export function specParams(specs: Record<string, string[]>): [string, string][] {
  return Object.keys(specs)
    .sort()
    .flatMap((key) => specs[key].map((v): [string, string] => [`${SPEC_PREFIX}${key}`, v]));
}

export function toggleSpec(specs: Record<string, string[]>, key: string, value: string): Record<string, string[]> {
  const next = { ...specs, [key]: toggle(specs[key] ?? [], value) };
  if (next[key].length === 0) delete next[key];
  return next;
}

export function parseSearchParams(sp: RawSearchParams): SearchQuery {
  const sort = first(sp.sort);
  const page = Number.parseInt(first(sp.page), 10);
  return {
    q: first(sp.q).slice(0, 200),
    category: first(sp.category),
    brand: all(sp.brand),
    size: all(sp.size),
    color: all(sp.color),
    min: wholeUnits(first(sp.min)),
    max: wholeUnits(first(sp.max)),
    inStock: first(sp.inStock) === "true",
    onSale: first(sp.onSale) === "true",
    deal: first(sp.deal) === "true",
    specs: parseSpecs(sp),
    sort: (SORTS as readonly string[]).includes(sort) ? (sort as Sort) : "",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Query object for GET /api/v1/products. Prices go to the API in cents, pages 0-based. */
export function toApiQuery(q: SearchQuery, pageSize = PAGE_SIZE) {
  const specs: Record<string, string[]> = {};
  for (const [name, value] of specParams(q.specs)) (specs[name] ??= []).push(value);
  return {
    q: q.q || undefined,
    category: q.category || undefined,
    brand: q.brand,
    size: q.size,
    color: q.color,
    minPrice: q.min ? Number(q.min) * 100 : undefined,
    maxPrice: q.max ? Number(q.max) * 100 : undefined,
    inStock: q.inStock ? "true" : undefined,
    onSale: q.onSale ? "true" : undefined,
    deal: q.deal ? "true" : undefined,
    ...specs,
    sort: q.sort || undefined,
    page: q.page - 1,
    pageSize,
  };
}

/** Builds a storefront URL for the query with `patch` applied. Filters reset to page 1. */
export function searchHref(
  base: string,
  q: SearchQuery,
  patch: Partial<SearchQuery> = {},
  omitCategory = false,
): string {
  const next: SearchQuery = { ...q, page: 1, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.category && !omitCategory) params.set("category", next.category);
  for (const b of next.brand) params.append("brand", b);
  for (const s of next.size) params.append("size", s);
  for (const c of next.color) params.append("color", c);
  if (next.min) params.set("min", next.min);
  if (next.max) params.set("max", next.max);
  if (next.inStock) params.set("inStock", "true");
  if (next.onSale) params.set("onSale", "true");
  if (next.deal) params.set("deal", "true");
  for (const [name, value] of specParams(next.specs)) params.append(name, value);
  if (next.sort) params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));
  const s = params.toString();
  return s ? `${base}?${s}` : base;
}

export function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function hasActiveFilters(q: SearchQuery, ignoreCategory = false): boolean {
  return (
    (!ignoreCategory && !!q.category) ||
    q.brand.length > 0 ||
    q.size.length > 0 ||
    q.color.length > 0 ||
    !!q.min ||
    !!q.max ||
    q.inStock ||
    q.onSale ||
    q.deal ||
    Object.keys(q.specs).length > 0
  );
}
