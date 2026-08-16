import { describe, it, expect } from "vitest";
import { diffDays, toIsoDate, addDays, startOfToday, formatShort, formatLong, toLocalIsoDate, parseLocalDate } from "./dates";

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

  it("toLocalIsoDate", () => {
    const d = new Date(2025, 10, 5); // Month is 0-indexed, so 10 is Nov
    expect(toLocalIsoDate(d)).toBe("2025-11-05");
  });

  it("parseLocalDate parsea YYYY-MM-DD como medianoche local, no UTC (sprint 7b-2)", () => {
    const d = parseLocalDate("2026-08-16");
    expect(d.getDate()).toBe(16);
    expect(d.getMonth()).toBe(7); // agosto, 0-indexed
    expect(d.getFullYear()).toBe(2026);
    expect(d.getHours()).toBe(0);
  });

  it("parseLocalDate tolera un timestamp completo tomando solo los primeros 10 chars", () => {
    const d = parseLocalDate("2026-08-16T00:00:00.000Z");
    expect(d.getDate()).toBe(16);
    expect(d.getMonth()).toBe(7);
  });

  it("formatShort(parseLocalDate(...)) no corre la fecha un día hacia atrás (sprint 7b-2)", () => {
    expect(formatShort(parseLocalDate("2026-08-16"))).not.toContain("15");
    expect(formatShort(parseLocalDate("2026-08-16"))).toContain("16");
  });
});
