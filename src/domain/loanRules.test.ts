import { describe, it, expect } from "vitest";
import { computeLatePeriods, classifyByMaxDaysLate, deriveLoan } from "./loanRules";
import type { Loan } from "../types/domain";

describe("loanRules", () => {
  it("computeLatePeriods", () => {
    // ⚠️ LATE_INTEREST_ENABLED=false (desactivada pre-release, sin confirmación escrita de Fla):
    // siempre 0, sin importar el atraso. Si se reactiva el flag, restaurar estas expectativas:
    // computeLatePeriods(8) === 1, computeLatePeriods(37) === 1, computeLatePeriods(38) === 2.
    expect(computeLatePeriods(0)).toBe(0);
    expect(computeLatePeriods(7)).toBe(0);
    expect(computeLatePeriods(8)).toBe(0);
    expect(computeLatePeriods(37)).toBe(0);
    expect(computeLatePeriods(38)).toBe(0);
  });

  it("classifyByMaxDaysLate", () => {
    expect(classifyByMaxDaysLate(0)).toBe("good");
    expect(classifyByMaxDaysLate(7)).toBe("good");
    expect(classifyByMaxDaysLate(8)).toBe("slow");
    expect(classifyByMaxDaysLate(30)).toBe("slow");
    expect(classifyByMaxDaysLate(31)).toBe("bad");
  });

  it("deriveLoan", () => {
    const baseLoan = {
      id: "1",
      clientId: "1",
      principalCents: 100000,
      rate: 0.2,
      termDays: 30,
      disbursedAt: "2025-01-01",
      paidOffCents: 0,
      renewalCount: 0,
      isPaid: false,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    } as Loan;

    // reference "2025-01-31T00:00:00Z" -> daysLate=0
    let res = deriveLoan(baseLoan, new Date("2025-01-31T00:00:00Z"));
    expect(res.interestCents).toBe(20000);
    expect(res.totalCents).toBe(120000);
    expect(res.daysLate).toBe(0);
    expect(res.latePeriods).toBe(0);
    expect(res.balanceCents).toBe(120000);
    expect(res.status).toBe("dueToday");

    // reference "2025-02-10T00:00:00Z" -> daysLate=10
    // LATE_INTEREST_ENABLED=false: latePeriods/lateInterestCents en 0 (mora desactivada pre-release).
    res = deriveLoan(baseLoan, new Date("2025-02-10T00:00:00Z"));
    expect(res.daysLate).toBe(10);
    expect(res.latePeriods).toBe(0);
    expect(res.lateInterestCents).toBe(0);
    expect(res.debtCents).toBe(120000);
    expect(res.status).toBe("lateInterest");

    // reference "2025-02-05T00:00:00Z" -> daysLate=5
    res = deriveLoan(baseLoan, new Date("2025-02-05T00:00:00Z"));
    expect(res.daysLate).toBe(5);
    expect(res.latePeriods).toBe(0);
    expect(res.status).toBe("grace");

    // reference "2025-01-29T00:00:00Z" -> daysLate=-2
    res = deriveLoan(baseLoan, new Date("2025-01-29T00:00:00Z"));
    expect(res.daysLate).toBe(-2);
    expect(res.status).toBe("dueSoon");

    // reference "2025-01-20T00:00:00Z" -> active
    res = deriveLoan(baseLoan, new Date("2025-01-20T00:00:00Z"));
    expect(res.status).toBe("active");

    // con isPaid:true -> paid
    res = deriveLoan({ ...baseLoan, isPaid: true }, new Date("2025-01-31T00:00:00Z"));
    expect(res.balanceCents).toBe(0);
    expect(res.status).toBe("paid");
  });
});
