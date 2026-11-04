"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { api, apiRequest } from "@/lib/api";
import { fail, formValues, ok, str, withValues, type ActionState } from "@/lib/action-state";
import { toActionState } from "@/lib/action-errors";
import { safeNext } from "@/lib/auth";
import { COOKIE_CART } from "@/lib/config";
import { clearAuthCookies, getRefreshToken, setAuthCookies } from "@/lib/session";
import type { AuthResponse, Cart } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Folds the guest cart into the user's cart, then forgets the guest cart id. */
async function mergeGuestCart(token: string): Promise<void> {
  const jar = await cookies();
  const cartId = jar.get(COOKIE_CART)?.value;
  if (!cartId) return;
  try {
    await apiRequest<Cart>("/api/v1/cart", { token, cartId, cart: true });
  } catch {
    // Merging is best effort; the guest cart stays in the API until it expires.
  }
  jar.delete(COOKIE_CART);
}

export async function login(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email").toLowerCase();
  const password = (fd.get("password") as string | null) ?? "";
  const next = safeNext(str(fd, "next"), "/account");

  const fieldErrors: Record<string, string> = {};
  if (!EMAIL_RE.test(email)) fieldErrors.email = "Enter the email you signed up with";
  if (!password) fieldErrors.password = "Enter your password";
  const values = formValues(fd);
  if (Object.keys(fieldErrors).length) return fail("Enter your email and password.", fieldErrors, values);

  let auth: AuthResponse;
  try {
    auth = await api<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
  } catch (e) {
    return withValues(toActionState(e, "We couldn't log you in."), values);
  }
  await setAuthCookies(auth);
  await mergeGuestCart(auth.accessToken);
  redirect(next);
}

export async function register(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email").toLowerCase();
  const password = (fd.get("password") as string | null) ?? "";
  const firstName = str(fd, "firstName");
  const lastName = str(fd, "lastName");
  const next = safeNext(str(fd, "next"), "/account");

  const fieldErrors: Record<string, string> = {};
  if (!EMAIL_RE.test(email)) fieldErrors.email = "Enter a valid email address";
  if (password.length < 8 || password.length > 72) fieldErrors.password = "Use 8 to 72 characters";
  if (!firstName) fieldErrors.firstName = "Enter your first name";
  if (!lastName) fieldErrors.lastName = "Enter your last name";
  const values = formValues(fd);
  if (Object.keys(fieldErrors).length) return fail("Check the highlighted fields.", fieldErrors, values);

  let auth: AuthResponse;
  try {
    auth = await api<AuthResponse>("/api/v1/auth/register", {
      method: "POST",
      body: { email, password, firstName, lastName },
      auth: false,
    });
  } catch (e) {
    return withValues(toActionState(e, "We couldn't create your account."), values);
  }
  await setAuthCookies(auth);
  await mergeGuestCart(auth.accessToken);
  redirect(next);
}

export async function logout(): Promise<void> {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    try {
      await api<void>("/api/v1/auth/logout", {
        method: "POST",
        body: { refreshToken },
        auth: false,
      });
    } catch {
      // Local logout still happens; the refresh token expires on its own.
    }
  }
  await clearAuthCookies();
  redirect("/");
}

export async function verifyEmail(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const token = str(fd, "token");
  if (!token) return fail("This verification link is incomplete. Open the link from your email again.");
  try {
    await api<void>("/api/v1/auth/verify-email", { method: "POST", body: { token }, auth: false });
  } catch (e) {
    return toActionState(e, "We couldn't verify your email.");
  }
  refresh();
  return ok("Your email is verified.");
}

export async function resendVerification(_prev: ActionState): Promise<ActionState> {
  try {
    await api<void>("/api/v1/auth/resend-verification", { method: "POST" });
  } catch (e) {
    return toActionState(e, "We couldn't send a new link.");
  }
  return ok("We sent a new verification link. Check your inbox.");
}
