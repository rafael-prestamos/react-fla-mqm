/**
 * Repository de pagos. Guarda el historial de cada movimiento (total, interés, abono)
 * que luego alimenta la clasificación del cliente y el panel de cobranzas.
 */

import { db } from "../db/database";
import { enqueue } from "../sync/outbox";
import { newId, nowIso } from "../lib/id";
import { isClosingRenewalPayment } from "../domain/loanRenewal";
import type { Loan, Payment, PaymentMethod, PaymentType } from "../types/domain";

export const paymentsRepo = {
  all(): Promise<Payment[]> {
    return db.payments.filter((payment) => !payment.cancelledAt).toArray();
  },

  byLoan(loanId: string): Promise<Payment[]> {
    return db.payments.where("loanId").equals(loanId).filter((payment) => !payment.cancelledAt).toArray();
  },

  /** Registra un pago en el historial. */
  async create(input: {
    loanId: string;
    type: PaymentType;
    amountCents: number;
    method: PaymentMethod;
    daysLate: number;
  }): Promise<Payment> {
    const payment: Payment = {
      id: newId(),
      loanId: input.loanId,
      type: input.type,
      amountCents: input.amountCents,
      method: input.method,
      daysLate: input.daysLate,
      paidAt: nowIso(),
      cancelledAt: null,
      cancelReason: null,
      editedAt: null,
    };
    await db.payments.put(payment);
    await enqueue("payments", payment.id, "put", payment);
    return payment;
  },

  /** Edita solo el método de pago. Sprint 6a-8b: el monto se corrige anulando y re-registrando. */
  async update(id: string, patch: Pick<Payment, "method">): Promise<void> {
    const current = await db.payments.get(id);
    if (!current) throw new Error("Pago no encontrado");
    if (current.cancelledAt) throw new Error("No se puede editar un pago anulado");
    const updated: Payment = { ...current, method: patch.method, editedAt: nowIso() };
    await db.payments.put(updated);
    await enqueue("payments", id, "put", updated);
  },

  /** Anula el último pago activo y reconstruye el estado del préstamo. Sprint 6a-8b. */
  async cancel(id: string, reason?: string): Promise<void> {
    const current = await db.payments.get(id);
    if (!current) throw new Error("Pago no encontrado");
    if (current.cancelledAt) throw new Error("Pago ya anulado");
    const activePayments = await db.payments.where("loanId").equals(current.loanId)
      .filter((payment) => !payment.cancelledAt)
      .toArray();
    const newestFirst = activePayments.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
    if (newestFirst.length === 0 || newestFirst[0].id !== id) {
      throw new Error("Solo se puede anular el último pago del préstamo. Anula primero los pagos más recientes.");
    }

    const loan = await db.loans.get(current.loanId);
    if (!loan) throw new Error("Préstamo no encontrado");
    const timestamp = nowIso();
    const remainingPayments = newestFirst.filter((payment) => payment.id !== id)
      .sort((a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime());

    // Sprint 7d-1: un pago de "renovación de cierre" (modelo préstamo-nuevo) no corrió la fecha del
    // ciclo ni incrementó renewalCount — no se reconstruye como una renovación legada in-place.
    // Mientras el préstamo renovado (hijo) siga activo, no se puede anular: primero se anula el hijo
    // (eso reabre este préstamo) y recién después el pago.
    const renewalChildren = await db.loans.filter((candidate) => candidate.renewedFromLoanId === loan.id).toArray();
    const chronological = [...newestFirst].reverse();
    const closingRenewal = isClosingRenewalPayment(loan, chronological, id, renewalChildren.length > 0);
    if (closingRenewal && renewalChildren.some((child) => !child.cancelledAt)) {
      throw new Error("Este pago cerró una renovación. Anula primero el préstamo renovado y luego este pago.");
    }

    await db.transaction("rw", db.payments, db.loans, db.outbox, async () => {
      const cancelled: Payment = { ...current, cancelledAt: timestamp, cancelReason: reason ?? null };
      await db.payments.put(cancelled);
      await enqueue("payments", id, "put", cancelled);

      const updatedLoan = rebuildLoanAfterPaymentCancellation(loan, current, remainingPayments, timestamp, closingRenewal);
      await db.loans.put(updatedLoan);
      await enqueue("loans", loan.id, "put", updatedLoan);
    });
  },
};

function rebuildLoanAfterPaymentCancellation(loan: Loan, cancelledPayment: Payment, remainingPayments: Payment[], timestamp: string, closingRenewal = false): Loan {
  let paidOffCents = 0;
  let isPaid = false;

  for (const payment of remainingPayments) {
    if (payment.type === "partial" || payment.type === "full") paidOffCents += payment.amountCents;
    if (payment.type === "full") isPaid = true;
  }

  // Sprint 7d-1: renewalCount solo baja si el pago anulado fue una renovación legada (in-place).
  // Una renovación de cierre (modelo préstamo-nuevo) nunca lo incrementó, ni corrió la fecha.
  const legacyRenewalCancelled = cancelledPayment.type === "interest" && !closingRenewal;
  const renewalCount = legacyRenewalCancelled ? Math.max(0, loan.renewalCount - 1) : loan.renewalCount;

  let disbursedAt = loan.disbursedAt;
  if (legacyRenewalCancelled) {
    const date = new Date(`${loan.disbursedAt}T00:00:00`);
    date.setDate(date.getDate() - loan.termDays);
    disbursedAt = date.toISOString().slice(0, 10);
  }

  return { ...loan, paidOffCents, renewalCount, isPaid, disbursedAt, updatedAt: timestamp };
}
