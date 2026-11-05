// Swatch colours for colour, finish and shade names. Unknown names render without a swatch.
const SWATCHES: Record<string, string> = {
  // basics
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
  "sky blue": "#9cc8e8",
  "royal blue": "#2747b8",
  red: "#c8323c",
  burgundy: "#6d1f2b",
  green: "#2f7d4f",
  emerald: "#1f9a63",
  olive: "#6b6d3a",
  khaki: "#b5a77a",
  beige: "#d8c7a6",
  sand: "#d9c49b",
  tan: "#c19a6b",
  tobacco: "#7a5434",
  brown: "#6e4a2f",
  pink: "#eaa0b6",
  purple: "#6c4ab6",
  yellow: "#f2c94c",
  orange: "#e9792e",
  gold: "#c9a24a",
  "wheat gold": "#d1a356",
  nude: "#e3b9a0",
  // electronics
  midnight: "#1c2333",
  glacier: "#dbe8f0",
  coral: "#f07a6a",
  "space grey": "#5b5f66",
  teal: "#178a8a",
  graphite: "#3b3f45",
  lilac: "#c3b1e1",
  chalk: "#ecebe6",
  charcoal: "#33363b",
  // home finishes
  "oat linen": "#ddd2bd",
  "forest velvet": "#2f4a3a",
  "cognac leather": "#9a5a2e",
  "natural oak": "#c9a274",
  "smoked oak": "#6e5541",
  oak: "#c9a274",
  walnut: "#5d3f2a",
  brass: "#b8954a",
  opal: "#eef0ec",
  clay: "#b9785c",
  ivory: "#f3ecdc",
  sage: "#a3b18f",
  natural: "#d6c3a0",
  terracotta: "#c46a45",
  linen: "#e7dcc8",
  // beauty shades
  "rose nude": "#c98d86",
  "classic red": "#b3162c",
  berry: "#7b1f45",
  mauve: "#a8758a",
  clear: "#f5eef0",
  peach: "#f2b195",
  plum: "#6d2f4f",
  porcelain: "#f1dccb",
  honey: "#c89060",
  espresso: "#4b2e22",
  peony: "#e58aa2",
  apricot: "#f0a477",
  rose: "#d98a9c",
};

export function swatchFor(color: string | null | undefined): string | null {
  if (!color) return null;
  const key = color.trim().toLowerCase();
  if (SWATCHES[key]) return SWATCHES[key];
  // "Black/Volt", "Red / Black": use the first colour.
  const first = key.split("/")[0]?.trim();
  return (first && SWATCHES[first]) || null;
}

/** Names with a swatch (used by tests). */
export function hasSwatch(color: string): boolean {
  return swatchFor(color) !== null;
}

// Option values like "42", "128 GB", "1 TB", "500 g", "1 l", "6 pack", "160 × 230 cm", "Small", "King".
const UNITS: Record<string, [family: number, factor: number]> = {
  g: [1, 1],
  kg: [1, 1000],
  ml: [2, 1],
  cl: [2, 10],
  l: [2, 1000],
  mb: [3, 1 / 1024],
  gb: [3, 1],
  tb: [3, 1024],
  mm: [4, 1],
  cm: [4, 10],
  m: [4, 1000],
  pack: [5, 1],
  pcs: [5, 1],
};

const WORD_ORDER = ["xxs", "xs", "s", "small", "m", "medium", "l", "large", "xl", "xxl", "single", "double", "queen", "king"];

function rank(value: string): [number, number] | null {
  const v = value.trim().toLowerCase().replace(",", ".");
  const word = WORD_ORDER.indexOf(v);
  if (word >= 0) return [10, word];
  const m = /^(\d+(?:\.\d+)?)\s*(?:[×x]\s*\d+(?:\.\d+)?\s*)?([a-z]+)?/.exec(v);
  if (!m) return null;
  const n = Number.parseFloat(m[1]);
  const unit = m[2] ? UNITS[m[2]] : undefined;
  if (m[2] && !unit) return [6, n];
  return unit ? [unit[0], n * unit[1]] : [0, n];
}

/** Sorts sizes numerically and unit-aware ("512 GB" < "1 TB", "250 g" < "1 kg"), then alphabetically. */
export function compareSizes(a: string, b: string): number {
  const ra = rank(a);
  const rb = rank(b);
  if (ra && rb) {
    if (ra[0] !== rb[0]) return ra[0] - rb[0];
    if (ra[1] !== rb[1]) return ra[1] - rb[1];
  } else if (ra || rb) {
    return ra ? -1 : 1;
  }
  return a.localeCompare(b, undefined, { numeric: true });
}

/** "Size 42" for bare numbers (shoe sizes); values with a unit or a word ("128 GB", "Large") stand alone. */
export function describeSize(size: string | null | undefined): string | null {
  if (!size) return null;
  return /^\d+([.,]\d+)?$/.test(size.trim()) ? `Size ${size}` : size;
}
