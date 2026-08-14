import { describe, it, expect } from "vitest";
import {
  clientToRow,
  rowToClient,
  loanToRow,
  rowToLoan,
  paymentToRow,
  rowToPayment,
  type LoanRow,
} from "./mappers";
import type { Client, Loan, Payment } from "../types/domain";

describe("sync mappers", () => {
  it("client round-trip", () => {
    const domain: Client = {
      id: "c1",
      dni: "12345678",
      name: "Juan",
      phone: "999999999",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
    const row = clientToRow(domain);
    const back = rowToClient({ ...row, owner_id: "user1" });
    expect(back).toEqual(domain);
  });

  it("loan round-trip with isPaid=true", () => {
    const domain: Loan = {
      id: "l1",
      clientId: "c1",
      principalCents: 100000,
      rate: 0.2,
      termDays: 30,
      disbursedAt: "2024-01-01T00:00:00.000Z",
      paidOffCents: 120000,
      renewalCount: 1,
      isPaid: true,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-02-01T00:00:00.000Z",
    };
    const row = loanToRow(domain);
    const back = rowToLoan({ ...row, owner_id: "user1" });
    expect(back).toEqual(domain);
  });

  it("payment round-trip", () => {
    const domain: Payment = {
      id: "p1",
      loanId: "l1",
      type: "full",
      amountCents: 120000,
      method: "cash",
      daysLate: 5,
      paidAt: "2024-02-01T00:00:00.000Z",
    };
    const row = paymentToRow(domain);
    const back = rowToPayment({ ...row, owner_id: "user1" });
    expect(back).toEqual(domain);
  });

  it("loan throws on invalid term_days", () => {
    const invalidRow: LoanRow = {
      id: "l2",
      owner_id: "user1",
      client_id: "c1",
      principal_cents: 100000,
      rate: 0.2,
      term_days: 15, // invalid
      disbursed_at: "2024-01-01T00:00:00.000Z",
      paid_off_cents: 0,
      renewal_count: 0,
      is_paid: false,
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
    };
    expect(() => rowToLoan(invalidRow)).toThrowError("term_days inválido en fila: l2");
  });
});
