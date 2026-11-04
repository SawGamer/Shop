import "server-only";
import { cookies } from "next/headers";
import { apiUrl, COOKIE_ACCESS, COOKIE_CART } from "./config";
import type { ErrorCode, StockProblem } from "./types";

/** A failed API call, parsed from an RFC 9457 problem response. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly title: string;
  readonly detail: string;
  readonly errors: Record<string, string>;
  readonly items: StockProblem[];

  constructor(init: {
    status: number;
    code: ErrorCode;
    title?: string;
    detail?: string;
    errors?: Record<string, string>;
    items?: StockProblem[];
  }) {
    super(init.detail || init.title || init.code);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.title = init.title ?? "";
    this.detail = init.detail ?? "";
    this.errors = init.errors ?? {};
    this.items = init.items ?? [];
  }
}

export function isApiError(e: unknown, code?: ErrorCode): e is ApiError {
  return e instanceof ApiError && (code === undefined || e.code === code);
}

type QueryValue = string | number | boolean | null | undefined | (string | number)[];

export type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** JSON body. */
  body?: unknown;
  /** Multipart body (image uploads). */
  formData?: FormData;
  query?: Record<string, QueryValue>;
  /** Attach the bearer token from the `za_at` cookie (default true). */
  auth?: boolean;
  /** Attach the guest cart id from the `za_cart` cookie (default false). */
  cart?: boolean;
  /** Explicit token, e.g. right after login before cookies round-trip. */
  token?: string | null;
  /** Explicit guest cart id. */
  cartId?: string | null;
  /** Seconds to keep the response in the Next data cache. Public catalog reads only. */
  revalidate?: number;
  /** Cache tags for on-demand revalidation (used with `revalidate`). */
  tags?: string[];
};

export type ApiResponse<T> = { data: T; status: number; headers: Headers };

const KNOWN_CODES = new Set<ErrorCode>([
  "VALIDATION_FAILED",
  "EMPTY_CART",
  "INVALID_CREDENTIALS",
  "INVALID_TOKEN",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "EMAIL_TAKEN",
  "INSUFFICIENT_STOCK",
  "INVALID_STATE_TRANSITION",
  "CONFLICT",
  "PAYMENT_PROVIDER_ERROR",
]);

function fallbackCode(status: number): ErrorCode {
  if (status === 400) return "VALIDATION_FAILED";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 502 || status === 503 || status === 504) return "API_UNAVAILABLE";
  return "UNKNOWN";
}

export function buildQuery(query: Record<string, QueryValue> | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, String(v));
    } else {
      params.append(key, String(value));
    }
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

async function parseProblem(res: Response): Promise<ApiError> {
  let body: Record<string, unknown> = {};
  try {
    const text = await res.text();
    body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    body = {};
  }
  const rawCode = typeof body.code === "string" ? (body.code as ErrorCode) : undefined;
  const code = rawCode && KNOWN_CODES.has(rawCode) ? rawCode : fallbackCode(res.status);
  return new ApiError({
    status: res.status,
    code,
    title: typeof body.title === "string" ? body.title : res.statusText,
    detail: typeof body.detail === "string" ? body.detail : "",
    errors:
      body.errors && typeof body.errors === "object"
        ? (body.errors as Record<string, string>)
        : undefined,
    items: Array.isArray(body.items) ? (body.items as StockProblem[]) : undefined,
  });
}

/** Calls the shop API from the server and returns data plus response headers. */
export async function apiRequest<T>(path: string, opts: ApiOptions = {}): Promise<ApiResponse<T>> {
  const { method = "GET", auth = true, revalidate } = opts;
  const headers = new Headers({ Accept: "application/json" });

  let token = opts.token;
  let cartId = opts.cartId;
  if ((auth && token === undefined) || (opts.cart && cartId === undefined)) {
    const jar = await cookies();
    if (auth && token === undefined) token = jar.get(COOKIE_ACCESS)?.value ?? null;
    if (opts.cart && cartId === undefined) cartId = jar.get(COOKIE_CART)?.value ?? null;
  }
  if (auth && token) headers.set("Authorization", `Bearer ${token}`);
  if (opts.cart && cartId) headers.set("X-Cart-Id", cartId);

  let body: BodyInit | undefined;
  if (opts.formData) {
    body = opts.formData;
  } else if (opts.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(opts.body);
  }

  const url = `${apiUrl()}${path}${buildQuery(opts.query)}`;
  const cacheable = method === "GET" && revalidate !== undefined && !(auth && token);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(15_000),
      ...(cacheable
        ? { next: { revalidate, tags: opts.tags } }
        : { cache: "no-store" as const }),
    });
  } catch {
    throw new ApiError({
      status: 503,
      code: "API_UNAVAILABLE",
      title: "Service unavailable",
      detail: "The shop service could not be reached.",
    });
  }

  if (!res.ok) throw await parseProblem(res);

  let data: T;
  if (res.status === 204) {
    data = undefined as T;
  } else {
    const text = await res.text();
    data = (text ? JSON.parse(text) : undefined) as T;
  }
  return { data, status: res.status, headers: res.headers };
}

/** Calls the shop API from the server and returns the parsed JSON body. */
export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  return (await apiRequest<T>(path, opts)).data;
}
