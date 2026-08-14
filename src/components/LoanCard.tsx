import { useState } from "react";
import { formatSoles } from "../lib/money";
import { formatShort } from "../lib/dates";
import { deriveLoan } from "../domain/loanRules";
import { InstallmentRow } from "./InstallmentRow";
import { StatusChip } from "./Chips";
import { frequencyLabel, nextPendingInstallment, sortByIndex } from "../domain/installmentHelpers";
import type { Loan, Client, Installment } from "../types/domain";

interface Props {
  loan: Loan;
  client: Client;
  installments: Installment[];
  onPay: (installmentId: string) => void;
}

export function LoanCard({ loan, client, installments, onPay }: Props) {
  const [expanded, setExpanded] = useState(false);
  
  const sorted = sortByIndex(installments);
  const d = deriveLoan(loan);
  
  const totalOwed = sorted.reduce((sum, i) => sum + i.amountCents, 0);
  const totalPaid = sorted.reduce((sum, i) => sum + i.paidCents, 0);
  const balance = Math.max(0, totalOwed - totalPaid);
  
  const nextPending = nextPendingInstallment(sorted);

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, marginBottom: 12, overflow: "hidden" }}>
      <div style={{ padding: "14px 14px 10px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{client.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
            {formatSoles(loan.principalCents)} al {loan.rate * 100}% · {loan.installmentCount} cuotas {frequencyLabel(loan.frequency)}
          </div>
        </div>
        <StatusChip status={d.status} />
      </div>

      <div style={{ padding: "0 14px 14px" }}>
        <div style={{ background: "var(--paper)", borderRadius: 10, padding: 12, fontSize: 13, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span>Total: <span className="num" style={{ fontWeight: 600 }}>{formatSoles(totalOwed)}</span></span>
            <span>Cobrado: <span className="num" style={{ fontWeight: 600, color: "var(--good)" }}>{formatSoles(totalPaid)}</span></span>
            <span>Saldo: <span className="num" style={{ fontWeight: 700 }}>{formatSoles(balance)}</span></span>
          </div>
          <div style={{ borderTop: "1px dashed var(--line)", marginTop: 8, paddingTop: 8 }}>
            <span style={{ color: "var(--muted)" }}>Próxima cuota:</span>{" "}
            {nextPending ? (
              <span style={{ fontWeight: 600 }}>#{nextPending.index} · {formatShort(nextPending.dueDate)} · {formatSoles(nextPending.amountCents)}</span>
            ) : (
              <span style={{ color: "var(--good)", fontWeight: 600 }}>Todas pagadas ✓</span>
            )}
          </div>
        </div>

        {expanded ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Cronograma</div>
            {sorted.map(i => (
              <InstallmentRow key={i.id} installment={i} client={client} loan={loan} onPay={() => onPay(i.id)} />
            ))}
            <button className="btn" style={{ width: "100%", padding: 8, fontSize: 13, background: "var(--paper)", color: "var(--muted)", marginTop: 6 }} onClick={() => setExpanded(false)}>
              Ocultar cronograma
            </button>
          </div>
        ) : (
          <button className="btn" style={{ width: "100%", padding: 8, fontSize: 13, background: "var(--paper)", color: "var(--ink)" }} onClick={() => setExpanded(true)}>
            Ver cronograma
          </button>
        )}
      </div>
    </div>
  );
}
