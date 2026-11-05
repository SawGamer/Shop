"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { apiRequest } from "@/lib/api";
import { fail, ok, str, type ActionState } from "@/lib/action-state";
import { toActionState } from "@/lib/action-errors";
import { COOKIE_ACCESS } from "@/lib/config";
import { syncCartCookie } from "@/lib/session";
import { getProduct } from "@/lib/data";
import type { Cart } from "@/lib/types";

async function loggedIn(): Promise<boolean> {
  return (await cookies()).has(COOKIE_ACCESS);
}

function parseQuantity(raw: string, min: number): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n >= min && n <= 99 ? n : null;
}

export async function addToCart(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const variantId = str(fd, "variantId");
  const quantity = parseQuantity(str(fd, "quantity") || "1", 1);
  if (!variantId) return fail("Choose a size first.");
  if (quantity === null) return fail("Choose a quantity between 1 and 99.");

  try {
    const user = await loggedIn();
    const { data, headers } = await apiRequest<Cart>("/api/v1/cart/items", {
      method: "POST",
      body: { variantId, quantity },
      cart: true,
    });
    await syncCartCookie(data, headers, user);
  } catch (e) {
    return toActionState(e, "We couldn't add that to your cart.");
  }
  refresh();
  return ok("Added to your cart.");
}

export async function updateCartItem(
  variantId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const quantity = parseQuantity(str(fd, "quantity"), 0);
  if (quantity === null) return fail("Choose a quantity between 0 and 99.");
  try {
    const user = await loggedIn();
    const { data, headers } = await apiRequest<Cart>(
      `/api/v1/cart/items/${encodeURIComponent(variantId)}`,
      { method: "PUT", body: { quantity }, cart: true },
    );
    await syncCartCookie(data, headers, user);
  } catch (e) {
    return toActionState(e, "We couldn't update that item.");
  }
  refresh();
  return ok();
}

export async function removeCartItem(variantId: string): Promise<void> {
  try {
    const user = await loggedIn();
    const { data, headers } = await apiRequest<Cart>(
      `/api/v1/cart/items/${encodeURIComponent(variantId)}`,
      { method: "DELETE", cart: true },
    );
    await syncCartCookie(data, headers, user);
  } catch {
    // The page re-renders from the API either way; a failed remove simply shows the item again.
  }
  refresh();
}

export async function clearCart(): Promise<void> {
  try {
    await apiRequest<void>("/api/v1/cart", { method: "DELETE", cart: true });
  } catch {
    // Ignore: the cart view reflects whatever the API returns next.
  }
  refresh();
}

/**
 * One-tap "Add" from a product card (grocery design): adds one of the first in-stock variant.
 * Cards only know the product, so the variant is picked here on the server.
 */
export async function quickAddToCart(slug: string, _prev: ActionState): Promise<ActionState> {
  try {
    const product = await getProduct(slug);
    const variant = product?.variants.find((v) => v.inStock);
    if (!variant) return fail("This one is sold out.");
    const user = await loggedIn();
    const { data, headers } = await apiRequest<Cart>("/api/v1/cart/items", {
      method: "POST",
      body: { variantId: variant.id, quantity: 1 },
      cart: true,
    });
    await syncCartCookie(data, headers, user);
  } catch (e) {
    return toActionState(e, "We couldn't add that to your basket.");
  }
  refresh();
  return ok("Added");
}
