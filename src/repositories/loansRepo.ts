/**
 * Repository de préstamos.
 * Encapsula las mutaciones de negocio (crear, abonar, renovar, marcar pagado)
 * y las encola en el outbox para sync.
 */

import { db } from "../db/database";
import { enqueue } from "../sync/outbox";
import { newId, nowIso } from "../lib/id";
import { toLocalIsoDate, startOfToday } from "../lib/dates";
import type { Loan, LoanTerm } from "../types/domain";
import { assertValidLoanTerm } from "../domain/loanTerm";

import { applyPayment, type ApplyPaymentInput, type ApplyPaymentResult } from "../domain/loanPayment";
import { renewLoan, type RenewLoanInput } from "../domain/loanRenewal";
import { paymentsRepo } from "./paymentsRepo";
import { validateLoanBackfillInput, buildLoanBackfill, type LoanBackfillInput } from "../domain/loanBackfill";
import type { Payment } from "../types/domain";



export const loansRepo = {
  all(): Promise<Loan[]> {
    return db.loans.filter((loan) => !loan.cancelledAt).toArray();
  },

  active(): Promise<Loan[]> {
    return db.loans.filter((loan) => !loan.isPaid && !loan.cancelledAt).toArray();
  },

  byClient(clientId: string): Promise<Loan[]> {
    return db.loans.where("clientId").equals(clientId).filter((loan) => !loan.cancelledAt).toArray();
  },

  /** Crea un préstamo entregado hoy. */
  async create(input: {
    clientId: string;
    principalCents: number;
    rate: number;
    termDays: LoanTerm;
  }): Promise<Loan> {
    // Patrón: Repository — defensa en profundidad: validar antes de persistir
    assertValidLoanTerm(input.termDays);
    const timestamp = nowIso();

    const loan: Loan = {
      id: newId(),
      clientId: input.clientId,
      principalCents: input.principalCents,
      rate: input.rate,
      termDays: input.termDays,
      disbursedAt: toLocalIsoDate(startOfToday()),
      paidOffCents: 0,
      renewalCount: 0,
      isPaid: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      cancelledAt: null,
      cancelReason: null,
      editedAt: null,
    };
    await db.loans.put(loan);
    await enqueue("loans", loan.id, "put", loan);
    return loan;
  },



  async applyPayment(input: ApplyPaymentInput): Promise<ApplyPaymentResult & { payment: Payment }> {
    const current = await db.loans.get(input.loan.id);
    if (!current) throw new Error("Préstamo no encontrado");

    const result = applyPayment({ ...input, loan: current });
    let payment: Payment | undefined;

    await db.transaction("rw", db.loans, db.payments, db.outbox, async () => {
      await db.loans.put(result.updatedLoan);
      await enqueue("loans", result.updatedLoan.id, "put", result.updatedLoan);

      payment = await paymentsRepo.create({
        loanId: result.updatedLoan.id,
        type: result.paymentRecord.type,
        amountCents: result.paymentRecord.amountCents,
        method: result.paymentRecord.method,
        daysLate: result.paymentRecord.daysLate,
      });
    });

    return { ...result, payment: payment! };
  },

  /**
   * Renovación flexible (Sprint 7d-1). Transacción única: cierra el préstamo anterior,
   * crea el nuevo (capital/interés/plazo definidos por Fla, enlazado vía renewedFromLoanId)
   * y registra el monto recibido como pago del anterior — mismo flujo que un pago normal
   * (paymentsRepo.create → outbox → sync). Si receivedCents es 0, no se crea pago.
   */
  async renew(input: RenewLoanInput): Promise<{ closedLoan: Loan; newLoan: Loan; payment: Payment | null }> {
    const current = await db.loans.get(input.loan.id);
    if (!current) throw new Error("Préstamo no encontrado");

    const result = renewLoan({ ...input, loan: current });
    const newLoan: Loan = { ...result.newLoan, id: newId() };
    let payment: Payment | null = null;

    await db.transaction("rw", db.loans, db.payments, db.outbox, async () => {
      await db.loans.put(result.closedLoan);
      await enqueue("loans", result.closedLoan.id, "put", result.closedLoan);

      await db.loans.put(newLoan);
      await enqueue("loans", newLoan.id, "put", newLoan);

      if (result.paymentRecord) {
        payment = await paymentsRepo.create({
          loanId: result.closedLoan.id,
          type: result.paymentRecord.type,
          amountCents: result.paymentRecord.amountCents,
          method: result.paymentRecord.method,
          daysLate: result.paymentRecord.daysLate,
        });
      }
    });

    return { closedLoan: result.closedLoan, newLoan, payment };
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

  /** Edita campos de un préstamo existente. Sprint 6a-8. */
  async update(id: string, patch: Partial<Pick<Loan, "principalCents" | "rate" | "termDays" | "disbursedAt">>): Promise<void> {
    const current = await db.loans.get(id);
    if (!current) throw new Error("Préstamo no encontrado");
    if (current.cancelledAt) throw new Error("No se puede editar un préstamo anulado");

    // Sprint 6a-8c: no editar préstamos que ya tienen pagos activos (evita inconsistencia)
    const activePayments = await db.payments.where("loanId").equals(id)
      .filter((p) => !p.cancelledAt).count();
    if (activePayments > 0) throw new Error("No se puede editar un préstamo con pagos registrados. Anula los pagos primero.");

    if (patch.termDays !== undefined) assertValidLoanTerm(patch.termDays);
    const timestamp = nowIso();
    const updated: Loan = { ...current, ...patch, editedAt: timestamp, updatedAt: timestamp };
    await db.loans.put(updated);
    await enqueue("loans", id, "put", updated);
  },

  /** Anula un préstamo y todos sus pagos activos (cascada). Sprint 6a-8. */
  async cancel(id: string, reason?: string): Promise<{ cancelledPaymentIds: string[] }> {
    const current = await db.loans.get(id);
    if (!current) throw new Error("Préstamo no encontrado");
    if (current.cancelledAt) throw new Error("Préstamo ya anulado");
    const activePayments = (await db.payments.where("loanId").equals(id).toArray()).filter((payment) => !payment.cancelledAt);
    const timestamp = nowIso();

    // Sprint 7d-1: si este préstamo es una renovación, el anterior se reabre (vuelve a estar activo),
    // porque fue cerrado únicamente por esta renovación. El pago de renovación registrado sobre el
    // anterior se conserva (fue dinero recibido); Fla puede anularlo aparte si corresponde.
    const origin = current.renewedFromLoanId ? await db.loans.get(current.renewedFromLoanId) : undefined;
    const reopenOrigin = !!origin && origin.isPaid && !origin.cancelledAt;

    await db.transaction("rw", db.loans, db.payments, db.outbox, async () => {
      const cancelledLoan: Loan = { ...current, cancelledAt: timestamp, cancelReason: reason ?? null, updatedAt: timestamp };
      await db.loans.put(cancelledLoan);
      await enqueue("loans", id, "put", cancelledLoan);
      for (const payment of activePayments) {
        const cancelledPayment: Payment = { ...payment, cancelledAt: timestamp, cancelReason: "Préstamo anulado" };
        await db.payments.put(cancelledPayment);
        await enqueue("payments", payment.id, "put", cancelledPayment);
      }
      if (reopenOrigin && origin) {
        const reopened: Loan = { ...origin, isPaid: false, updatedAt: timestamp };
        await db.loans.put(reopened);
        await enqueue("loans", reopened.id, "put", reopened);
      }
    });
    return { cancelledPaymentIds: activePayments.map((payment) => payment.id) };
  },
};
