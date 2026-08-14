import { describe, it, expect, vi, afterEach } from "vitest";
import { deriveInstallment, derivedLoanTotals, classifyByMaxDaysLate } from "./loanRules";
import * as loanRules from "./loanRules";
import type { Installment, Loan } from "../types/domain";

describe("loanRules", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("deriveInstallment", () => {
    const baseInstallment: Installment = {
      id: "i1",
      loanId: "l1",
      index: 1,
      dueDate: "2024-01-10",
      amountCents: 10000,
      paidCents: 0,
      status: "pending",
      paidAt: null,
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01"
    };

    it("identifies pending state (far in future)", () => {
      const d = deriveInstallment(baseInstallment, new Date("2024-01-01T12:00:00Z"));
      expect(d.status).toBe("pending");
      expect(d.daysLate).toBeLessThan(0);
      expect(d.totalOwedCents).toBe(10000);
    });

    it("identifies dueSoon state (within 3 days)", () => {
      const d = deriveInstallment(baseInstallment, new Date("2024-01-08T12:00:00Z"));
      expect(d.status).toBe("dueSoon");
      expect(d.daysLate).toBe(-2);
    });

    it("identifies dueToday state", () => {
      const d = deriveInstallment(baseInstallment, new Date("2024-01-10T12:00:00Z"));
      expect(d.status).toBe("dueToday");
      expect(d.daysLate).toBe(0);
    });

    it("identifies grace state (1-7 days late)", () => {
      const d = deriveInstallment(baseInstallment, new Date("2024-01-15T12:00:00Z"));
      expect(d.status).toBe("grace");
      expect(d.daysLate).toBe(5);
      expect(d.lateInterestCents).toBe(0);
    });

    it("identifies lateInterest state (>7 days late) without penalty if flag is off", () => {
      const d = deriveInstallment(baseInstallment, new Date("2024-01-20T12:00:00Z")); // 10 days late
      expect(d.status).toBe("lateInterest");
      expect(d.daysLate).toBe(10);
      expect(d.latePeriods).toBe(1);
      expect(d.lateInterestCents).toBe(0); // Because flag is false
    });

    it("calculates late interest penalty if flag is on", () => {
      // @ts-ignore - Mocking constant for test
      vi.spyOn(loanRules, "LATE_INTEREST_ENABLED", "get").mockReturnValue(true);
      const d = deriveInstallment(baseInstallment, new Date("2024-01-20T12:00:00Z")); // 10 days late
      expect(d.status).toBe("lateInterest");
      expect(d.latePeriods).toBe(1);
      expect(d.lateInterestCents).toBe(10000); // 1 period * 10000 base
      expect(d.totalOwedCents).toBe(20000);
    });

    it("calculates multi-period late interest if flag is on", () => {
      // @ts-ignore
      vi.spyOn(loanRules, "LATE_INTEREST_ENABLED", "get").mockReturnValue(true);
      // dueDate = 10, grace=7, period=30. daysLate = 40. period = floor((40-7)/30)+1 = floor(33/30)+1 = 2
      const d = deriveInstallment(baseInstallment, new Date("2024-02-19T12:00:00Z")); // 40 days late
      expect(d.daysLate).toBe(40);
      expect(d.latePeriods).toBe(2);
      expect(d.lateInterestCents).toBe(20000); 
    });

    it("identifies paid state and has 0 totalOwed if fully paid", () => {
      const paidInst = { ...baseInstallment, status: "paid", paidCents: 10000 } as Installment;
      const d = deriveInstallment(paidInst, new Date("2024-02-19T12:00:00Z")); // late but paid
      expect(d.status).toBe("paid");
      expect(d.totalOwedCents).toBe(0);
      expect(d.lateInterestCents).toBe(0); // no late interest once paid
    });

    it("reduces totalOwed with partial payments", () => {
      const partialInst = { ...baseInstallment, paidCents: 4000 } as Installment;
      const d = deriveInstallment(partialInst, new Date("2024-01-10T12:00:00Z"));
      expect(d.remainingBaseCents).toBe(6000);
      expect(d.totalOwedCents).toBe(6000);
    });
  });

  describe("derivedLoanTotals", () => {
    const loan: Loan = {
      id: "l1",
      clientId: "c1",
      principalCents: 20000,
      rate: 0.1,
      installmentCount: 2,
      frequency: "monthly",
      disbursedAt: "2024-01-01",
      isPaid: false,
      createdAt: "",
      updatedAt: ""
    };
    const installments: Installment[] = [
      { id: "i1", loanId: "l1", index: 1, dueDate: "2024-01-31", amountCents: 11000, paidCents: 0, status: "pending", paidAt: null, createdAt: "", updatedAt: "" },
      { id: "i2", loanId: "l1", index: 2, dueDate: "2024-03-01", amountCents: 11000, paidCents: 0, status: "pending", paidAt: null, createdAt: "", updatedAt: "" }
    ];

    it("aggregates totals correctly for new loan", () => {
      const d = derivedLoanTotals(loan, installments, new Date("2024-01-15T00:00:00Z"));
      expect(d.totalCents).toBe(22000);
      expect(d.paidCents).toBe(0);
      expect(d.balanceCents).toBe(22000);
      expect(d.pendingInstallments).toBe(2);
      expect(d.nextDueInstallment?.id).toBe("i1");
      expect(d.status).toBe("active");
    });

    it("aggregates totals with partial payments", () => {
      const insts = [
        { ...installments[0], paidCents: 11000, status: "paid" },
        { ...installments[1], paidCents: 5000 }
      ] as Installment[];
      const d = derivedLoanTotals(loan, insts, new Date("2024-01-15T00:00:00Z"));
      expect(d.paidCents).toBe(16000);
      expect(d.balanceCents).toBe(6000); // 11000 - 5000
      expect(d.pendingInstallments).toBe(1);
      expect(d.nextDueInstallment?.id).toBe("i2");
    });

    it("marks as paid when all installments are paid", () => {
      const insts = [
        { ...installments[0], paidCents: 11000, status: "paid" },
        { ...installments[1], paidCents: 11000, status: "paid" }
      ] as Installment[];
      const d = derivedLoanTotals(loan, insts, new Date("2024-01-15T00:00:00Z"));
      expect(d.pendingInstallments).toBe(0);
      expect(d.balanceCents).toBe(0);
      expect(d.status).toBe("paid");
      expect(d.nextDueInstallment).toBeNull();
    });
  });

  describe("classifyByMaxDaysLate", () => {
    it("returns good for <= 7", () => {
      expect(classifyByMaxDaysLate(0)).toBe("good");
      expect(classifyByMaxDaysLate(7)).toBe("good");
    });
    it("returns slow for 8 to 30", () => {
      expect(classifyByMaxDaysLate(8)).toBe("slow");
      expect(classifyByMaxDaysLate(30)).toBe("slow");
    });
    it("returns bad for > 30", () => {
      expect(classifyByMaxDaysLate(31)).toBe("bad");
    });
  });
});
