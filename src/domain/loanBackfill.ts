import type { Loan, Payment, LoanTerm } from "../types/domain";
import { isValidLoanTerm } from "./loanTerm";

import { deriveLoan } from "./loanRules";
import { startOfToday, parseLocalDate } from "../lib/dates";

export interface LoanBackfillInput {
  clientId: string;
  principalCents: number;         // capital original
  rate: number;                   // 0.20 = 20%
  termDays: LoanTerm;             // entero 1-365 días (sprint 6a-4: libre, presets 25/28/30)

  lastCycleStart: string;         // "YYYY-MM-DD" — fecha de entrega si nunca renovó, o de la ÚLTIMA renovación
  renewalCount: number;           // >=0; default 0
  outstandingBalanceCents: number;// SALDO PENDIENTE HOY (lo que Fla tiene en su cuaderno). >0, <= deuda calculada del ciclo actual
  reference?: Date;               // default startOfToday()
}

export interface LoanBackfillErrors {
  clientId?: string;
  principal?: string;
  rate?: string;
  termDays?: string;
  lastCycleStart?: string;
  renewalCount?: string;
  outstandingBalance?: string;
}

export function validateLoanBackfillInput(
  input: LoanBackfillInput
): { ok: boolean; errors: LoanBackfillErrors } {
  const errors: LoanBackfillErrors = {};
  let ok = true;

  if (!input.clientId) {
    errors.clientId = "Selecciona un cliente";
    ok = false;
  }
  if (!Number.isInteger(input.principalCents) || input.principalCents <= 0) {
    errors.principal = "Ingresa un capital válido";
    ok = false;
  }
  if (input.rate < 0 || input.rate > 1) {
    errors.rate = "Ingresa un interés válido";
    ok = false;
  }
  // Patrón: Domain Value Object — isValidLoanTerm valida rango 1-365 (sprint 6a-4)
  if (!isValidLoanTerm(input.termDays)) {
    errors.termDays = "Debe ser un número entero entre 1 y 365";
    ok = false;
  }


  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(input.lastCycleStart)) {
    errors.lastCycleStart = "La fecha no puede ser futura";
    ok = false;
  } else {
    const d = parseLocalDate(input.lastCycleStart);
    if (isNaN(d.getTime())) {
      errors.lastCycleStart = "La fecha no puede ser futura";
      ok = false;
    } else {
      const refDate = input.reference ?? startOfToday();
      if (d > refDate) {
        errors.lastCycleStart = "La fecha no puede ser futura";
        ok = false;
      }
    }
  }

  if (!Number.isInteger(input.renewalCount) || input.renewalCount < 0) {
    errors.renewalCount = "Número de renovaciones inválido";
    ok = false;
  }
  if (!Number.isInteger(input.outstandingBalanceCents) || input.outstandingBalanceCents <= 0) {
    errors.outstandingBalance = "Saldo pendiente inválido";
    ok = false;
  }

  if (ok && typeof input.outstandingBalanceCents === 'number') {
    const previewLoan: Loan = {
      id: "__preview__",
      clientId: input.clientId,
      principalCents: input.principalCents,
      rate: input.rate,
      termDays: input.termDays,
      disbursedAt: input.lastCycleStart,
      paidOffCents: 0,
      renewalCount: input.renewalCount,
      isPaid: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const derived = deriveLoan(previewLoan, input.reference ?? startOfToday());
    if (input.outstandingBalanceCents > derived.debtCents) {
      errors.outstandingBalance = "El saldo pendiente excede la deuda calculada";
      ok = false;
    }
  }

  return { ok, errors };
}

export interface LoanBackfillResult {
  loan: Loan;                     // listo para persistir (id/timestamps los pone el repo)
  syntheticPayment: Payment | null; // solo si hay abonos previos (paidOffCents > 0)
}

/** 
 * Construye el Loan actual y, si aplica, un Payment sintético "Saldo inicial".
 * ⚠️ El cálculo de deuda incluye mora si LATE_INTEREST_ENABLED=true. Ver DECISIONS §5.
 */
export function buildLoanBackfill(
  input: LoanBackfillInput,
  now: Date = new Date()
): LoanBackfillResult {
  const previewLoan: Loan = {
    id: "__preview__",
    clientId: input.clientId,
    principalCents: input.principalCents,
    rate: input.rate,
    termDays: input.termDays,
    disbursedAt: input.lastCycleStart,
    paidOffCents: 0,
    renewalCount: input.renewalCount,
    isPaid: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  const derived = deriveLoan(previewLoan, input.reference ?? startOfToday());
  const paidOffCents = derived.debtCents - input.outstandingBalanceCents;

  const loan: Loan = {
    ...previewLoan,
    paidOffCents,
  };

  let syntheticPayment: Payment | null = null;
  if (paidOffCents > 0) {
    syntheticPayment = {
      id: "__preview__",
      loanId: "__preview__",
      type: "partial",
      amountCents: paidOffCents,
      method: "cash",
      daysLate: 0,
      paidAt: now.toISOString(),
    };
    // Payment sintético de saldo inicial — representa abonos previos consolidados al onboarding; no es un cobro real.
  }

  return { loan, syntheticPayment };
}
