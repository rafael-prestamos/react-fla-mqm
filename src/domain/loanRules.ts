import type { Installment, Loan, ClientRating } from "../types/domain";
import { diffDays } from "../lib/dates";

export const GRACE_DAYS = 7;
export const LATE_PERIOD_DAYS = 30;
export const LATE_INTEREST_ENABLED = false;

export type InstallmentLateStatus = "pending" | "dueSoon" | "dueToday" | "grace" | "lateInterest" | "paid";

export interface InstallmentDerived {
  daysLate: number;               // > 0 = atrasada
  latePeriods: number;
  lateInterestCents: number;      // 1 interés proporcional a la cuota por cada 30 días > 7
  remainingBaseCents: number;     // amountCents - paidCents
  totalOwedCents: number;         // remainingBase + lateInterest (si aplica)
  status: InstallmentLateStatus;
}

/**
 * Calcula la mora y el estado de una cuota.
 * Interés proporcional a la cuota: lateInterest = latePeriods * amountCents
 * (aproximación deliberada, confirmar con Fla antes de activar el flag LATE_INTEREST_ENABLED).
 */
export function deriveInstallment(
  installment: Installment,
  reference?: Date
): InstallmentDerived {
  const daysLate = diffDays(reference || new Date(), installment.dueDate);
  const remainingBaseCents = Math.max(0, installment.amountCents - installment.paidCents);
  
  let latePeriods = 0;
  let lateInterestCents = 0;

  if (installment.status !== "paid" && remainingBaseCents > 0) {
    if (daysLate > GRACE_DAYS) {
      latePeriods = Math.floor((daysLate - GRACE_DAYS) / LATE_PERIOD_DAYS) + 1;
      if (LATE_INTEREST_ENABLED) {
        // Mora usando monto base de la cuota como aproximación de penalidad
        lateInterestCents = latePeriods * installment.amountCents;
      }
    }
  }

  const totalOwedCents = remainingBaseCents + lateInterestCents;

  let status: InstallmentLateStatus = "pending";
  if (installment.status === "paid") {
    status = "paid";
  } else if (daysLate > GRACE_DAYS) {
    status = "lateInterest";
  } else if (daysLate > 0) {
    status = "grace";
  } else if (daysLate === 0) {
    status = "dueToday";
  } else if (daysLate >= -3) {
    status = "dueSoon";
  }

  return {
    daysLate,
    latePeriods,
    lateInterestCents,
    remainingBaseCents,
    totalOwedCents,
    status
  };
}

export function derivedLoanTotals(
  loan: Loan,
  installments: Installment[],
  reference?: Date
): {
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  pendingInstallments: number;
  nextDueInstallment: Installment | null;
  status: "active" | "paid";
} {
  let totalCents = 0;
  let paidCents = 0;
  let balanceCents = 0;
  let pendingInstallments = 0;
  let nextDueInstallment: Installment | null = null;

  for (const inst of installments) {
    const derived = deriveInstallment(inst, reference);
    totalCents += inst.amountCents;
    paidCents += inst.paidCents;
    balanceCents += derived.totalOwedCents;

    if (inst.status !== "paid") {
      pendingInstallments++;
      if (!nextDueInstallment || inst.dueDate < nextDueInstallment.dueDate) {
        nextDueInstallment = inst;
      }
    }
  }

  return {
    totalCents,
    paidCents,
    balanceCents,
    pendingInstallments,
    nextDueInstallment,
    status: pendingInstallments === 0 ? "paid" : "active"
  };
}

/**
 * Clasifica a un cliente basado en su máximo atraso histórico.
 */
export function classifyByMaxDaysLate(maxDaysLate: number): ClientRating {
  if (maxDaysLate > 30) return "bad";
  if (maxDaysLate > 7) return "slow";
  return "good";
}
