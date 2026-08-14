import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { LoanCard } from "./LoanCard";
import type { Loan, Client, Installment } from "../types/domain";

interface Props {
  header: ReactNode;
  loans: Loan[];
  clients: Client[];
  installments: Installment[];
  onPay: (installmentId: string) => void;
  onNewLoan: () => void;
}

export function LoansView({ header, loans, clients, installments, onPay, onNewLoan }: Props) {
  const [showPaid, setShowPaid] = useState(false);

  const activeLoans = loans.filter(l => !l.isPaid);
  const paidLoans = loans.filter(l => l.isPaid);

  return (
    <>
      <div className="pf-head" style={{ paddingBottom: 18 }}>
        {header}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>Préstamos</div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>{activeLoans.length} activo{activeLoans.length !== 1 && "s"}</div>
          </div>
          <button className="btn" style={{ background: "rgba(255,255,255,0.2)", color: "#fff", padding: "8px 14px" }} onClick={onNewLoan}>
            <Plus size={16} /> Nuevo
          </button>
        </div>
      </div>

      <div className="pf-body">
        {activeLoans.length === 0 ? (
          <div className="empty">Aún no tienes préstamos activos.</div>
        ) : (
          activeLoans.map(loan => {
            const client = clients.find(c => c.id === loan.clientId);
            if (!client) return null;
            const insts = installments.filter(i => i.loanId === loan.id);
            return <LoanCard key={loan.id} loan={loan} client={client} installments={insts} onPay={onPay} />;
          })
        )}

        {paidLoans.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <button className="btn" style={{ width: "100%", background: "var(--card)", color: "var(--ink)", border: "1px solid var(--line)", padding: 10 }} onClick={() => setShowPaid(!showPaid)}>
              {showPaid ? "Ocultar préstamos pagados" : `Ver préstamos pagados (${paidLoans.length})`}
            </button>
            
            {showPaid && (
              <div style={{ marginTop: 12, opacity: 0.8 }}>
                {paidLoans.map(loan => {
                  const client = clients.find(c => c.id === loan.clientId);
                  if (!client) return null;
                  const insts = installments.filter(i => i.loanId === loan.id);
                  return <LoanCard key={loan.id} loan={loan} client={client} installments={insts} onPay={onPay} />;
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
