/**
 * Reglas de negocio del préstamo — funciones PURAS (sin estado, fáciles de testear).
 * Patrón: Domain Model / Pure Functions.
 *
 * Reglas confirmadas con el cliente:
 *  - interés = capital × tasa (interés simple, NO compuesto)
 *  - total = capital + interés
 *  - plazos 25 / 28 / 30 días
 *  - tolerancia de 7 días de atraso sin penalidad
 *
 *  ⚠️ REGLA DE MAYOR RIESGO — mora por atraso (interés extra):
 *     pasados los 7 días de tolerancia corre 1 interés adicional (sobre el capital)
 *     por cada 30 días de atraso.
 *     Está marcada como PENDIENTE de confirmación VERBAL con el cliente antes de
 *     activarla de forma definitiva en Sprint 3. Por eso vive detrás del flag
 *     LATE_INTEREST_ENABLED para poder apagarla sin tocar la UI.
 */

import type { Loan, ClientRating } from "../types/domain";
import { addDays, diffDays, startOfToday } from "../lib/dates";

export const GRACE_DAYS = 7;
export const LATE_PERIOD_DAYS = 30;

/** ⚠️ Desactivada explícitamente antes del release a producción — sin confirmación escrita de Fla. Reactivar solo con esa confirmación. */
export const LATE_INTEREST_ENABLED: boolean = false;

/** Umbrales de clasificación automática del cliente (en días de atraso). */
export const SLOW_PAYER_DAYS = 7;
export const BAD_PAYER_DAYS = 30;

/** Estado operativo de un préstamo para la vista de cobranza. */
export type LoanStatus =
  | "active" // al día
  | "dueSoon" // por vencer (<= 3 días)
  | "dueToday" // vence hoy
  | "grace" // atrasado dentro de la tolerancia
  | "lateInterest" // atrasado con interés extra corriendo
  | "paid"; // pagado

/** Resultado del cálculo derivado de un préstamo. */
export interface LoanDerived {
  disbursedDate: Date;
  dueDate: Date;
  interestCents: number;
  totalCents: number; // capital + interés
  daysLate: number; // > 0 = atrasado
  latePeriods: number; // períodos de interés extra corridos
  lateInterestCents: number;
  debtCents: number; // total + interés extra
  balanceCents: number; // deuda - abonos
  status: LoanStatus;
}

/**
 * Calcula los períodos de interés extra por atraso.
 * 0 dentro de la tolerancia; luego 1 período por cada bloque de 30 días.
 */
export const computeLatePeriods = (daysLate: number): number => {
  if (!LATE_INTEREST_ENABLED) return 0;
  if (daysLate <= GRACE_DAYS) return 0;
  return 1 + Math.floor((daysLate - (GRACE_DAYS + 1)) / LATE_PERIOD_DAYS);
};

/** Deriva todos los valores calculados de un préstamo a una fecha de referencia. */
export const deriveLoan = (loan: Loan, reference: Date = startOfToday()): LoanDerived => {
  const disbursedDate = new Date(loan.disbursedAt);
  const dueDate = addDays(disbursedDate, loan.termDays);
  const interestCents = Math.round(loan.principalCents * loan.rate);
  const totalCents = loan.principalCents + interestCents;

  const daysLate = diffDays(reference, dueDate);
  const latePeriods = computeLatePeriods(daysLate);
  const lateInterestCents = latePeriods * interestCents;
  const debtCents = totalCents + lateInterestCents;
  const balanceCents = loan.isPaid ? 0 : Math.max(0, debtCents - loan.paidOffCents);

  let status: LoanStatus;
  if (loan.isPaid || balanceCents === 0) status = "paid";
  else if (daysLate > GRACE_DAYS) status = "lateInterest";
  else if (daysLate > 0) status = "grace";
  else if (daysLate === 0) status = "dueToday";
  else if (daysLate >= -3) status = "dueSoon";
  else status = "active";

  return {
    disbursedDate,
    dueDate,
    interestCents,
    totalCents,
    daysLate,
    latePeriods,
    lateInterestCents,
    debtCents,
    balanceCents,
    status,
  };
};

/** Clasifica al cliente según su mayor atraso (histórico o vigente). */
export const classifyByMaxDaysLate = (maxDaysLate: number): ClientRating => {
  if (maxDaysLate > BAD_PAYER_DAYS) return "bad";
  if (maxDaysLate > SLOW_PAYER_DAYS) return "slow";
  return "good";
};
