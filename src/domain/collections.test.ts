import { describe, it, expect } from "vitest";
import { collectedThisMonth } from "./collections";
import type { Payment } from "../types/domain";

describe("collectedThisMonth", () => {
  it("sums payments matching the same year and month", () => {
    const reference = new Date("2024-05-15T12:00:00");
    const payments: Payment[] = [
      { id: "1", loanId: "l1", type: "full", amountCents: 1000, method: "cash", daysLate: 0, paidAt: "2024-05-01T00:00:00" },
      { id: "2", loanId: "l1", type: "interest", amountCents: 2000, method: "cash", daysLate: 0, paidAt: "2024-05-31T23:59:59" },
      { id: "3", loanId: "l1", type: "partial", amountCents: 3000, method: "cash", daysLate: 0, paidAt: "2024-04-30T23:59:59" }, // previous month
      { id: "4", loanId: "l1", type: "full", amountCents: 4000, method: "cash", daysLate: 0, paidAt: "2025-05-15T12:00:00" }, // next year
    ];

    expect(collectedThisMonth(payments, reference)).toBe(3000); // 1000 + 2000
  });

  it("handles empty payments array", () => {
    expect(collectedThisMonth([], new Date())).toBe(0);
  });
});
