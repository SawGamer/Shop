// A storefront design. Colours, fonts and radii live in app/globals.css under [data-theme="<id>"];
// this file describes everything else a design changes: wording, option labels and layout choices.

export const THEME_IDS = ["footwear", "electronics", "grocery", "home", "beauty"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export type HeaderVariant = "classic" | "tech" | "market" | "editorial" | "boutique";
export type CardVariant = "box" | "tech" | "market" | "portrait" | "boutique";

export type Theme = {
  id: ThemeId;
  name: string;
  /** One line for the admin design gallery. */
  description: string;
  /** Browser UI colour (viewport theme-color). */
  themeColor: string;
  /** Mini-mock colours and font for the admin gallery (the real tokens are in globals.css). */
  preview: { paper: string; ink: string; accent: string; highlight: string; font: string; sample: string };

  labels: {
    /** Name of the variant `size` field, e.g. "Size (EU)", "Capacity". */
    size: string;
    /** Short prefix for chips and screen readers, e.g. "Size", "Capacity". */
    sizeShort: string;
    /** Name of the variant `color` field, e.g. "Colour", "Shade". */
    color: string;
    /** "Choose a size" style prompt on the product page. */
    choose: string;
    /** Result count noun: [singular, plural]. */
    noun: [string, string];
    searchPlaceholder: string;
    searchLabel: string;
    /** "All shoes" / "All products". */
    allProducts: string;
  };

  copy: {
    heroEyebrow: string;
    heroTitle: string;
    heroSub: string;
    primaryCta: string;
    secondaryCta: string;
    categoriesTitle: string;
    newTitle: string;
    newLink: string;
    saleTitle: string;
    saleLink: string;
    emptyCatalog: string;
    noResults: string;
    noResultsHint: string;
    emptyCart: string;
    emptyCartHint: string;
    firstOrder: string;
    aboutProduct: string;
    footerLine: string;
    metaDescription: string;
    /** Optional thin bar above the header. */
    announcement: string | null;
  };

  layout: {
    header: HeaderVariant;
    card: CardVariant;
    /** Size options as a big label grid (shoe sizes) or as chips ("128 GB", "500 g"). */
    sizeOptions: "grid" | "chips";
    /** Colour options as text chips or as round swatches. */
    colorOptions: "chips" | "swatches";
    /** Product page buy box: the bordered "box label" or a soft card. */
    buyBox: "label" | "card";
    /** Department mega-menu instead of the simple category strip (big catalogues). */
    megaMenu: boolean;
    /** Show "Compare" toggles on product cards (the product page always has one). */
    compareOnCards: boolean;
  };
};
