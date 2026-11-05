import { describe, expect, it } from "vitest";
import { COMPARE_MAX, parseCompare, serializeCompare, toggleCompare } from "./compare";
import { countdownParts, dealStatus, describeCountdown, formatCountdown } from "./deals";
import { parseSearchParams, searchHref, specParams, toApiQuery, toggleSpec } from "./search";

describe("countdown", () => {
  const now = Date.UTC(2026, 10, 5, 12, 0, 0);

  it("formats days and a clock", () => {
    expect(formatCountdown(now + ((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000, now)).toBe("2d 03:04:05");
    expect(formatCountdown(now + 59_000, now)).toBe("00:00:59");
  });

  it("says when it has ended", () => {
    expect(formatCountdown(now - 1, now)).toBe("Deal ended");
    expect(formatCountdown(now, now)).toBe("Deal ended");
    expect(countdownParts("not a date", now).ended).toBe(true);
  });

  it("reads well for screen readers", () => {
    expect(describeCountdown(now + (26 * 3600 + 60) * 1000, now)).toBe("1 day, 2 hours and 1 minute left");
    expect(describeCountdown(now + 5 * 60_000, now)).toBe("5 minutes left");
  });

  it("knows whether a deal is scheduled, running or ended", () => {
    const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();
    expect(dealStatus({ startsAt: iso(3600_000), endsAt: iso(7200_000) }, now)).toBe("scheduled");
    expect(dealStatus({ startsAt: iso(-3600_000), endsAt: iso(3600_000) }, now)).toBe("running");
    expect(dealStatus({ startsAt: iso(-7200_000), endsAt: iso(-1) }, now)).toBe("ended");
  });
});

describe("compare cookie", () => {
  it("dedupes, drops junk and keeps at most four", () => {
    expect(parseCompare("a,b,a, c ,BAD SLUG,d,e,f")).toEqual(["a", "b", "c", "d"]);
    expect(parseCompare("x%2Cy")).toEqual(["x", "y"]);
    expect(parseCompare(undefined)).toEqual([]);
    expect(serializeCompare(["one", "one", "two"])).toBe("one,two");
  });

  it("toggles and refuses a fifth product", () => {
    expect(toggleCompare(["a"], "b")).toEqual({ slugs: ["a", "b"], full: false });
    expect(toggleCompare(["a", "b"], "a")).toEqual({ slugs: ["b"], full: false });
    const full = ["a", "b", "c", "d"];
    expect(full).toHaveLength(COMPARE_MAX);
    expect(toggleCompare(full, "e")).toEqual({ slugs: full, full: true });
  });
});

describe("spec filters", () => {
  const q = parseSearchParams({ q: "laptop", "spec.ram": ["16 GB", "8 GB", "16 GB"], "spec.Bad Key": "x", deal: "true" });

  it("parses spec.<key> params, ignoring invalid keys and duplicates", () => {
    expect(q.specs).toEqual({ ram: ["16 GB", "8 GB"] });
    expect(q.deal).toBe(true);
  });

  it("builds stable URL and API params", () => {
    const withScreen = toggleSpec(q.specs, "screen_size", "14″");
    expect(specParams(withScreen)).toEqual([
      ["spec.ram", "16 GB"],
      ["spec.ram", "8 GB"],
      ["spec.screen_size", "14″"],
    ]);
    expect(searchHref("/search", { ...q, specs: withScreen })).toBe(
      "/search?q=laptop&deal=true&spec.ram=16+GB&spec.ram=8+GB&spec.screen_size=14%E2%80%B3",
    );
    expect(toApiQuery(q)).toMatchObject({ deal: "true", "spec.ram": ["16 GB", "8 GB"] });
  });

  it("removes a key when its last value is untoggled", () => {
    expect(toggleSpec({ ram: ["8 GB"] }, "ram", "8 GB")).toEqual({});
  });
});
