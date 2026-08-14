import { describe, it, expect } from "vitest";
import { clientToRow, rowToClient, loanToRow, rowToLoan, installmentToRow, rowToInstallment, paymentToRow, rowToPayment } from "./mappers";
import type { Client, Loan, Installment, Payment } from "../types/domain";

describe("mappers", () => {
  it("Client round-trip", () => {
    const c: Client = {
      id: "1", dni: "1", name: "A", phone: "1", createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z"
    };
    const row = clientToRow(c);
    expect(rowToClient(row as any)).toEqual(c);
  });

  it("Loan round-trip", () => {
    const l: Loan = {
      id: "1", clientId: "c1", principalCents: 1000, rate: 0.2, installmentCount: 1, frequency: "monthly",
      disbursedAt: "2024-01-01", isPaid: false, createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z"
    };
    const row = loanToRow(l);
    expect(rowToLoan(row as any)).toEqual(l);
  });

  it("Installment round-trip", () => {
    const i: Installment = {
      id: "1", loanId: "l1", index: 1, dueDate: "2024-01-31", amountCents: 1000, paidCents: 0,
      status: "pending", paidAt: null, createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z"
    };
    const row = installmentToRow(i);
    expect(rowToInstallment(row as any)).toEqual(i);
  });

  it("Payment round-trip", () => {
    const p: Payment = {
      id: "1", loanId: "l1", installmentId: "i1", amountCents: 1000, method: "cash",
      daysLate: 0, paidAt: "2024-01-01T00:00:00Z"
    };
    const row = paymentToRow(p);
    expect(rowToPayment(row as any)).toEqual(p);
  });
});
