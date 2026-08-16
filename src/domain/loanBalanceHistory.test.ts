import { describe, it, expect } from "vitest";
import { balanceCentsAfterPayment } from "./loanBalanceHistory";
import type { Loan, Payment } from "../types/domain";

describe("loanBalanceHistory", () => {
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

  function payment(overrides: Partial<Payment>): Payment {
    return {
      id: "p1",
      loanId: "l1",
      type: "partial",
      amountCents: 0,
      method: "cash",
      daysLate: 0,
      paidAt: "2025-01-15T00:00:00.000Z",
      cancelledAt: null,
      cancelReason: null,
      editedAt: null,
      ...overrides,
    };
  }

  it("un solo pago full: saldo después es 0", () => {
    // Préstamo actual (isPaid) refleja el único pago full ya aplicado.
    const loan: Loan = { ...baseLoan, isPaid: true, paidOffCents: 120000 };
    const payments = [payment({ id: "p1", type: "full", amountCents: 120000, paidAt: "2025-01-31T00:00:00.000Z" })];
    expect(balanceCentsAfterPayment(loan, payments, "p1")).toBe(0);
  });

  it("abono parcial: saldo después es debtCents - abono", () => {
    const loan: Loan = { ...baseLoan, paidOffCents: 25000 };
    const payments = [payment({ id: "p1", type: "partial", amountCents: 25000, paidAt: "2025-01-15T00:00:00.000Z" })];
    // Sin mora en esa fecha: debt = 120000. Saldo = 120000 - 25000 = 95000.
    expect(balanceCentsAfterPayment(loan, payments, "p1")).toBe(95000);
  });

  it("renovación (interest) seguida de pago full: reconstruye ambos saldos", () => {
    // Ciclo 1 vence 2025-01-31; el cliente renueva pagando solo interés (20000) y luego paga todo en el ciclo 2.
    const loan: Loan = {
      ...baseLoan,
      disbursedAt: "2025-01-31T00:00:00.000Z", // ciclo actual empieza donde terminó el ciclo 1
      paidOffCents: 120000,
      renewalCount: 1,
      isPaid: true,
    };
    const interestPayment = payment({ id: "p-interest", type: "interest", amountCents: 20000, paidAt: "2025-01-31T00:00:00.000Z" });
    const fullPayment = payment({ id: "p-full", type: "full", amountCents: 120000, paidAt: "2025-03-02T00:00:00.000Z" });
    const payments = [interestPayment, fullPayment];

    // Justo tras la renovación: nuevo ciclo recién empieza, sin mora, debe el total del nuevo ciclo.
    expect(balanceCentsAfterPayment(loan, payments, "p-interest")).toBe(120000);
    // Tras el pago full del segundo ciclo: liquidado.
    expect(balanceCentsAfterPayment(loan, payments, "p-full")).toBe(0);
  });

  it("lanza error si el pago no pertenece al historial provisto", () => {
    const payments = [payment({ id: "p1", type: "full", amountCents: 120000 })];
    expect(() => balanceCentsAfterPayment(baseLoan, payments, "no-existe")).toThrowError(/no encontrado/);
  });
});
