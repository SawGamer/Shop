import { NextResponse, type NextRequest } from "next/server";
import { apiUrl, COOKIE_ACCESS, COOKIE_REFRESH, cookieSecure } from "@/lib/config";
import { isExpiringSoon } from "@/lib/jwt";
import type { AuthResponse } from "@/lib/types";

// Server components can't set cookies, so the access token is refreshed here,
// before rendering: the new token goes to the browser (Set-Cookie) and is also
// written into this request's Cookie header so the page renders signed in.

function isPrefetch(request: NextRequest): boolean {
  const h = request.headers;
  return (
    h.has("next-router-prefetch") ||
    (h.get("purpose") ?? "").includes("prefetch") ||
    (h.get("sec-purpose") ?? "").includes("prefetch")
  );
}

export async function proxy(request: NextRequest) {
  const refreshToken = request.cookies.get(COOKIE_REFRESH)?.value;
  if (!refreshToken) return NextResponse.next();

  const accessToken = request.cookies.get(COOKIE_ACCESS)?.value;
  if (accessToken && !isExpiringSoon(accessToken, 60)) return NextResponse.next();

  // Prefetches fire in parallel; letting them rotate the refresh token would race.
  if (isPrefetch(request)) return NextResponse.next();

  let res: Response;
  try {
    res = await fetch(`${apiUrl()}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // API unreachable: keep the session cookies and let the page show its error state.
    return NextResponse.next();
  }

  if (res.status === 400 || res.status === 401) {
    request.cookies.delete(COOKIE_ACCESS);
    request.cookies.delete(COOKIE_REFRESH);
    const response = NextResponse.next({ request: { headers: request.headers } });
    response.cookies.delete(COOKIE_ACCESS);
    response.cookies.delete(COOKIE_REFRESH);
    return response;
  }
  if (!res.ok) return NextResponse.next();

  const auth = (await res.json()) as AuthResponse;
  request.cookies.set(COOKIE_ACCESS, auth.accessToken);
  request.cookies.set(COOKIE_REFRESH, auth.refreshToken);

  const response = NextResponse.next({ request: { headers: request.headers } });
  const base = { httpOnly: true, sameSite: "lax" as const, secure: cookieSecure(), path: "/" };
  response.cookies.set(COOKIE_ACCESS, auth.accessToken, {
    ...base,
    expires: new Date(auth.accessTokenExpiresAt),
  });
  response.cookies.set(COOKIE_REFRESH, auth.refreshToken, {
    ...base,
    expires: new Date(auth.refreshTokenExpiresAt),
  });
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|txt|xml|woff2?)$).*)",
  ],
};
