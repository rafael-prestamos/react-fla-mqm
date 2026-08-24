import type { Client, Loan, Payment } from "../types/domain";
import { clientNameMatches } from "./clientName";
import { matchesDateFilter, type PaymentsDateFilter } from "./paymentsFilter";
import { parseLocalDate, formatShortDash } from "../lib/dates";

export interface PaymentReportRow {
  payment: Payment;
  loan: Loan;
  client: Client;
}

/**
 * Construye las filas de la vista/reporte de Cobros: hace el join
 * payment→loan→client y aplica los mismos filtros de fecha + cliente que
 * `CobrosTab` (única fuente de verdad, reusada también al generar el PDF
 * para que "recibe los datos filtrados correctos" — sprint 7c-3).
 */
export function buildPaymentReportRows(
  clients: Client[],
  loans: Loan[],
  payments: Payment[],
  filter: PaymentsDateFilter,
  clientSearch: string
): PaymentReportRow[] {
  const rows: PaymentReportRow[] = [];
  for (const payment of payments) {
    if (!matchesDateFilter(payment.paidAt, filter)) continue;
    const loan = loans.find((l) => l.id === payment.loanId);
    if (!loan) continue;
    const client = clients.find((c) => c.id === loan.clientId);
    if (!client) continue;
    if (clientSearch && !clientNameMatches(client.name, clientSearch)) continue;
    rows.push({ payment, loan, client });
  }
  return rows.sort((a, b) => new Date(b.payment.paidAt).getTime() - new Date(a.payment.paidAt).getTime());
}

const MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/**
 * Subtítulo legible del período del filtro activo, para el PDF de Cobros.
 * Fechas de filtro (`month`/`dateFrom`/`dateTo`) son date-only — se parsean
 * con `parseLocalDate`, nunca `new Date(string)` directo.
 */
export function paymentsReportSubtitle(filter: PaymentsDateFilter, clientSearch: string): string {
  let period: string;
  if (filter.month) {
    const [year, month] = filter.month.split("-").map(Number);
    period = `${MONTH_NAMES_ES[month - 1]} ${year}`;
  } else if (filter.dateFrom && filter.dateTo) {
    period = `${formatShortDash(parseLocalDate(filter.dateFrom))} al ${formatShortDash(parseLocalDate(filter.dateTo))}`;
  } else if (filter.dateFrom) {
    period = `Desde ${formatShortDash(parseLocalDate(filter.dateFrom))}`;
  } else if (filter.dateTo) {
    period = `Hasta ${formatShortDash(parseLocalDate(filter.dateTo))}`;
  } else {
    period = "Todos los cobros";
  }

  return clientSearch.trim() ? `${period} · Cliente: ${clientSearch.trim().toLocaleUpperCase("es-PE")}` : period;
}
