import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { api, isApiError } from "./api";
import { COOKIE_ACCESS } from "./config";
import type { User } from "./types";

/**
 * The signed-in user for this request, or null. Deduplicated per request.
 * Throws only when the API is unreachable, so callers can tell "logged out" from "down".
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE_ACCESS)?.value;
  if (!token) return null;
  try {
    return await api<User>("/api/v1/me", { token });
  } catch (e) {
    if (isApiError(e) && (e.status === 401 || e.status === 403)) return null;
    throw e;
  }
});

/** Like getCurrentUser, but treats an unreachable API as logged out. For chrome like the header. */
export async function getCurrentUserSafe(): Promise<User | null> {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

export function isAdmin(user: User | null | undefined): boolean {
  return !!user?.roles.includes("ADMIN");
}

/** Only allow relative, same-site redirect targets. */
export function safeNext(next: string | null | undefined, fallback = "/account"): string {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

export async function requireUser(nextPath: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** For admin pages: redirects anonymous visitors to login; returns null for non-admins. */
export async function requireAdminPage(nextPath: string): Promise<User | null> {
  const user = await requireUser(nextPath);
  return isAdmin(user) ? user : null;
}

/** For admin Server Actions: throws unless the caller is an admin. */
export async function assertAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!isAdmin(user)) throw new Error("Admin access required");
  return user!;
}
