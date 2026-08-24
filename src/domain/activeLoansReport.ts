import type { Client, Loan } from "../types/domain";
import { deriveLoan, type LoanDerived } from "./loanRules";
import { startOfToday } from "../lib/dates";

export interface ActiveLoanReportRow {
  loan: Loan;
  client: Client;
  derived: LoanDerived;
}

export interface ActiveLoansReport {
  rows: ActiveLoanReportRow[];
  totalPrincipalCents: number;
  totalBalanceCents: number;
  count: number;
}

/**
 * Construye las filas del reporte de "Préstamos activos" (sprint 7c-3): solo
 * préstamos con `!isPaid && !cancelledAt` (excluye anulados y pagados),
 * ordenados por nombre de cliente, con los totales de capital y saldo.
 */
export function buildActiveLoansReport(clients: Client[], loans: Loan[], reference: Date = startOfToday()): ActiveLoansReport {
  const rows: ActiveLoanReportRow[] = [];
  for (const loan of loans) {
    if (loan.isPaid || loan.cancelledAt) continue;
    const client = clients.find((c) => c.id === loan.clientId);
    if (!client) continue;
    rows.push({ loan, client, derived: deriveLoan(loan, reference) });
  }
  rows.sort((a, b) => a.client.name.localeCompare(b.client.name));

  return {
    rows,
    totalPrincipalCents: rows.reduce((sum, r) => sum + r.loan.principalCents, 0),
    totalBalanceCents: rows.reduce((sum, r) => sum + r.derived.balanceCents, 0),
    count: rows.length,
  };
}
