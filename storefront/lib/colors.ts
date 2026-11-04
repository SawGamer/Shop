// Swatch colours for common colour names. Unknown names render without a swatch.
const SWATCHES: Record<string, string> = {
  black: "#111318",
  white: "#ffffff",
  "off-white": "#f4f1e8",
  cream: "#efe6cf",
  grey: "#9097a3",
  gray: "#9097a3",
  silver: "#c4c8cf",
  navy: "#1d2a57",
  blue: "#2f5bd3",
  "light blue": "#9cc2f0",
  red: "#c8323c",
  burgundy: "#6d1f2b",
  green: "#2f7d4f",
  olive: "#6b6d3a",
  khaki: "#b5a77a",
  beige: "#d8c7a6",
  sand: "#d9c49b",
  tan: "#c19a6b",
  brown: "#6e4a2f",
  pink: "#eaa0b6",
  purple: "#6c4ab6",
  yellow: "#f2c94c",
  orange: "#e9792e",
  gold: "#c9a24a",
};

export function swatchFor(color: string | null | undefined): string | null {
  if (!color) return null;
  return SWATCHES[color.trim().toLowerCase()] ?? null;
}

/** Sizes like "42", "42.5", "US 9" sort numerically where possible. */
export function compareSizes(a: string, b: string): number {
  const na = Number.parseFloat(a.replace(",", "."));
  const nb = Number.parseFloat(b.replace(",", "."));
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return a.localeCompare(b, undefined, { numeric: true });
}
