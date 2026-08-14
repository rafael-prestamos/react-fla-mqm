import { db } from "../db/database";
import { enqueue } from "../sync/outbox";
import { newId, nowIso } from "../lib/id";
import type { Installment, Payment, PaymentMethod } from "../types/domain";
import { applyPayment } from "../domain/loanPayment";

export const installmentsRepo = {
  all(): Promise<Installment[]> {
    return db.installments.toArray();
  },

  byLoan(loanId: string): Promise<Installment[]> {
    return db.installments.where("loanId").equals(loanId).toArray();
  },

  pendingByLoan(loanId: string): Promise<Installment[]> {
    return db.installments
      .where("loanId").equals(loanId)
      .filter(i => i.status !== "paid")
      .toArray();
  },

  async applyPayment(
    installmentId: string,
    amountCents: number,
    method: PaymentMethod,
    reference?: Date
  ): Promise<{ payment: Payment; installment: Installment }> {
    return db.transaction("rw", db.loans, db.installments, db.payments, db.outbox, async () => {
      const currentInst = await db.installments.get(installmentId);
      if (!currentInst) throw new Error("Cuota no encontrada");

      const result = applyPayment({
        installment: currentInst,
        amountCents,
        method,
        reference
      });

      const updatedInstallment = result.updatedInstallment;
      const payment: Payment = {
        ...result.paymentRecord,
        id: newId(),
        loanId: currentInst.loanId
      };

      await db.installments.put(updatedInstallment);
      await enqueue("installments", updatedInstallment.id, "put", updatedInstallment);

      await db.payments.put(payment);
      await enqueue("payments", payment.id, "put", payment);

      // Check if loan is fully paid
      if (updatedInstallment.status === "paid") {
        const pendingCount = await db.installments
          .where("loanId").equals(currentInst.loanId)
          .filter(i => i.status !== "paid")
          .count();

        if (pendingCount === 0) {
          const loan = await db.loans.get(currentInst.loanId);
          if (loan) {
            loan.isPaid = true;
            loan.updatedAt = nowIso();
            await db.loans.put(loan);
            await enqueue("loans", loan.id, "put", loan);
          }
        }
      }

      return { payment, installment: updatedInstallment };
    });
  }
};
