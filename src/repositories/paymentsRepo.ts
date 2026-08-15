/**
 * Repository de pagos. Guarda el historial de cada movimiento (total, interés, abono)
 * que luego alimenta la clasificación del cliente y el panel de cobranzas.
 */

import { db } from "../db/database";
import { enqueue } from "../sync/outbox";
import { newId, nowIso } from "../lib/id";
import type { Payment, PaymentMethod, PaymentType } from "../types/domain";

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

  /** Edita campos de un pago existente. Sprint 6a-8. */
  async update(id: string, patch: Partial<Pick<Payment, "amountCents" | "method">>): Promise<void> {
    const current = await db.payments.get(id);
    if (!current) throw new Error("Pago no encontrado");
    if (current.cancelledAt) throw new Error("No se puede editar un pago anulado");
    const updated: Payment = { ...current, ...patch, editedAt: nowIso() };
    await db.payments.put(updated);
    await enqueue("payments", id, "put", updated);
  },

  /** Anula un pago individual. Sprint 6a-8. */
  async cancel(id: string, reason?: string): Promise<void> {
    const current = await db.payments.get(id);
    if (!current) throw new Error("Pago no encontrado");
    if (current.cancelledAt) throw new Error("Pago ya anulado");
    const cancelled: Payment = { ...current, cancelledAt: nowIso(), cancelReason: reason ?? null };
    await db.payments.put(cancelled);
    await enqueue("payments", id, "put", cancelled);
  },
};
