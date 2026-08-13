import { describe, it, expect } from "vitest";
import { toCents, fromCents, formatSoles } from "./money";

describe("money", () => {
  it("toCents", () => {
    expect(toCents(1500)).toBe(150000);
    expect(toCents(20.5)).toBe(2050);
    expect(toCents(19.999)).toBe(2000);
  });

  it("fromCents", () => {
    expect(fromCents(2050)).toBe(20.5);
  });

  it("formatSoles", () => {
    expect(formatSoles(150000)).toBe("S/ 1,500.00");
  });
});
