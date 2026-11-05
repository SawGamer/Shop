import { describe, expect, it } from "vitest";
import { compareSizes, describeSize, hasSwatch } from "../colors";
import { getTheme, isThemeId, safeHex, THEME_IDS, THEMES } from "./index";

describe("theme registry", () => {
  it("has one complete theme per id", () => {
    expect(Object.keys(THEMES).sort()).toEqual([...THEME_IDS].sort());
    for (const id of THEME_IDS) {
      const t = THEMES[id];
      expect(t.id).toBe(id);
      for (const value of [t.name, t.description, t.themeColor, ...Object.values(t.preview)]) {
        expect(value).toBeTruthy();
      }
      for (const [key, value] of Object.entries(t.labels)) {
        if (key === "noun") {
          expect(value).toHaveLength(2);
        } else {
          expect(value, `${id}.labels.${key}`).toBeTruthy();
        }
      }
      for (const [key, value] of Object.entries(t.copy)) {
        if (key === "announcement") continue; // optional
        expect(value, `${id}.copy.${key}`).toBeTruthy();
      }
      expect(t.layout.header).toBeTruthy();
      expect(t.layout.card).toBeTruthy();
      expect(typeof t.layout.megaMenu).toBe("boolean");
      expect(typeof t.layout.compareOnCards).toBe("boolean");
      expect(t.themeColor).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("labels the variant options the way docs/demo-catalogs.md says", () => {
    expect([THEMES.footwear.labels.size, THEMES.footwear.labels.color]).toEqual(["Size (EU)", "Colour"]);
    expect([THEMES.electronics.labels.size, THEMES.electronics.labels.color]).toEqual(["Capacity", "Colour"]);
    expect([THEMES.grocery.labels.size, THEMES.grocery.labels.color]).toEqual(["Pack size", "Variety"]);
    expect([THEMES.home.labels.size, THEMES.home.labels.color]).toEqual(["Size", "Finish"]);
    expect([THEMES.beauty.labels.size, THEMES.beauty.labels.color]).toEqual(["Size", "Shade"]);
  });

  it("falls back to footwear for unknown or missing ids", () => {
    expect(getTheme("electronics").id).toBe("electronics");
    expect(getTheme("cyberpunk").id).toBe("footwear");
    expect(getTheme(null).id).toBe("footwear");
    expect(getTheme(undefined).id).toBe("footwear");
    expect(isThemeId("home")).toBe(true);
    expect(isThemeId("HOME")).toBe(false);
  });

  it("accepts only #RRGGBB accent colours", () => {
    expect(safeHex("#A3405F")).toBe("#a3405f");
    expect(safeHex("red")).toBeNull();
    expect(safeHex("#fff")).toBeNull();
    expect(safeHex("#123456; background: url(x)")).toBeNull();
    expect(safeHex(null)).toBeNull();
  });
});

describe("demo colour names", () => {
  // Every colour, finish and shade used by the demo catalogs (grocery "varieties" like Espresso/Filter are not colours).
  const names = [
    // electronics
    "Midnight", "Glacier", "Coral", "Silver", "Space Grey", "Black", "Sand", "White", "Teal", "Red", "Graphite", "Lilac",
    "Chalk", "Charcoal",
    // home
    "Oat Linen", "Forest Velvet", "Cognac Leather", "Natural Oak", "Smoked Oak", "Brass", "Opal", "Clay", "Walnut",
    "Ivory", "Sage", "Natural", "Terracotta",
    // beauty
    "Rose Nude", "Classic Red", "Berry", "Mauve", "Clear", "Peach", "Plum", "Porcelain", "Honey", "Espresso", "Peony",
    "Apricot",
    // footwear
    "Sky Blue", "Nude", "Grey", "Royal Blue", "Black/Volt", "Tobacco", "Olive", "Olive/Brown", "Blue", "Red/Black",
    "Yellow/Black", "Pink/Purple", "Wheat Gold", "Emerald",
  ];
  it.each(names)("has a swatch for %s", (name) => {
    expect(hasSwatch(name)).toBe(true);
  });
});

describe("option ordering", () => {
  const sort = (values: string[]) => [...values].sort(compareSizes);
  it("orders by quantity and unit", () => {
    expect(sort(["1 TB", "256 GB", "512 GB"])).toEqual(["256 GB", "512 GB", "1 TB"]);
    expect(sort(["1 kg", "250 g"])).toEqual(["250 g", "1 kg"]);
    expect(sort(["1 l", "500 ml"])).toEqual(["500 ml", "1 l"]);
    expect(sort(["10 pack", "6 pack"])).toEqual(["6 pack", "10 pack"]);
    expect(sort(["45", "38", "42.5"])).toEqual(["38", "42.5", "45"]);
    expect(sort(["King", "Single", "Double"])).toEqual(["Single", "Double", "King"]);
    expect(sort(["Large", "Small"])).toEqual(["Small", "Large"]);
  });

  it("describes sizes without a misleading 'Size' prefix", () => {
    expect(describeSize("42")).toBe("Size 42");
    expect(describeSize("128 GB")).toBe("128 GB");
    expect(describeSize(null)).toBeNull();
  });
});
