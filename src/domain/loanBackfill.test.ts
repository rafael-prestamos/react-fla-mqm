import { describe, it, expect } from "vitest";
import { validateLoanBackfillInput, buildLoanBackfill, type LoanBackfillInput } from "./loanBackfill";

describe("loanBackfill", () => {
  const valid: LoanBackfillInput = {
    clientId: "c1",
    principalCents: 10000,
    rate: 0.2,
    installmentCount: 4,
    frequency: "weekly",
    disbursedAt: "2024-01-01",
    installments: []
  };

  it("validates basic input correctly", () => {
    const { ok } = validateLoanBackfillInput(valid);
    expect(ok).toBe(true);
  });

  it("generates schedule with no prior payments", () => {
    const { loan, installments, syntheticPayments } = buildLoanBackfill(valid);
    expect(loan.principalCents).toBe(10000);
    expect(installments.length).toBe(4);
    expect(syntheticPayments.length).toBe(0);
    expect(installments[0].paidCents).toBe(0);
    expect(loan.isPaid).toBe(false);
  });

  it("applies partial and full historical payments", () => {
    const input: LoanBackfillInput = {
      ...valid,
      installments: [
        { index: 1, paidCents: 3000, paidAt: "2024-01-08T12:00:00Z" },
        { index: 2, paidCents: 1500, paidAt: null }
      ]
    };
    const { loan, installments, syntheticPayments } = buildLoanBackfill(input);
    
    // Inst 1 should be fully paid (base is 3000 for 4 cuotas of 12000 total)
    expect(installments[0].status).toBe("paid");
    expect(installments[0].paidCents).toBe(3000);
    expect(installments[0].paidAt).toBe("2024-01-08T12:00:00Z");

    // Inst 2 should be partial
    expect(installments[1].status).toBe("pending");
    expect(installments[1].paidCents).toBe(1500);

    // Inst 3 and 4 should be 0
    expect(installments[2].paidCents).toBe(0);

    // 2 synthetic payments generated
    expect(syntheticPayments.length).toBe(2);
    expect(syntheticPayments[0].amountCents).toBe(3000);
    expect(syntheticPayments[1].amountCents).toBe(1500);
  });

  it("throws RangeError if installment paid amount exceeds base", () => {
    const input: LoanBackfillInput = {
      ...valid,
      installments: [
        { index: 1, paidCents: 3001, paidAt: null }
      ]
    };
    expect(() => buildLoanBackfill(input)).toThrow(RangeError);
  });

  it("marks loan as isPaid if all installments are fully paid", () => {
    const input: LoanBackfillInput = {
      ...valid,
      installments: [
        { index: 1, paidCents: 3000, paidAt: null },
        { index: 2, paidCents: 3000, paidAt: null },
        { index: 3, paidCents: 3000, paidAt: null },
        { index: 4, paidCents: 3000, paidAt: null }
      ]
    };
    const { loan } = buildLoanBackfill(input);
    expect(loan.isPaid).toBe(true);
  });
});
