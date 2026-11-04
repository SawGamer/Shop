import "server-only";
import { ApiError } from "./api";
import { fail, type ActionState } from "./action-state";

/** Turns any thrown error into a message a shopper or admin can act on. */
export function toActionState(e: unknown, fallback = "That didn't work. Try again."): ActionState {
  if (!(e instanceof ApiError)) {
    if (e instanceof Error && e.message === "Admin access required") {
      return fail("You need an admin account to do that.");
    }
    return fail(fallback);
  }
  switch (e.code) {
    case "VALIDATION_FAILED":
      return fail(
        Object.keys(e.errors).length ? "Check the highlighted fields." : e.detail || "Check the form and try again.",
        e.errors,
      );
    case "INVALID_CREDENTIALS":
      return fail("That email and password don't match an account.");
    case "EMAIL_TAKEN":
      return fail("An account with this email already exists. Log in instead.", {
        email: "Already registered",
      });
    case "INSUFFICIENT_STOCK":
      return {
        status: "error",
        message: e.detail || "There isn't enough stock for that quantity.",
        stock: e.items,
      };
    case "EMPTY_CART":
      return fail("Your cart is empty. Add something before checking out.");
    case "INVALID_TOKEN":
      return fail("This link has expired or was already used.");
    case "UNAUTHORIZED":
      return fail("Your session has ended. Log in again to continue.");
    case "FORBIDDEN":
      return fail("You don't have access to do that.");
    case "NOT_FOUND":
      return fail(e.detail || "That item no longer exists.");
    case "INVALID_STATE_TRANSITION":
      return fail(e.detail || "That status change isn't allowed for this order.");
    case "CONFLICT":
      return fail(e.detail || "That clashes with existing data, for example a slug or SKU already in use.");
    case "PAYMENT_PROVIDER_ERROR":
      return fail("The payment provider didn't respond. Try again in a moment.");
    case "API_UNAVAILABLE":
      return fail("The shop service can't be reached right now. Try again in a moment.");
    default:
      return fail(e.detail || fallback);
  }
}
