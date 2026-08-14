import { db } from "../db/database";
import { enqueue } from "../sync/outbox";
import { newId, nowIso } from "../lib/id";
import type { Payment, PaymentMethod } from "../types/domain";

export const paymentsRepo = {
  all(): Promise<Payment[]> {
    return db.payments.toArray();
  },

  byLoan(loanId: string): Promise<Payment[]> {
    return db.payments.where("loanId").equals(loanId).toArray();
  },

  async create(input: {
    loanId: string;
    installmentId: string;
    amountCents: number;
    method: PaymentMethod;
    daysLate: number;
  }): Promise<Payment> {
    const payment: Payment = {
      id: newId(),
      loanId: input.loanId,
      installmentId: input.installmentId,
      amountCents: input.amountCents,
      method: input.method,
      daysLate: input.daysLate,
      paidAt: nowIso(),
    };
    await db.payments.put(payment);
    await enqueue("payments", payment.id, "put", payment);
    return payment;
  },
};
