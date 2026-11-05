/**
 * Reads the `exp` claim (seconds since epoch) from a JWT without verifying it.
 * Only used to decide when to refresh; the API verifies every token.
 */
export function decodeJwtExp(token: string | null | undefined): number | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

/** True when the token is missing, unreadable, or expires within `skewSeconds`. */
export function isExpiringSoon(
  token: string | null | undefined,
  skewSeconds = 60,
  nowMs: number = Date.now(),
): boolean {
  const exp = decodeJwtExp(token);
  if (exp == null) return true;
  return exp * 1000 - nowMs < skewSeconds * 1000;
}
