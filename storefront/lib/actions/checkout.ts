"use server";

import { redirect } from "next/navigation";
import { api, isApiError } from "@/lib/api";
import { fail, formValues, optStr, str, withValues, type ActionState } from "@/lib/action-state";
import { toActionState } from "@/lib/action-errors";
import { COUNTRIES } from "@/lib/format";
import type { Address, CheckoutResponse } from "@/lib/types";

const COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));

export async function placeOrder(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const address: Address = {
    fullName: str(fd, "fullName"),
    line1: str(fd, "line1"),
    line2: optStr(fd, "line2"),
    postalCode: str(fd, "postalCode"),
    city: str(fd, "city"),
    country: str(fd, "country").toUpperCase(),
    phone: optStr(fd, "phone"),
  };

  const fieldErrors: Record<string, string> = {};
  if (!address.fullName) fieldErrors.fullName = "Enter the recipient's name";
  if (!address.line1) fieldErrors.line1 = "Enter a street and house number";
  if (!address.postalCode) fieldErrors.postalCode = "Enter a postal code";
  if (!address.city) fieldErrors.city = "Enter a city";
  if (!COUNTRY_CODES.has(address.country)) fieldErrors.country = "Choose a country";
  const values = formValues(fd);
  if (Object.keys(fieldErrors).length) return fail("Check your shipping address.", fieldErrors, values);

  let paymentUrl: string;
  try {
    const res = await api<CheckoutResponse>("/api/v1/checkout", {
      method: "POST",
      body: { shippingAddress: address },
    });
    paymentUrl = res.paymentUrl;
  } catch (e) {
    if (isApiError(e, "UNAUTHORIZED")) redirect("/login?next=/checkout");
    if (isApiError(e, "VALIDATION_FAILED")) {
      // API field paths look like "shippingAddress.city"; map them onto our inputs.
      const mapped: Record<string, string> = {};
      for (const [k, v] of Object.entries(e.errors)) mapped[k.replace(/^shippingAddress\./, "")] = v;
      return fail("Check your shipping address.", mapped, values);
    }
    return withValues(toActionState(e, "We couldn't place your order."), values);
  }
  redirect(paymentUrl);
}

export async function completeTestPayment(
  sessionId: string,
  orderId: string,
  _prev: ActionState,
): Promise<ActionState> {
  try {
    await api<void>(`/api/v1/payments/fake/sessions/${encodeURIComponent(sessionId)}/complete`, {
      method: "POST",
    });
  } catch (e) {
    return toActionState(e, "The test payment didn't go through.");
  }
  redirect(`/checkout/success?order=${encodeURIComponent(orderId)}`);
}

export async function cancelTestPayment(
  sessionId: string,
  orderId: string,
  _prev: ActionState,
): Promise<ActionState> {
  try {
    await api<void>(`/api/v1/payments/fake/sessions/${encodeURIComponent(sessionId)}/cancel`, {
      method: "POST",
    });
  } catch (e) {
    return toActionState(e, "We couldn't cancel the test payment.");
  }
  redirect(`/checkout/cancelled?order=${encodeURIComponent(orderId)}`);
}
