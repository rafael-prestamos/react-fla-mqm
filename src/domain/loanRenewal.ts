/**
 * Renovación flexible de préstamos (Sprint 7d-1) — funciones PURAS.
 * Patrón: Domain Model / Pure Functions.
 *
 * Modelo: cada renovación crea un préstamo NUEVO (con su propio capital, interés y plazo,
 * definidos manualmente por Fla) enlazado al anterior vía `renewedFromLoanId`. El préstamo
 * anterior queda cerrado (isPaid) y el monto recibido — cualquiera, incluido 0 — se registra
 * como un pago de tipo "interest" (renovación) sobre el préstamo anterior. Si es 0, no hay pago.
 *
 * Reglas:
 *  - El capital del nuevo préstamo NO se deriva de lo recibido: lo define Fla.
 *  - Fecha de inicio del nuevo préstamo = vencimiento del anterior (comportamiento histórico).
 *  - Vencimiento del nuevo = inicio + plazo elegido (lo calcula deriveLoan como siempre).
 *  - Interés 0 es válido (igual que en préstamo nuevo, sprint 7b-1).
 */

import type { Loan, PaymentMethod } from "../types/domain";
import { deriveLoan } from "./loanRules";
import { isValidLoanTerm, LOAN_TERM_MIN, LOAN_TERM_MAX } from "./loanTerm";
import type { PaymentRecord } from "./loanPayment";
import { toLocalIsoDate } from "../lib/dates";

export interface RenewLoanInput {
  loan: Loan;
  receivedCents: number; // lo que entregó el cliente (>= 0)
  principalCents: number; // capital del nuevo préstamo
  rate: number; // tasa decimal del nuevo préstamo (0 permitido)
  termDays: number; // plazo del nuevo préstamo (1-365)
  method: PaymentMethod;
  reference?: Date; // fecha de referencia para daysLate (default: hoy)
}

export interface RenewLoanErrors {
  receivedCents?: string;
  principalCents?: string;
  rate?: string;
  termDays?: string;
}

/** Préstamo nuevo listo para persistir, salvo el id (lo asigna el repositorio). */
export type NewLoanDraft = Omit<Loan, "id">;

export interface RenewLoanResult {
  closedLoan: Loan;
  newLoan: NewLoanDraft;
  paymentRecord: PaymentRecord | null; // null cuando receivedCents === 0
}

export function validateRenewLoanInput(
  input: Omit<RenewLoanInput, "loan" | "method" | "reference">,
): { ok: boolean; errors: RenewLoanErrors } {
  const errors: RenewLoanErrors = {};
  if (!Number.isInteger(input.receivedCents) || input.receivedCents < 0) {
    errors.receivedCents = "El monto recibido no puede ser negativo";
  }
  if (!Number.isInteger(input.principalCents) || input.principalCents <= 0) {
    errors.principalCents = "El capital debe ser mayor a 0";
  }
  if (!Number.isFinite(input.rate) || input.rate < 0) {
    errors.rate = "El interés no puede ser negativo";
  }
  if (!isValidLoanTerm(input.termDays)) {
    errors.termDays = `El plazo debe ser un entero entre ${LOAN_TERM_MIN} y ${LOAN_TERM_MAX} días`;
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function renewLoan(input: RenewLoanInput, now: Date = new Date()): RenewLoanResult {
  const { ok, errors } = validateRenewLoanInput(input);
  if (!ok) throw new RangeError(Object.values(errors).join(", "));
  if (input.loan.isPaid) throw new Error("El préstamo ya está pagado");
  if (input.loan.cancelledAt) throw new Error("El préstamo está anulado");

  const reference = input.reference ?? now;
  const derived = deriveLoan(input.loan, reference);
  const timestamp = now.toISOString();

  // El anterior se cierra tal cual: paidOffCents no incluye el interés (misma convención que el modelo legado).
  const closedLoan: Loan = { ...input.loan, isPaid: true, updatedAt: timestamp };

  const newLoan: NewLoanDraft = {
    clientId: input.loan.clientId,
    principalCents: input.principalCents,
    rate: input.rate,
    termDays: input.termDays,
    // disbursedAt es date-only — toLocalIsoDate, nunca toISOString (UTC).
    disbursedAt: toLocalIsoDate(derived.dueDate),
    paidOffCents: 0,
    renewalCount: input.loan.renewalCount + 1,
    isPaid: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    cancelledAt: null,
    cancelReason: null,
    editedAt: null,
    renewedFromLoanId: input.loan.id,
  };

  let paymentRecord: PaymentRecord | null = null;
  if (input.receivedCents > 0) {
    const interestOfCycle = derived.interestCents + derived.lateInterestCents;
    const interestPaidCents = Math.min(input.receivedCents, interestOfCycle);
    paymentRecord = {
      type: "interest",
      amountCents: input.receivedCents,
      interestPaidCents,
      principalPaidCents: input.receivedCents - interestPaidCents,
      method: input.method,
      daysLate: derived.daysLate,
    };
  }

  return { closedLoan, newLoan, paymentRecord };
}

/**
 * Detecta si un pago es la "renovación de cierre" del modelo 7d-1: un pago de tipo "interest"
 * que es el último activo de un préstamo cerrado por renovación (isPaid, o con un préstamo hijo
 * `renewedFromLoanId` — aunque ese hijo esté anulado y el padre se haya reabierto). En el modelo
 * legado (renovación in-place) eso nunca ocurre: el último pago de un préstamo pagado es siempre
 * "full"/"partial". Lo usan la reconstrucción de saldos (comprobantes) y la anulación de pagos
 * para no aplicar la lógica legada de "correr la fecha del ciclo" a un pago que no la corrió.
 */
export function isClosingRenewalPayment(
  loan: Loan,
  chronologicalActivePayments: { id: string; type: string }[],
  paymentId: string,
  hasRenewalChild = false,
): boolean {
  if (!loan.isPaid && !hasRenewalChild) return false;
  const last = chronologicalActivePayments[chronologicalActivePayments.length - 1];
  return !!last && last.id === paymentId && last.type === "interest";
}
