import { db } from "../db/database";
import { enqueue } from "../sync/outbox";
import { newId } from "../lib/id";
import type { Loan, Installment, Payment } from "../types/domain";
import { buildSchedule } from "../domain/installmentSchedule";
import { validateLoanInput, type LoanInput } from "../domain/loanValidation";
import { validateLoanBackfillInput, buildLoanBackfill, type LoanBackfillInput } from "../domain/loanBackfill";

export const loansRepo = {
  all(): Promise<Loan[]> {
    return db.loans.toArray();
  },

  active(): Promise<Loan[]> {
    return db.loans.filter(loan => !loan.isPaid).toArray();
  },

  byClient(clientId: string): Promise<Loan[]> {
    return db.loans.where("clientId").equals(clientId).toArray();
  },

  async create(input: LoanInput & { disbursedAt: string }): Promise<{ loan: Loan; installments: Installment[] }> {
    const { ok, errors } = validateLoanInput(input);
    if (!ok) {
      throw new Error(Object.values(errors).join(", "));
    }

    const loanId = newId();
    const loan: Loan = {
      id: loanId,
      clientId: input.clientId,
      principalCents: input.principalCents,
      rate: input.rate,
      installmentCount: input.installmentCount,
      frequency: input.frequency,
      disbursedAt: input.disbursedAt,
      isPaid: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const installments = buildSchedule({
      ...input,
      loanId,
      disbursedAt: input.disbursedAt
    });

    await db.transaction("rw", db.loans, db.installments, db.outbox, async () => {
      await db.loans.put(loan);
      await enqueue("loans", loan.id, "put", loan);

      for (const inst of installments) {
        await db.installments.put(inst);
        await enqueue("installments", inst.id, "put", inst);
      }
    });

    return { loan, installments };
  },

  async backfill(input: LoanBackfillInput): Promise<{ loan: Loan; installments: Installment[]; payments: Payment[] }> {
    const { ok, errors } = validateLoanBackfillInput(input);
    if (!ok) {
      throw new Error(Object.values(errors).join(", "));
    }

    const { loan: draftLoan, installments, syntheticPayments } = buildLoanBackfill(input);

    const finalLoan: Loan = { ...draftLoan, id: newId() };
    const finalInstallments = installments.map(i => ({ ...i, id: newId(), loanId: finalLoan.id }));
    const finalPayments = syntheticPayments.map((p, idx) => ({ 
      ...p, 
      id: newId(), 
      loanId: finalLoan.id,
      installmentId: finalInstallments[idx].id // map array length correctly since we only generate payments for paid installments
    }));

    // Wait, the syntheticPayments are matched by cuota index in buildLoanBackfill.
    // I need to properly map them. Let's rely on the IDs generated in buildLoanBackfill!
    // buildLoanBackfill already generates valid UUIDs for loan, installments, and payments!
    // We don't need to overwrite them.
    
    await db.transaction("rw", db.loans, db.installments, db.payments, db.outbox, async () => {
      await db.loans.put(draftLoan);
      await enqueue("loans", draftLoan.id, "put", draftLoan);

      for (const inst of installments) {
        await db.installments.put(inst);
        await enqueue("installments", inst.id, "put", inst);
      }

      for (const payment of syntheticPayments) {
        await db.payments.put(payment);
        await enqueue("payments", payment.id, "put", payment);
      }
    });

    return { loan: draftLoan, installments, payments: syntheticPayments };
  }
};
