import { X, User } from "lucide-react";
import type { Client, Loan, Payment } from "../types/domain";
import { formatSoles } from "../lib/money";
import { formatShort } from "../lib/dates";

interface Props {
  client: Client;
  loans: Loan[];
  payments: Payment[];
  onClose: () => void;
}

export function ClientDetailSheet({ client, loans, payments, onClose }: Props) {
  const sortedLoans = [...loans].sort((a, b) => new Date(b.disbursedAt).getTime() - new Date(a.disbursedAt).getTime());

  return (
    <div className="ovl" onClick={onClose}>
      <div className="sheet" style={{ height: "90vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ flexShrink: 0 }}>
          Detalle del Cliente <span className="x" onClick={onClose}><X size={17} /></span>
        </h3>
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, margin: "16px 0" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--card)", border: "1px solid var(--line)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
              <User size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{client.name}</div>
              <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>DNI {client.dni} · {client.phone}</div>
            </div>
          </div>

          <div className="pf-sect">Historial de préstamos</div>
          
          {sortedLoans.length === 0 ? (
            <div className="empty">Este cliente aún no tiene préstamos.</div>
          ) : (
            sortedLoans.map(loan => {
              const loanPayments = payments
                .filter(p => p.loanId === loan.id)
                .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
              
              return (
                <div key={loan.id} className="preview" style={{ marginBottom: 12 }}>
                  <div className="r" style={{ fontWeight: 600 }}>
                    <span>Préstamo {formatShort(new Date(loan.disbursedAt))}</span>
                    <span>{formatSoles(loan.principalCents)} al {loan.rate * 100}%</span>
                  </div>
                  <div className="r" style={{ color: "var(--muted)" }}>
                    <span>Plazo: {loan.termDays} días</span>
                    <span style={{ color: loan.isPaid ? "var(--good)" : "var(--warn)", fontWeight: 600 }}>
                      {loan.isPaid ? "Pagado" : "Activo"}
                    </span>
                  </div>
                  
                  {loanPayments.length > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--line)" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 8 }}>
                        Pagos recibidos
                      </div>
                      {loanPayments.map(p => (
                        <div key={p.id} className="r" style={{ fontSize: 12.5 }}>
                          <span>
                            {formatShort(new Date(p.paidAt))}
                            {p.type === "interest" && " (Renovación)"}
                            {p.type === "partial" && " (Abono)"}
                            {p.type === "full" && " (Cancelación)"}
                          </span>
                          <span className="num" style={{ fontWeight: 500 }}>
                            {formatSoles(p.amountCents)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
