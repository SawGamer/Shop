import "server-only";
import { cache } from "react";
import { api } from "./api";
import { getTheme, safeHex, type Theme } from "./themes";
import type { ShopSettings } from "./types";

// The shop's name and design. Shared by every visitor, so it's cached briefly under the "shop" tag;
// saving the Design page expires the tag so the new design shows on the next navigation.
const SHOP_TTL = 30;

export const FALLBACK_SHOP: ShopSettings = {
  name: "Z&A",
  tagline: null,
  theme: "footwear",
  accentColor: null,
  logoUrl: null,
  currency: "EUR",
  updatedAt: new Date(0).toISOString(),
};

export async function getShopSettings(): Promise<ShopSettings> {
  return api<ShopSettings>("/api/v1/shop", { auth: false, revalidate: SHOP_TTL, tags: ["shop"] });
}

/** Uncached, for the admin Design page. */
export async function getShopSettingsFresh(): Promise<ShopSettings> {
  return api<ShopSettings>("/api/v1/shop", { auth: false });
}

export type Shop = { settings: ShopSettings; theme: Theme; accent: string | null };

/** Settings plus the resolved design; falls back to the default design when the API is down. */
export const getShop = cache(async (): Promise<Shop> => {
  let settings: ShopSettings;
  try {
    settings = await getShopSettings();
  } catch {
    settings = FALLBACK_SHOP;
  }
  return { settings, theme: getTheme(settings.theme), accent: safeHex(settings.accentColor) };
});
