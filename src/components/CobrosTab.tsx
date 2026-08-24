import { useMemo, useState } from "react";
import { Coins, SlidersHorizontal } from "lucide-react";
import type { Client, Loan, Payment } from "../types/domain";
import { formatSoles, formatRatePercent } from "../lib/money";
import { formatShort } from "../lib/dates";
import { paymentMethodLabel } from "../pdf/formatters";
import { clientNameMatches } from "../domain/clientName";
import { matchesDateFilter, sumPaymentsCents, type PaymentsDateFilter } from "../domain/paymentsFilter";
import { PaymentsFilterModal } from "./PaymentsFilterModal";

interface Props {
  clients: Client[];
  loans: Loan[];
  payments: Payment[];
}

interface PaymentRow {
  payment: Payment;
  loan: Loan;
  client: Client;
}

/** Patrón: Presentational — vista de Cobros (sprint 7c-2 + payments-filter-modal), sin lógica de dominio propia (filtros puros en paymentsFilter.ts). */
export function CobrosTab({ clients, loans, payments }: Props) {
  const [dateFilter, setDateFilter] = useState<PaymentsDateFilter>({});
  const [clientSearch, setClientSearch] = useState("");
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const rows = useMemo<PaymentRow[]>(() => {
    const result: PaymentRow[] = [];
    for (const payment of payments) {
      const loan = loans.find((l) => l.id === payment.loanId);
      if (!loan) continue;
      const client = clients.find((c) => c.id === loan.clientId);
      if (!client) continue;
      result.push({ payment, loan, client });
    }
    return result.sort((a, b) => new Date(b.payment.paidAt).getTime() - new Date(a.payment.paidAt).getTime());
  }, [clients, loans, payments]);

  const filteredRows = useMemo(
    () => rows.filter((r) => matchesDateFilter(r.payment.paidAt, dateFilter) && (!clientSearch || clientNameMatches(r.client.name, clientSearch))),
    [rows, dateFilter, clientSearch]
  );

  const totalCents = sumPaymentsCents(filteredRows.map((r) => r.payment));
  const hasDateFilter = Boolean(dateFilter.month || dateFilter.dateFrom || dateFilter.dateTo);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "4px 2px 12px" }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Cobros</div>
        {payments.length > 0 && (
          <button
            className="btn"
            aria-label="Filtrar cobros"
            onClick={() => setFilterModalOpen(true)}
            style={{ background: "var(--card)", border: "1px solid var(--line)", padding: 8, position: "relative" }}
          >
            <SlidersHorizontal size={16} />
            {hasDateFilter && (
              <span style={{ position: "absolute", top: 5, right: 5, width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
            )}
          </button>
        )}
      </div>

      {payments.length > 0 && (
        <>
          <input
            className="inp"
            placeholder="Buscar por cliente..."
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            style={{ marginBottom: 14 }}
          />

          <div className="pf-stat" style={{ marginBottom: 16 }}>
            <div className="k"><Coins size={13} /> Total cobrado</div>
            <div className="v num" style={{ fontSize: 24 }}>{formatSoles(totalCents)}</div>
          </div>
        </>
      )}

      {payments.length === 0 ? (
        <div className="empty">Aún no se han registrado cobros.</div>
      ) : filteredRows.length === 0 ? (
        <div className="empty">No se encontraron cobros para este filtro.</div>
      ) : (
        filteredRows.map(({ payment, loan, client }) => (
          <div key={payment.id} className="row">
            <div className="who">
              <div className="nm">{client.name}</div>
              <div className="sub">
                {formatShort(new Date(payment.paidAt))} · {paymentMethodLabel(payment.method)} · {formatSoles(loan.principalCents)} al {formatRatePercent(loan.rate)}
              </div>
            </div>
            <div className="amt">
              <div className="big num">{formatSoles(payment.amountCents)}</div>
            </div>
          </div>
        ))
      )}

      {filterModalOpen && (
        <PaymentsFilterModal
          filter={dateFilter}
          onClose={() => setFilterModalOpen(false)}
          onApply={setDateFilter}
          onClear={() => setDateFilter({})}
        />
      )}
    </>
  );
}
