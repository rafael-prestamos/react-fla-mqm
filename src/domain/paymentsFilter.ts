import type { Payment } from "../types/domain";
import { parseLocalDate } from "../lib/dates";

/**
 * Filtro de fecha para la vista de Cobros (sprint 7c-2).
 * `month` e intervalo (`dateFrom`/`dateTo`) son mutuamente excluyentes — la UI
 * limpia uno al setear el otro; si igual llegaran ambos, `month` tiene prioridad.
 */
export interface PaymentsDateFilter {
  month?: string; // "YYYY-MM"
  dateFrom?: string; // "YYYY-MM-DD"
  dateTo?: string; // "YYYY-MM-DD"
}

/**
 * true si `paidAt` (timestamp completo, ej. "2025-08-12T15:30:00.000Z") cae
 * dentro del filtro. `paidAt` se parsea con `new Date()` directo — es un
 * timestamp completo, no date-only, así que no aplica el bug de zona horaria
 * documentado para campos como `disbursedAt` (ver CLAUDE.md). Los límites del
 * filtro sí son date-only ("YYYY-MM-DD" de inputs `type="date"`/`type="month"`)
 * y se parsean con `parseLocalDate` para comparar contra la fecha local real.
 */
export function matchesDateFilter(paidAt: string, filter: PaymentsDateFilter): boolean {
  const paid = new Date(paidAt);

  if (filter.month) {
    const [year, month] = filter.month.split("-").map(Number);
    return paid.getFullYear() === year && paid.getMonth() === month - 1;
  }

  if (filter.dateFrom && paid < parseLocalDate(filter.dateFrom)) return false;

  if (filter.dateTo) {
    const to = parseLocalDate(filter.dateTo);
    to.setHours(23, 59, 59, 999); // "hasta" incluye el día completo
    if (paid > to) return false;
  }

  return true;
}

/** Filtra pagos por fecha (mes o intervalo). Sin filtro, devuelve todos. */
export function filterPaymentsByDate(payments: Payment[], filter: PaymentsDateFilter): Payment[] {
  return payments.filter((p) => matchesDateFilter(p.paidAt, filter));
}

/** Suma `amountCents` de una lista de pagos. */
export function sumPaymentsCents(payments: Payment[]): number {
  return payments.reduce((sum, p) => sum + p.amountCents, 0);
}
