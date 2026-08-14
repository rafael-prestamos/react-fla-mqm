import type { Loan, PaymentType, PaymentMethod } from "../types/domain";
import { deriveLoan } from "./loanRules";

// ⚠️ La regla de interés por mora aún está pendiente de confirmación verbal con la clienta (ver DECISIONS §5).

export interface ApplyPaymentInput {
  loan: Loan;
  type: PaymentType;
  amountCents: number;
  method: PaymentMethod;
  reference?: Date;
}

export interface PaymentRecord {
  type: PaymentType;
  amountCents: number;
  interestPaidCents: number;
  principalPaidCents: number;
  method: PaymentMethod;
  daysLate: number;
}

export interface ApplyPaymentResult {
  updatedLoan: Loan;
  paymentRecord: PaymentRecord;
}

export function applyPayment(input: ApplyPaymentInput): ApplyPaymentResult {
  const reference = input.reference || new Date();
  const derived = deriveLoan(input.loan, reference);
  
  let amountCents = 0;
  
  const interestOfCycle = derived.interestCents + derived.lateInterestCents;
  const alreadyAppliedToInterest = Math.min(input.loan.paidOffCents, interestOfCycle);
  const remainingInterest = Math.max(0, interestOfCycle - alreadyAppliedToInterest);

  let updatedLoan: Loan = { ...input.loan, updatedAt: new Date().toISOString() };

  if (input.type === "full") {
    amountCents = derived.balanceCents;
    updatedLoan.isPaid = true;
    updatedLoan.paidOffCents += amountCents;
  } else if (input.type === "interest") {
    amountCents = interestOfCycle;
    updatedLoan.renewalCount += 1;
    updatedLoan.paidOffCents = 0;
    // Nueva fecha de entrega es la fecha de vencimiento anterior
    updatedLoan.disbursedAt = derived.dueDate.toISOString();
    updatedLoan.isPaid = false;
  } else if (input.type === "partial") {
    if (input.amountCents <= 0) {
      throw new RangeError("amountCents debe ser > 0");
    }
    if (input.amountCents > derived.balanceCents) {
      throw new RangeError("El abono excede el saldo");
    }
    amountCents = input.amountCents;
    updatedLoan.paidOffCents += amountCents;
    if (derived.balanceCents - amountCents === 0) {
      updatedLoan.isPaid = true;
    }
  }

  const interestPaidCents = input.type === "interest" 
    ? amountCents 
    : Math.min(amountCents, remainingInterest);
    
  const principalPaidCents = Math.max(0, amountCents - interestPaidCents);

  const paymentRecord: PaymentRecord = {
    type: input.type,
    amountCents,
    interestPaidCents,
    principalPaidCents,
    method: input.method,
    daysLate: derived.daysLate,
  };

  return {
    updatedLoan,
    paymentRecord,
  };
}
