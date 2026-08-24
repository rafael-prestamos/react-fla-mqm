import { describe, it, expect } from "vitest";
import { renewLoan, validateRenewLoanInput, isClosingRenewalPayment } from "./loanRenewal";
import { deriveLoan } from "./loanRules";
import { parseLocalDate, addDays, toLocalIsoDate } from "../lib/dates";
import type { Loan } from "../types/domain";

describe("loanRenewal (sprint 7d-1)", () => {
  const baseLoan: Loan = {
    id: "l1",
    clientId: "c1",
    principalCents: 100000,
    rate: 0.2,
    termDays: 30,
    disbursedAt: "2025-01-01",
    paidOffCents: 0,
    renewalCount: 0,
    isPaid: false,
    createdAt: "2025-01-01T12:00:00.000Z",
    updatedAt: "2025-01-01T12:00:00.000Z",
    cancelledAt: null,
    cancelReason: null,
    editedAt: null,
  };
  const now = new Date(2025, 0, 31, 10, 0, 0); // vence 2025-01-31 → al día
  const base = { loan: baseLoan, method: "cash" as const, reference: now };

  it("monto recibido 0 → no genera pago, el nuevo préstamo se crea igual", () => {
    const res = renewLoan({ ...base, receivedCents: 0, principalCents: 100000, rate: 0.2, termDays: 30 }, now);
    expect(res.paymentRecord).toBeNull();
    expect(res.closedLoan.isPaid).toBe(true);
    expect(res.newLoan.principalCents).toBe(100000);
    expect(res.newLoan.rate).toBe(0.2);
    expect(res.newLoan.renewedFromLoanId).toBe("l1");
    expect(res.newLoan.isPaid).toBe(false);
    expect(res.newLoan.paidOffCents).toBe(0);
    expect(res.newLoan.cancelledAt).toBeNull();
  });

  it("monto parcial → genera un pago por ese monto (tipo interest = renovación)", () => {
    const res = renewLoan({ ...base, receivedCents: 5000, principalCents: 100000, rate: 0.2, termDays: 30 }, now);
    expect(res.paymentRecord).not.toBeNull();
    expect(res.paymentRecord!.amountCents).toBe(5000);
    expect(res.paymentRecord!.type).toBe("interest");
    expect(res.paymentRecord!.interestPaidCents).toBe(5000);
    expect(res.paymentRecord!.principalPaidCents).toBe(0);
    expect(res.paymentRecord!.method).toBe("cash");
    expect(res.paymentRecord!.daysLate).toBe(0);
  });

  it("monto mayor al interés → el exceso queda como capital pagado en el registro", () => {
    const res = renewLoan({ ...base, receivedCents: 25000, principalCents: 100000, rate: 0.2, termDays: 30 }, now);
    expect(res.paymentRecord!.interestPaidCents).toBe(20000);
    expect(res.paymentRecord!.principalPaidCents).toBe(5000);
  });

  it("capital del nuevo préstamo es el ingresado manualmente, no derivado de lo recibido", () => {
    const res = renewLoan({ ...base, receivedCents: 5000, principalCents: 150000, rate: 0.1, termDays: 30 }, now);
    expect(res.newLoan.principalCents).toBe(150000); // ni 100000 (anterior) ni 115000 (capitalizado)
    expect(res.newLoan.rate).toBe(0.1);
    expect(res.closedLoan.principalCents).toBe(100000); // el anterior no se toca
    expect(res.closedLoan.rate).toBe(0.2);
  });

  it("interés 0 en renovación es válido", () => {
    const res = renewLoan({ ...base, receivedCents: 20000, principalCents: 100000, rate: 0, termDays: 30 }, now);
    expect(res.newLoan.rate).toBe(0);
    expect(deriveLoan({ ...res.newLoan, id: "l2" }, now).interestCents).toBe(0);
    expect(deriveLoan({ ...res.newLoan, id: "l2" }, now).balanceCents).toBe(100000);
  });

  it("fecha de inicio del nuevo préstamo = vencimiento del anterior", () => {
    const res = renewLoan({ ...base, receivedCents: 0, principalCents: 100000, rate: 0.2, termDays: 30 }, now);
    expect(res.newLoan.disbursedAt).toBe("2025-01-31");
    // Incluso renovando atrasado, arranca desde el vencimiento (no desde hoy).
    const late = renewLoan({ ...base, reference: new Date(2025, 1, 10), receivedCents: 0, principalCents: 100000, rate: 0.2, termDays: 30 }, now);
    expect(late.newLoan.disbursedAt).toBe("2025-01-31");
  });

  it("plazo personalizado se aplica correctamente: vencimiento = inicio + plazo", () => {
    const res = renewLoan({ ...base, receivedCents: 0, principalCents: 100000, rate: 0.2, termDays: 45 }, now);
    expect(res.newLoan.termDays).toBe(45);
    const due = deriveLoan({ ...res.newLoan, id: "l2" }, now).dueDate;
    expect(toLocalIsoDate(due)).toBe(toLocalIsoDate(addDays(parseLocalDate("2025-01-31"), 45)));
    expect(toLocalIsoDate(due)).toBe("2025-03-17");
  });

  it("registra daysLate del pago según la fecha de referencia", () => {
    const res = renewLoan({ ...base, reference: new Date(2025, 1, 5), receivedCents: 20000, principalCents: 100000, rate: 0.2, termDays: 30 }, now);
    expect(res.paymentRecord!.daysLate).toBe(5);
  });

  it("renewalCount del nuevo = anterior + 1 (número de ciclo)", () => {
    const res = renewLoan({ ...base, loan: { ...baseLoan, renewalCount: 2 }, receivedCents: 0, principalCents: 100000, rate: 0.2, termDays: 30 }, now);
    expect(res.newLoan.renewalCount).toBe(3);
  });

  it("valida entradas: negativo, capital 0, interés negativo, plazo fuera de rango", () => {
    expect(validateRenewLoanInput({ receivedCents: -1, principalCents: 100, rate: 0, termDays: 30 }).errors.receivedCents).toBeDefined();
    expect(validateRenewLoanInput({ receivedCents: 0, principalCents: 0, rate: 0, termDays: 30 }).errors.principalCents).toBeDefined();
    expect(validateRenewLoanInput({ receivedCents: 0, principalCents: 100, rate: -0.1, termDays: 30 }).errors.rate).toBeDefined();
    expect(validateRenewLoanInput({ receivedCents: 0, principalCents: 100, rate: 0, termDays: 366 }).errors.termDays).toBeDefined();
    expect(validateRenewLoanInput({ receivedCents: 0, principalCents: 100, rate: 0, termDays: 1 }).ok).toBe(true);
    expect(() => renewLoan({ ...base, receivedCents: 0, principalCents: 0, rate: 0, termDays: 30 }, now)).toThrow(RangeError);
    expect(() => renewLoan({ ...base, loan: { ...baseLoan, isPaid: true }, receivedCents: 0, principalCents: 100, rate: 0, termDays: 30 }, now)).toThrow(/pagado/);
  });

  it("isClosingRenewalPayment: solo el último pago interest de un préstamo cerrado", () => {
    const paid = { ...baseLoan, isPaid: true };
    const payments = [{ id: "a", type: "partial" }, { id: "b", type: "interest" }];
    expect(isClosingRenewalPayment(paid, payments, "b")).toBe(true);
    expect(isClosingRenewalPayment(paid, payments, "a")).toBe(false);
    expect(isClosingRenewalPayment(baseLoan, payments, "b")).toBe(false); // préstamo activo = renovación legada in-place
    expect(isClosingRenewalPayment(baseLoan, payments, "b", true)).toBe(true); // reabierto tras anular el hijo, pero tiene hijo
    expect(isClosingRenewalPayment(paid, [{ id: "b", type: "interest" }, { id: "c", type: "full" }], "b")).toBe(false);
  });
});
