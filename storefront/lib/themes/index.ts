import { beauty } from "./beauty";
import { electronics } from "./electronics";
import { footwear } from "./footwear";
import { grocery } from "./grocery";
import { home } from "./home";
import { THEME_IDS, type Theme, type ThemeId } from "./types";

export { THEME_IDS };
export type { Theme, ThemeId };

export const THEMES: Record<ThemeId, Theme> = { footwear, electronics, grocery, home, beauty };

export const DEFAULT_THEME: ThemeId = "footwear";

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

/** Unknown or missing ids fall back to the footwear design. */
export function getTheme(id: string | null | undefined): Theme {
  return isThemeId(id) ? THEMES[id] : THEMES[DEFAULT_THEME];
}

/** "#RRGGBB" only; anything else is ignored so it can't break the CSS. */
export function safeHex(value: string | null | undefined): string | null {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : null;
}
