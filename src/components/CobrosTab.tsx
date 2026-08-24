import { useMemo, useState } from "react";
import { Coins } from "lucide-react";
import type { Client, Loan, Payment } from "../types/domain";
import { formatSoles, formatRatePercent } from "../lib/money";
import { formatShort } from "../lib/dates";
import { paymentMethodLabel } from "../pdf/formatters";
import { clientNameMatches } from "../domain/clientName";
import { matchesDateFilter, sumPaymentsCents, type PaymentsDateFilter } from "../domain/paymentsFilter";

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

/** Patrón: Presentational — vista de Cobros (sprint 7c-2), sin lógica de dominio propia (filtros puros en paymentsFilter.ts). */
export function CobrosTab({ clients, loans, payments }: Props) {
  const [month, setMonth] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [clientSearch, setClientSearch] = useState("");

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

  const dateFilter: PaymentsDateFilter = month ? { month } : { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };

  const filteredRows = useMemo(
    () => rows.filter((r) => matchesDateFilter(r.payment.paidAt, dateFilter) && (!clientSearch || clientNameMatches(r.client.name, clientSearch))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, month, dateFrom, dateTo, clientSearch]
  );

  const totalCents = sumPaymentsCents(filteredRows.map((r) => r.payment));
  const hasActiveFilter = Boolean(month || dateFrom || dateTo || clientSearch);

  function handleMonthChange(value: string) {
    setMonth(value);
    if (value) {
      setDateFrom("");
      setDateTo("");
    }
  }

  function handleRangeChange(field: "from" | "to", value: string) {
    if (field === "from") setDateFrom(value);
    else setDateTo(value);
    if (value) setMonth("");
  }

  function clearFilters() {
    setMonth("");
    setDateFrom("");
    setDateTo("");
    setClientSearch("");
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "4px 2px 12px" }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Cobros</div>
      </div>

      {payments.length > 0 && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <div className="field" style={{ flex: 1, marginTop: 0 }}>
                <label>Mes</label>
                <input type="month" className="inp" value={month} onChange={(e) => handleMonthChange(e.target.value)} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div className="field" style={{ flex: 1, marginTop: 0 }}>
                <label>Desde</label>
                <input type="date" className="inp" value={dateFrom} onChange={(e) => handleRangeChange("from", e.target.value)} />
              </div>
              <div className="field" style={{ flex: 1, marginTop: 0 }}>
                <label>Hasta</label>
                <input type="date" className="inp" value={dateTo} onChange={(e) => handleRangeChange("to", e.target.value)} />
              </div>
            </div>
            <input
              className="inp"
              placeholder="Buscar por cliente..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
            />
            {hasActiveFilter && (
              <button className="btn" onClick={clearFilters} style={{ background: "var(--card)", border: "1px solid var(--line)", alignSelf: "flex-start" }}>
                Limpiar filtros
              </button>
            )}
          </div>

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
    </>
  );
}
