import { describe, it, expect } from "vitest";
import { filterPaymentsByDate, matchesDateFilter, sumPaymentsCents } from "./paymentsFilter";
import type { Payment } from "../types/domain";

function payment(id: string, paidAt: string, amountCents: number): Payment {
  return { id, loanId: "l1", type: "partial", amountCents, method: "cash", daysLate: 0, paidAt };
}

describe("matchesDateFilter", () => {
  it("returns true for everything when the filter is empty", () => {
    expect(matchesDateFilter("2025-01-01T12:00:00.000", {})).toBe(true);
    expect(matchesDateFilter("2099-12-31T00:00:00.000", {})).toBe(true);
  });

  it("matches only payments within the given month", () => {
    expect(matchesDateFilter("2025-05-01T04:00:00.000", { month: "2025-05" })).toBe(true);
    expect(matchesDateFilter("2025-05-31T23:00:00.000", { month: "2025-05" })).toBe(true);
    expect(matchesDateFilter("2025-04-30T23:00:00.000", { month: "2025-05" })).toBe(false);
    expect(matchesDateFilter("2025-06-01T00:00:00.000", { month: "2025-05" })).toBe(false);
  });

  it("matches payments inside a date range, inclusive on both ends", () => {
    const filter = { dateFrom: "2025-08-10", dateTo: "2025-08-12" };
    expect(matchesDateFilter("2025-08-10T00:00:00.000", filter)).toBe(true);
    expect(matchesDateFilter("2025-08-12T23:59:00.000", filter)).toBe(true);
    expect(matchesDateFilter("2025-08-11T12:00:00.000", filter)).toBe(true);
    expect(matchesDateFilter("2025-08-09T23:59:59.000", filter)).toBe(false);
    expect(matchesDateFilter("2025-08-13T00:00:01.000", filter)).toBe(false);
  });

  it("supports an open-ended range (only dateFrom or only dateTo)", () => {
    expect(matchesDateFilter("2025-08-20T00:00:00.000", { dateFrom: "2025-08-10" })).toBe(true);
    expect(matchesDateFilter("2025-08-01T00:00:00.000", { dateFrom: "2025-08-10" })).toBe(false);
    expect(matchesDateFilter("2025-08-01T00:00:00.000", { dateTo: "2025-08-10" })).toBe(true);
    expect(matchesDateFilter("2025-08-20T00:00:00.000", { dateTo: "2025-08-10" })).toBe(false);
  });
});

describe("filterPaymentsByDate", () => {
  it("returns every payment when there is no active filter", () => {
    const payments = [payment("1", "2025-01-01T00:00:00.000Z", 100), payment("2", "2025-06-01T00:00:00.000Z", 200)];
    expect(filterPaymentsByDate(payments, {})).toHaveLength(2);
  });

  it("filters down to the payments matching the month", () => {
    const payments = [
      payment("1", "2025-05-10T00:00:00.000Z", 100),
      payment("2", "2025-06-10T00:00:00.000Z", 200),
      payment("3", "2025-05-28T00:00:00.000Z", 300),
    ];
    const result = filterPaymentsByDate(payments, { month: "2025-05" });
    expect(result.map((p) => p.id)).toEqual(["1", "3"]);
  });
});

describe("sumPaymentsCents", () => {
  it("sums amountCents across payments", () => {
    const payments = [payment("1", "2025-01-01T00:00:00.000Z", 1000), payment("2", "2025-01-02T00:00:00.000Z", 2500)];
    expect(sumPaymentsCents(payments)).toBe(3500);
  });

  it("returns 0 for an empty list", () => {
    expect(sumPaymentsCents([])).toBe(0);
  });

  it("sums across different months and years without any date filtering (card 'Cobrado' del header Hoy, sprint 7c-4)", () => {
    const payments = [
      payment("1", "2025-01-05T00:00:00.000Z", 1000),
      payment("2", "2025-06-20T00:00:00.000Z", 2000),
      payment("3", "2026-08-23T00:00:00.000Z", 3000),
    ];
    expect(sumPaymentsCents(payments)).toBe(6000);
  });
});
