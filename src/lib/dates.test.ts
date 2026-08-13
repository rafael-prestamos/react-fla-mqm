import { describe, it, expect } from "vitest";
import { diffDays, toIsoDate, addDays, startOfToday, formatShort, formatLong } from "./dates";

describe("dates", () => {
  it("diffDays", () => {
    expect(diffDays(new Date("2025-01-31T00:00:00Z"), new Date("2025-01-01T00:00:00Z"))).toBe(30);
  });

  it("toIsoDate and addDays", () => {
    expect(toIsoDate(addDays(new Date("2025-01-01T00:00:00Z"), 30))).toBe("2025-01-31");
  });

  it("startOfToday", () => {
    expect(startOfToday().getHours()).toBe(0);
  });

  it("formatShort and formatLong do not return empty string", () => {
    const d = new Date("2025-01-01T00:00:00Z");
    expect(formatShort(d).length).toBeGreaterThan(0);
    expect(formatLong(d).length).toBeGreaterThan(0);
  });
});
