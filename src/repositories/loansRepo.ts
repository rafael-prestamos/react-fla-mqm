/**
 * Repository de préstamos.
 * Encapsula las mutaciones de negocio (crear, abonar, renovar, marcar pagado)
 * y las encola en el outbox para sync.
 */

import { db } from "../db/database";
import { enqueue } from "../sync/outbox";
import { newId, nowIso } from "../lib/id";
import { toIsoDate, startOfToday } from "../lib/dates";
import type { Loan, LoanTerm } from "../types/domain";
import { applyPayment, type ApplyPaymentInput, type ApplyPaymentResult } from "../domain/loanPayment";
import { paymentsRepo } from "./paymentsRepo";
import { validateLoanBackfillInput, buildLoanBackfill, type LoanBackfillInput } from "../domain/loanBackfill";
import type { Payment } from "../types/domain";



export const loansRepo = {
  all(): Promise<Loan[]> {
    return db.loans.toArray();
  },

  active(): Promise<Loan[]> {
    return db.loans.filter((loan) => !loan.isPaid).toArray();
  },

  byClient(clientId: string): Promise<Loan[]> {
    return db.loans.where("clientId").equals(clientId).toArray();
  },

  /** Crea un préstamo entregado hoy. */
  async create(input: {
    clientId: string;
    principalCents: number;
    rate: number;
    termDays: LoanTerm;
  }): Promise<Loan> {
    const timestamp = nowIso();
    const loan: Loan = {
      id: newId(),
      clientId: input.clientId,
      principalCents: input.principalCents,
      rate: input.rate,
      termDays: input.termDays,
      disbursedAt: toIsoDate(startOfToday()),
      paidOffCents: 0,
      renewalCount: 0,
      isPaid: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.loans.put(loan);
    await enqueue("loans", loan.id, "put", loan);
    return loan;
  },



  async applyPayment(input: ApplyPaymentInput): Promise<ApplyPaymentResult> {
    const current = await db.loans.get(input.loan.id);
    if (!current) throw new Error("Préstamo no encontrado");
    
    const result = applyPayment({ ...input, loan: current });
    
    await db.transaction("rw", db.loans, db.payments, db.outbox, async () => {
      await db.loans.put(result.updatedLoan);
      await enqueue("loans", result.updatedLoan.id, "put", result.updatedLoan);
      
      await paymentsRepo.create({
        loanId: result.updatedLoan.id,
        type: result.paymentRecord.type,
        amountCents: result.paymentRecord.amountCents,
        method: result.paymentRecord.method,
        daysLate: result.paymentRecord.daysLate,
      });
    });

    return result;
  },

  async backfill(input: LoanBackfillInput): Promise<{ loan: Loan; payment: Payment | null }> {
    const { ok, errors } = validateLoanBackfillInput(input);
    if (!ok) {
      throw new Error(Object.values(errors).join(", "));
    }

    const { loan: draftLoan, syntheticPayment: draftPayment } = buildLoanBackfill(input, new Date(nowIso()));

    const finalLoan: Loan = { ...draftLoan, id: newId() };
    const finalPayment: Payment | null = draftPayment
      ? { ...draftPayment, id: newId(), loanId: finalLoan.id }
      : null;

    await db.transaction("rw", db.loans, db.payments, db.outbox, async () => {
      await db.loans.put(finalLoan);
      await enqueue("loans", finalLoan.id, "put", finalLoan);

      if (finalPayment) {
        await db.payments.put(finalPayment);
        await enqueue("payments", finalPayment.id, "put", finalPayment);
      }
    });

    return { loan: finalLoan, payment: finalPayment };
  },
};
