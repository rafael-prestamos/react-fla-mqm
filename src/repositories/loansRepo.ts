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

/** Aplica un cambio a un préstamo, actualiza updatedAt y lo encola para sync. */
async function mutateLoan(loanId: string, fn: (loan: Loan) => Loan): Promise<void> {
  const current = await db.loans.get(loanId);
  if (!current) return;
  const updated: Loan = { ...fn(current), updatedAt: nowIso() };
  await db.loans.put(updated);
  await enqueue("loans", loanId, "put", updated);
}

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

  /** Registra un abono parcial que reduce el saldo. */
  addPartial(loanId: string, amountCents: number): Promise<void> {
    return mutateLoan(loanId, (loan) => ({
      ...loan,
      paidOffCents: loan.paidOffCents + amountCents,
    }));
  },

  /**
   * Renovación por "solo interés": inicia un nuevo ciclo desde la fecha de
   * vencimiento (corre la entrega un plazo hacia adelante) y limpia los abonos.
   */
  renew(loanId: string): Promise<void> {
    return mutateLoan(loanId, (loan) => {
      const disbursed = new Date(loan.disbursedAt);
      disbursed.setDate(disbursed.getDate() + loan.termDays);
      return {
        ...loan,
        disbursedAt: toIsoDate(disbursed),
        paidOffCents: 0,
        renewalCount: loan.renewalCount + 1,
      };
    });
  },

  /** Marca el préstamo como pagado por completo. */
  markPaid(loanId: string): Promise<void> {
    return mutateLoan(loanId, (loan) => ({ ...loan, isPaid: true }));
  },
};
