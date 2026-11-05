import "server-only";
import { api } from "./api";
import type { SavedAddress } from "./types";

/** The signed-in customer's saved addresses, default first. Never cached. */
export async function getMyAddresses(): Promise<SavedAddress[]> {
  return api<SavedAddress[]>("/api/v1/me/addresses");
}

/** Like getMyAddresses, but an unreachable API just means "no saved addresses" (checkout stays usable). */
export async function getMyAddressesSafe(): Promise<SavedAddress[]> {
  try {
    return await getMyAddresses();
  } catch {
    return [];
  }
}
