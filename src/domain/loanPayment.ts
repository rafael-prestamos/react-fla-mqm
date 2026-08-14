import type { Installment, Payment, PaymentMethod } from "../types/domain";
import { deriveInstallment } from "./loanRules";

export interface ApplyPaymentInput {
  installment: Installment;
  amountCents: number;
  method: PaymentMethod;
  reference?: Date;
}

export interface ApplyPaymentResult {
  updatedInstallment: Installment;
  paymentRecord: Omit<Payment, "id" | "loanId">;
}

export function applyPayment(input: ApplyPaymentInput): ApplyPaymentResult {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new RangeError("El monto debe ser un entero mayor a 0");
  }

  const derived = deriveInstallment(input.installment, input.reference);

  if (input.amountCents > derived.totalOwedCents) {
    throw new RangeError("El pago excede lo debido en la cuota");
  }

  const newPaidCents = input.installment.paidCents + input.amountCents;
  const isNowPaid = newPaidCents >= (input.installment.amountCents + derived.lateInterestCents);
  
  const now = input.reference || new Date();
  const nowStr = now.toISOString();

  const updatedInstallment: Installment = {
    ...input.installment,
    paidCents: newPaidCents,
    status: isNowPaid ? "paid" : "pending",
    paidAt: isNowPaid ? nowStr : null,
    updatedAt: nowStr
  };

  const paymentRecord: Omit<Payment, "id" | "loanId"> = {
    installmentId: input.installment.id,
    amountCents: input.amountCents,
    method: input.method,
    daysLate: derived.daysLate,
    paidAt: nowStr
  };

  return { updatedInstallment, paymentRecord };
}
