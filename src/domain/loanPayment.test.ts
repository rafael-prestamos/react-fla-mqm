import { describe, it, expect } from "vitest";
import { applyPayment } from "./loanPayment";
import type { Loan } from "../types/domain";

// ⚠️ La regla de interés por mora aún está pendiente de confirmación verbal con la clienta (ver DECISIONS §5).
// Los tests que involucran mora asumen LATE_INTEREST_ENABLED=true en el entorno de pruebas, o asumen que la
// derivación del loan lo está incluyendo correctamente.

describe("loanPayment", () => {
  const baseLoan: Loan = {
    id: "l1",
    clientId: "c1",
    principalCents: 100000,
    rate: 0.2,
    termDays: 30,
    disbursedAt: "2025-01-01T00:00:00.000Z",
    paidOffCents: 0,
    renewalCount: 0,
    isPaid: false,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  };

  it("1. partial al día (sin mora)", () => {
    // día 14: no mora
    const reference = new Date("2025-01-15T00:00:00Z");
    
    // abono 5000
    const res1 = applyPayment({ loan: baseLoan, type: "partial", amountCents: 5000, method: "cash", reference });
    expect(res1.paymentRecord.interestPaidCents).toBe(5000);
    expect(res1.paymentRecord.principalPaidCents).toBe(0);
    expect(res1.updatedLoan.paidOffCents).toBe(5000);
    expect(res1.updatedLoan.isPaid).toBe(false);

    // abono 25000
    const res2 = applyPayment({ loan: baseLoan, type: "partial", amountCents: 25000, method: "cash", reference });
    expect(res2.paymentRecord.interestPaidCents).toBe(20000);
    expect(res2.paymentRecord.principalPaidCents).toBe(5000);
    expect(res2.updatedLoan.paidOffCents).toBe(25000);
    expect(res2.updatedLoan.isPaid).toBe(false);
  });

  it("2. partial con abono previo", () => {
    const loanWithPaid = { ...baseLoan, paidOffCents: 10000 };
    const reference = new Date("2025-01-15T00:00:00Z");

    // abono 15000
    const res = applyPayment({ loan: loanWithPaid, type: "partial", amountCents: 15000, method: "cash", reference });
    expect(res.paymentRecord.interestPaidCents).toBe(10000); // 20k - 10k previos = 10k pendientes
    expect(res.paymentRecord.principalPaidCents).toBe(5000);
    expect(res.updatedLoan.paidOffCents).toBe(25000);
    expect(res.updatedLoan.isPaid).toBe(false);
  });

  it("3. partial que liquida", () => {
    const loanWithPaid = { ...baseLoan, paidOffCents: 100000 }; // 100k
    const reference = new Date("2025-01-31T00:00:00Z");

    // Total debt: 120k (100k + 20k). Paid: 100k. Balance: 20k.
    const res = applyPayment({ loan: loanWithPaid, type: "partial", amountCents: 20000, method: "cash", reference });
    expect(res.updatedLoan.paidOffCents).toBe(120000);
    expect(res.updatedLoan.isPaid).toBe(true);
  });

  it("4. partial inválido", () => {
    const reference = new Date("2025-01-15T00:00:00Z");
    expect(() => applyPayment({ loan: baseLoan, type: "partial", amountCents: 0, method: "cash", reference }))
      .toThrowError(/amountCents debe ser > 0/);
    expect(() => applyPayment({ loan: baseLoan, type: "partial", amountCents: 200000, method: "cash", reference }))
      .toThrowError(/El abono excede el saldo/);
  });

  it("5. interest sin mora", () => {
    const reference = new Date("2025-01-31T00:00:00Z");
    const res = applyPayment({ loan: baseLoan, type: "interest", amountCents: 0, method: "cash", reference }); // amountCents ignored
    expect(res.paymentRecord.amountCents).toBe(20000);
    expect(res.paymentRecord.interestPaidCents).toBe(20000);
    expect(res.paymentRecord.principalPaidCents).toBe(0);
    expect(res.updatedLoan.renewalCount).toBe(1);
    expect(res.updatedLoan.paidOffCents).toBe(0);
    // Vencimiento era 2025-01-31, así que disbursedAt debe ser esa misma fecha
    expect(res.updatedLoan.disbursedAt).toMatch(/^2025-01-31/);
    expect(res.updatedLoan.isPaid).toBe(false);
  });

  it("6. interest con mora (LATE_INTEREST_ENABLED=false: sin recargo, solo interés base)", () => {
    // 2025-02-15 = 15 días de atraso sobre 2025-01-31. Con la mora desactivada
    // pre-release, no corre el período extra de interés (sería 20k de mora, total 40k
    // si LATE_INTEREST_ENABLED volviera a true).
    const reference = new Date("2025-02-15T00:00:00Z");
    const res = applyPayment({ loan: baseLoan, type: "interest", amountCents: 0, method: "cash", reference });
    expect(res.paymentRecord.amountCents).toBe(20000);
    expect(res.paymentRecord.interestPaidCents).toBe(20000);
    expect(res.paymentRecord.principalPaidCents).toBe(0);
    expect(res.updatedLoan.renewalCount).toBe(1);
    expect(res.updatedLoan.paidOffCents).toBe(0);
    // Vencimiento original era 2025-01-31, así que la nueva disbursedAt será esa fecha para reiniciar el ciclo ahí
    expect(res.updatedLoan.disbursedAt).toMatch(/^2025-01-31/);
  });

  it("7. full sin mora", () => {
    const reference = new Date("2025-01-31T00:00:00Z");
    const res = applyPayment({ loan: baseLoan, type: "full", amountCents: 0, method: "cash", reference });
    expect(res.paymentRecord.amountCents).toBe(120000);
    expect(res.paymentRecord.interestPaidCents).toBe(20000);
    expect(res.paymentRecord.principalPaidCents).toBe(100000);
    expect(res.updatedLoan.isPaid).toBe(true);
    expect(res.updatedLoan.paidOffCents).toBe(120000);
  });

  it("8. full con abono previo", () => {
    const loanWithPaid = { ...baseLoan, paidOffCents: 15000 };
    const reference = new Date("2025-01-31T00:00:00Z");
    const res = applyPayment({ loan: loanWithPaid, type: "full", amountCents: 0, method: "cash", reference });
    
    // Balance total es 120k - 15k = 105k
    expect(res.paymentRecord.amountCents).toBe(105000);
    // Abono previo de 15k ya cubrió parte de los 20k de interés
    expect(res.paymentRecord.interestPaidCents).toBe(5000);
    expect(res.paymentRecord.principalPaidCents).toBe(100000);
    expect(res.updatedLoan.isPaid).toBe(true);
    expect(res.updatedLoan.paidOffCents).toBe(120000);
  });

  it("9. full con mora (LATE_INTEREST_ENABLED=false: sin recargo, solo interés base)", () => {
    const reference = new Date("2025-02-15T00:00:00Z");
    const res = applyPayment({ loan: baseLoan, type: "full", amountCents: 0, method: "cash", reference });

    // Con la mora desactivada pre-release: interés total 20k, balance 120k
    // (sería interés 40k, balance 140k si LATE_INTEREST_ENABLED volviera a true).
    expect(res.paymentRecord.amountCents).toBe(120000);
    expect(res.paymentRecord.interestPaidCents).toBe(20000);
    expect(res.paymentRecord.principalPaidCents).toBe(100000);
    expect(res.updatedLoan.isPaid).toBe(true);
    expect(res.updatedLoan.paidOffCents).toBe(120000);
  });
});
