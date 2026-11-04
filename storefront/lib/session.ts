import "server-only";
import { cookies } from "next/headers";
import {
  CART_COOKIE_MAX_AGE,
  COOKIE_ACCESS,
  COOKIE_CART,
  COOKIE_REFRESH,
  cookieSecure,
} from "./config";
import type { AuthResponse, Cart } from "./types";

// Cookie writes are only allowed in Server Actions, Route Handlers and proxy.ts.

function baseCookie() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: cookieSecure(),
    path: "/",
  };
}

export async function setAuthCookies(auth: AuthResponse): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_ACCESS, auth.accessToken, {
    ...baseCookie(),
    expires: new Date(auth.accessTokenExpiresAt),
  });
  jar.set(COOKIE_REFRESH, auth.refreshToken, {
    ...baseCookie(),
    expires: new Date(auth.refreshTokenExpiresAt),
  });
}

export async function clearAuthCookies(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_ACCESS);
  jar.delete(COOKIE_REFRESH);
}

export async function getRefreshToken(): Promise<string | null> {
  return (await cookies()).get(COOKIE_REFRESH)?.value ?? null;
}

export async function hasSession(): Promise<boolean> {
  const jar = await cookies();
  return jar.has(COOKIE_ACCESS) || jar.has(COOKIE_REFRESH);
}

export async function setCartCookie(id: string): Promise<void> {
  (await cookies()).set(COOKIE_CART, id, { ...baseCookie(), maxAge: CART_COOKIE_MAX_AGE });
}

export async function clearCartCookie(): Promise<void> {
  (await cookies()).delete(COOKIE_CART);
}

/**
 * Keeps the guest cart cookie in step with an API cart response.
 * For a logged-in request the guest cart has been merged, so the cookie is dropped.
 */
export async function syncCartCookie(
  cart: Cart | null,
  headers: Headers | null,
  loggedIn: boolean,
): Promise<void> {
  const jar = await cookies();
  if (loggedIn) {
    if (jar.has(COOKIE_CART)) jar.delete(COOKIE_CART);
    return;
  }
  const id = headers?.get("X-Cart-Id") ?? cart?.id ?? null;
  if (id && jar.get(COOKIE_CART)?.value !== id) {
    jar.set(COOKIE_CART, id, { ...baseCookie(), maxAge: CART_COOKIE_MAX_AGE });
  }
}
