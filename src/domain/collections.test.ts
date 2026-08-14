import { describe, it, expect } from "vitest";
import { collectedThisMonth } from "./collections";
import type { Payment } from "../types/domain";

describe("collectedThisMonth", () => {
  it("sums payments for the current month and year", () => {
    const now = new Date("2024-02-15T12:00:00Z");
    const payments: Payment[] = [
      { id: "1", loanId: "l1", installmentId: "i1", amountCents: 1000, method: "cash", daysLate: 0, paidAt: "2024-02-01T10:00:00Z" },
      { id: "2", loanId: "l1", installmentId: "i2", amountCents: 2000, method: "cash", daysLate: 0, paidAt: "2024-02-28T10:00:00Z" },
      { id: "3", loanId: "l1", installmentId: "i3", amountCents: 3000, method: "cash", daysLate: 0, paidAt: "2024-01-31T10:00:00Z" }, // wrong month
      { id: "4", loanId: "l1", installmentId: "i4", amountCents: 4000, method: "cash", daysLate: 0, paidAt: "2023-02-15T10:00:00Z" }  // wrong year
    ];

    expect(collectedThisMonth(payments, now)).toBe(3000);
  });

  it("returns 0 if no payments", () => {
    expect(collectedThisMonth([], new Date())).toBe(0);
  });
});
