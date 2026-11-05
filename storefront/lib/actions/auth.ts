"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { api, apiRequest, isApiError } from "@/lib/api";
import { fail, formValues, ok, str, withValues, type ActionState } from "@/lib/action-state";
import { toActionState } from "@/lib/action-errors";
import { safeNext } from "@/lib/auth";
import { COOKIE_CART } from "@/lib/config";
import { clearAuthCookies, clearCartCookie, getRefreshToken, setAuthCookies } from "@/lib/session";
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

/** Shown whatever the API answers, so the form can't be used to find out which emails have an account. */
const FORGOT_PASSWORD_MESSAGE =
  "If an account exists for that address, we've sent a link to reset the password. It is valid for one hour.";

export async function forgotPassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email").toLowerCase();
  if (!EMAIL_RE.test(email)) return fail("Enter a valid email address.", { email: "Enter a valid email address" }, { email });
  try {
    await api<void>("/api/v1/auth/forgot-password", { method: "POST", body: { email }, auth: false });
  } catch (e) {
    // Only "we could not even reach the service" is shown: it says nothing about the account.
    if (isApiError(e, "API_UNAVAILABLE")) {
      return fail("We can't reach the shop right now. Try again in a moment.", undefined, { email });
    }
  }
  return ok(FORGOT_PASSWORD_MESSAGE);
}

export async function resetPassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  // The token comes from the link in the email. It is only ever sent to the API: never stored in a cookie,
  // never echoed back into the form and never logged.
  const token = str(fd, "token");
  const password = (fd.get("password") as string | null) ?? "";
  const confirm = (fd.get("confirmPassword") as string | null) ?? "";
  if (!token) return fail("This link is incomplete. Request a new one.", { token: "Link is incomplete" });

  const fieldErrors: Record<string, string> = {};
  if (password.length < 8 || password.length > 72) fieldErrors.password = "Use 8 to 72 characters";
  if (confirm !== password) fieldErrors.confirmPassword = "The two passwords don't match";
  if (Object.keys(fieldErrors).length) return fail("Check the highlighted fields.", fieldErrors);

  try {
    await api<void>("/api/v1/auth/reset-password", { method: "POST", body: { token, password }, auth: false });
  } catch (e) {
    if (isApiError(e, "INVALID_TOKEN")) {
      return fail("This link has expired or was already used.", { token: "This link has expired or was already used" });
    }
    return toActionState(e, "We couldn't change your password.");
  }
  redirect("/login?reset=1");
}

export async function deleteAccount(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const password = (fd.get("password") as string | null) ?? "";
  const confirmed = fd.get("confirm") === "on";
  const fieldErrors: Record<string, string> = {};
  if (!password) fieldErrors.password = "Enter your password to confirm";
  if (!confirmed) fieldErrors.confirm = "Tick the box to confirm";
  if (Object.keys(fieldErrors).length) return fail("Check the highlighted fields.", fieldErrors);

  try {
    await api<void>("/api/v1/me", { method: "DELETE", body: { password } });
  } catch (e) {
    if (isApiError(e, "INVALID_CREDENTIALS")) {
      return fail("That password isn't right.", { password: "That password isn't right" });
    }
    if (isApiError(e, "FORBIDDEN")) return fail("Admin accounts can't be deleted here.");
    return toActionState(e, "We couldn't delete your account.");
  }
  await clearAuthCookies();
  await clearCartCookie();
  redirect("/?deleted=1");
}
