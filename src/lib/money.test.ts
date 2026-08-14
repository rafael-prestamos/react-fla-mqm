import { describe, it, expect } from "vitest";
import { toCents, fromCents, formatSoles } from "./money";

describe("money", () => {
  it("converts soles to cents", () => {
    expect(toCents(10.5)).toBe(1050);
    expect(toCents(10.50)).toBe(1050);
    expect(toCents(0.99)).toBe(99);
    expect(toCents(1500)).toBe(150000);
    expect(toCents(20.5)).toBe(2050);
    expect(toCents(19.999)).toBe(2000);
  });

  it("handles non-finite inputs in toCents", () => {
    expect(toCents(NaN)).toBe(0);
    expect(toCents(Infinity)).toBe(0);
    expect(toCents(-Infinity)).toBe(0);
  });

  it("fromCents", () => {
    expect(fromCents(2050)).toBe(20.5);
  });

  it("formatSoles", () => {
    expect(formatSoles(150000)).toBe("S/ 1,500.00");
  });
});
