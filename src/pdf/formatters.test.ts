import { describe, it, expect } from "vitest";
import { paymentTypeLabel, paymentMethodLabel, formatDate, formatDateTime, isCurrentMonth, ratingLabel } from "./formatters";

describe("pdf formatters", () => {
  it("paymentTypeLabel maps all payment types", () => {
    expect(paymentTypeLabel("full")).toBe("Pago total");
    expect(paymentTypeLabel("interest")).toBe("Solo interés (renovación)");
    expect(paymentTypeLabel("partial")).toBe("Abono parcial");
  });

  it("paymentMethodLabel maps all payment methods", () => {
    expect(paymentMethodLabel("cash")).toBe("Efectivo");
    expect(paymentMethodLabel("digital")).toBe("Yape/Plin");
  });

  it("formatDate renders a long Spanish date", () => {
    const result = formatDate("2026-08-14T12:00:00.000Z");
    expect(result).toContain("agosto");
    expect(result).toContain("2026");
    expect(result).toMatch(/^\d{1,2} de agosto de 2026$/);
  });

  it("formatDateTime renders a long Spanish date with 12h time", () => {
    const result = formatDateTime("2026-08-14T20:45:00.000Z");
    expect(result).toContain("agosto");
    expect(result).toContain("2026");
    expect(result).toMatch(/^\d{1,2} de agosto de 2026, \d{1,2}:\d{2} [ap]\.m\.$/);
  });

  it("isCurrentMonth true para fecha del mismo mes/año que la referencia", () => {
    const reference = new Date("2026-08-15T12:00:00.000Z");
    expect(isCurrentMonth("2026-08-02T12:00:00.000Z", reference)).toBe(true);
    expect(isCurrentMonth("2026-08-28T12:00:00.000Z", reference)).toBe(true);
  });

  it("isCurrentMonth false para fecha de otro mes u otro año", () => {
    const reference = new Date("2026-08-15T12:00:00.000Z");
    expect(isCurrentMonth("2026-07-15T12:00:00.000Z", reference)).toBe(false);
    expect(isCurrentMonth("2025-08-15T12:00:00.000Z", reference)).toBe(false);
  });

  it("ratingLabel mapea todas las clasificaciones", () => {
    expect(ratingLabel("good")).toBe("Buen pagador");
    expect(ratingLabel("slow")).toBe("Se demora");
    expect(ratingLabel("bad")).toBe("Mal pagador");
  });
});
