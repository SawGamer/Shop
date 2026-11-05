import { describe, expect, it } from "vitest";
import { hasActiveFilters, parseSearchParams, searchHref, toApiQuery, toggle } from "./search";

describe("parseSearchParams", () => {
  it("reads single and repeated params", () => {
    const q = parseSearchParams({ q: " trail ", brand: ["stride", "kova"], size: "42", min: "50", inStock: "true", page: "3" });
    expect(q).toMatchObject({ q: "trail", brand: ["stride", "kova"], size: ["42"], min: "50", inStock: true, page: 3 });
  });

  it("drops invalid values", () => {
    const q = parseSearchParams({ sort: "cheapest", min: "-5", max: "abc", page: "0" });
    expect(q.sort).toBe("");
    expect(q.min).toBe("");
    expect(q.max).toBe("");
    expect(q.page).toBe(1);
  });
});

describe("toApiQuery", () => {
  it("converts prices to cents and pages to 0-based", () => {
    const api = toApiQuery(parseSearchParams({ min: "50", max: "120", page: "2", onSale: "true" }), 24);
    expect(api).toMatchObject({ minPrice: 5000, maxPrice: 12000, page: 1, pageSize: 24, onSale: "true" });
  });
});

describe("searchHref", () => {
  const q = parseSearchParams({ q: "run", brand: "stride", page: "4" });

  it("resets to page 1 when a filter changes", () => {
    expect(searchHref("/search", q, { size: ["42"] })).toBe("/search?q=run&brand=stride&size=42");
  });

  it("keeps an explicit page", () => {
    expect(searchHref("/search", q, { page: 2 })).toBe("/search?q=run&brand=stride&page=2");
  });

  it("omits the category on category pages", () => {
    const cat = { ...q, category: "boots" };
    expect(searchHref("/c/boots", cat, {}, true)).toBe("/c/boots?q=run&brand=stride");
  });
});

describe("helpers", () => {
  it("toggles values", () => {
    expect(toggle(["a"], "b")).toEqual(["a", "b"]);
    expect(toggle(["a", "b"], "a")).toEqual(["b"]);
  });
  it("detects active filters", () => {
    expect(hasActiveFilters(parseSearchParams({ q: "x" }))).toBe(false);
    expect(hasActiveFilters(parseSearchParams({ color: "black" }))).toBe(true);
    expect(hasActiveFilters(parseSearchParams({ category: "boots" }), true)).toBe(false);
  });
});
