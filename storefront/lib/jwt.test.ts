import { describe, expect, it } from "vitest";
import { decodeJwtExp, isExpiringSoon } from "./jwt";

function token(payload: object): string {
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${enc({ alg: "RS256" })}.${enc(payload)}.signature`;
}

describe("decodeJwtExp", () => {
  it("reads exp from a base64url payload", () => {
    expect(decodeJwtExp(token({ sub: "u1", exp: 1_900_000_000 }))).toBe(1_900_000_000);
  });

  it("handles payloads that need base64url characters", () => {
    // "~~~" encodes to characters that differ between base64 and base64url.
    expect(decodeJwtExp(token({ n: "~~~?>>", exp: 42 }))).toBe(42);
  });

  it("returns null for malformed tokens", () => {
    expect(decodeJwtExp(undefined)).toBeNull();
    expect(decodeJwtExp("not-a-jwt")).toBeNull();
    expect(decodeJwtExp("a.b.c")).toBeNull();
    expect(decodeJwtExp(token({ sub: "no-exp" }))).toBeNull();
  });
});

describe("isExpiringSoon", () => {
  const now = 1_800_000_000_000;
  it("is false for a token with plenty of time left", () => {
    expect(isExpiringSoon(token({ exp: now / 1000 + 600 }), 60, now)).toBe(false);
  });
  it("is true inside the skew window or when unreadable", () => {
    expect(isExpiringSoon(token({ exp: now / 1000 + 30 }), 60, now)).toBe(true);
    expect(isExpiringSoon(token({ exp: now / 1000 - 1 }), 60, now)).toBe(true);
    expect(isExpiringSoon(null, 60, now)).toBe(true);
  });
});
