import type { Loan, Payment } from "../types/domain";
import { applyPayment } from "./loanPayment";
import { deriveLoan } from "./loanRules";
import { isClosingRenewalPayment } from "./loanRenewal";
import { addDays, parseLocalDate, toLocalIsoDate } from "../lib/dates";

/**
 * Reconstruye el saldo del préstamo justo después de un pago histórico específico,
 * para poder re-generar su comprobante en cualquier momento. No duplica la lógica
 * de interés/mora/renovación: reproduce la secuencia de pagos activos del préstamo
 * desde el primer ciclo usando applyPayment y deriveLoan tal cual existen.
 *
 * Sprint 7d-1: si el último pago es una "renovación de cierre" (modelo préstamo-nuevo),
 * ese pago NO corrió la fecha del ciclo — el saldo de este préstamo tras él es 0 (el
 * saldo vigente vive en el préstamo renovado). `hasRenewalChild` permite detectarlo
 * aunque el préstamo se haya reabierto por anulación del hijo.
 */
export function balanceCentsAfterPayment(
  loan: Loan,
  activePayments: Payment[],
  targetPaymentId: string,
  hasRenewalChild = false,
): number {
  const chronological = [...activePayments].sort((a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime());
  const targetIndex = chronological.findIndex((p) => p.id === targetPaymentId);
  if (targetIndex === -1) {
    throw new Error("Pago no encontrado en el historial del préstamo");
  }

  const last = chronological[chronological.length - 1];
  const closingRenewalId = isClosingRenewalPayment(loan, chronological, last.id, hasRenewalChild) ? last.id : null;
  if (closingRenewalId === targetPaymentId) return 0;

  // Solo las renovaciones legadas (in-place) corrieron disbursedAt; la de cierre no.
  const totalRenewals = chronological.filter((p) => p.type === "interest" && p.id !== closingRenewalId).length;
  // disbursedAt es date-only — parsear/reserializar en local, no UTC, para que siga siendo
  // parseable por parseLocalDate más abajo (vía deriveLoan/applyPayment).
  const originalDisbursedAt = toLocalIsoDate(
    addDays(parseLocalDate(loan.disbursedAt), -totalRenewals * loan.termDays)
  );

  let state: Loan = { ...loan, paidOffCents: 0, renewalCount: 0, isPaid: false, disbursedAt: originalDisbursedAt };

  for (let i = 0; i <= targetIndex; i++) {
    const payment = chronological[i];
    const { updatedLoan } = applyPayment({
      loan: state,
      type: payment.type,
      amountCents: payment.amountCents,
      method: payment.method,
      reference: new Date(payment.paidAt),
    });
    state = updatedLoan;
  }

  const target = chronological[targetIndex];
  return deriveLoan(state, new Date(target.paidAt)).balanceCents;
}
