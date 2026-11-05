import { describe, expect, it } from "vitest";
import { buildCompareRows } from "./compare-rows";
import type { Spec } from "./types";

const spec = (key: string, label: string, value: string, group: string | null = "Display"): Spec => ({
  key,
  label,
  value,
  group,
  filterable: false,
});

describe("buildCompareRows", () => {
  it("lines up every spec label across products and marks identical rows", () => {
    const groups = buildCompareRows([
      [spec("screen_size", "Screen size", "6.4″"), spec("ram", "RAM", "8 GB", "Performance")],
      [spec("screen_size", "Screen size", "6.4″"), spec("weight", "Weight", "180 g", null)],
    ]);
    expect(groups.map((g) => g.group)).toEqual(["Display", "Performance", "General"]);
    expect(groups[0].rows[0]).toMatchObject({ label: "Screen size", values: ["6.4″", "6.4″"], same: true });
    expect(groups[1].rows[0]).toMatchObject({ label: "RAM", values: ["8 GB", null], same: false });
    expect(groups[2].rows[0]).toMatchObject({ values: [null, "180 g"], same: false });
  });
});
