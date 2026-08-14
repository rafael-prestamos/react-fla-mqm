import { describe, it, expect, vi, afterEach } from "vitest";
import { applyPayment } from "./loanPayment";
import type { Installment } from "../types/domain";
import * as loanRules from "./loanRules";

describe("applyPayment", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const baseInst: Installment = {
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

  it("throws if amountCents is 0", () => {
    expect(() => applyPayment({ installment: baseInst, amountCents: 0, method: "cash" })).toThrow(RangeError);
  });

  it("throws if amountCents is negative", () => {
    expect(() => applyPayment({ installment: baseInst, amountCents: -100, method: "cash" })).toThrow(RangeError);
  });

  it("throws if amountCents is not integer", () => {
    expect(() => applyPayment({ installment: baseInst, amountCents: 100.5, method: "cash" })).toThrow(RangeError);
  });

  it("throws if amountCents exceeds total owed", () => {
    expect(() => applyPayment({ installment: baseInst, amountCents: 10001, method: "cash" })).toThrowError(/excede lo debido/);
  });

  it("applies exact full payment", () => {
    const res = applyPayment({ installment: baseInst, amountCents: 10000, method: "cash", reference: new Date("2024-01-10T12:00:00Z") });
    expect(res.updatedInstallment.paidCents).toBe(10000);
    expect(res.updatedInstallment.status).toBe("paid");
    expect(res.updatedInstallment.paidAt).toBe("2024-01-10T12:00:00.000Z");
    
    expect(res.paymentRecord.amountCents).toBe(10000);
    expect(res.paymentRecord.daysLate).toBe(0);
    expect(res.paymentRecord.method).toBe("cash");
    expect(res.paymentRecord.installmentId).toBe("i1");
  });

  it("applies partial payment", () => {
    const res = applyPayment({ installment: baseInst, amountCents: 4000, method: "digital", reference: new Date("2024-01-10T12:00:00Z") });
    expect(res.updatedInstallment.paidCents).toBe(4000);
    expect(res.updatedInstallment.status).toBe("pending");
    expect(res.updatedInstallment.paidAt).toBeNull();

    expect(res.paymentRecord.amountCents).toBe(4000);
  });

  it("applies full payment including late interest", () => {
    // @ts-ignore
    vi.spyOn(loanRules, "LATE_INTEREST_ENABLED", "get").mockReturnValue(true);
    // 40 days late -> 2 late periods -> 20000 interest + 10000 base = 30000 total
    const res = applyPayment({ installment: baseInst, amountCents: 30000, method: "cash", reference: new Date("2024-02-19T12:00:00Z") });
    
    expect(res.updatedInstallment.paidCents).toBe(30000);
    expect(res.updatedInstallment.status).toBe("paid");
    expect(res.paymentRecord.amountCents).toBe(30000);
    expect(res.paymentRecord.daysLate).toBe(40);
  });

  it("applies partial payment when late interest is present but not fully paid", () => {
    // @ts-ignore
    vi.spyOn(loanRules, "LATE_INTEREST_ENABLED", "get").mockReturnValue(true);
    // 30000 total, pays 15000
    const res = applyPayment({ installment: baseInst, amountCents: 15000, method: "cash", reference: new Date("2024-02-19T12:00:00Z") });
    
    expect(res.updatedInstallment.paidCents).toBe(15000);
    expect(res.updatedInstallment.status).toBe("pending");
    expect(res.updatedInstallment.paidAt).toBeNull();
  });
});
