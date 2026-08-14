import { Plus, User, LogOut } from "lucide-react";
import { RatingChip } from "./Chips";
import type { Client, Loan } from "../types/domain";

interface Props {
  clients: Client[];
  loans: Loan[];
  onOpenDetail: (clientId: string) => void;
  onNewClient: () => void;
  onSignOut: () => void;
  userEmail: string | undefined;
}

export function ClientsView({ clients, loans, onOpenDetail, onNewClient, onSignOut, userEmail }: Props) {
  return (
    <>
      <div className="pf-head" style={{ paddingBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>Clientes</div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>{clients.length} registrado{clients.length !== 1 && "s"}</div>
          </div>
          <button className="btn" style={{ background: "rgba(255,255,255,0.2)", color: "#fff", padding: "8px 14px" }} onClick={onNewClient}>
            <Plus size={16} /> Nuevo
          </button>
        </div>
      </div>

      <div className="pf-body" style={{ display: "flex", flexDirection: "column" }}>
        {clients.length === 0 ? (
          <div className="empty">Aún no tienes clientes. Agrega el primero para empezar.</div>
        ) : (
          <div style={{ flex: 1 }}>
            {clients.map(c => {
              const clientLoans = loans.filter(l => l.clientId === c.id).length;
              return (
                <div key={c.id} className="row" style={{ cursor: "pointer" }} onClick={() => onOpenDetail(c.id)}>
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <User size={20} />
                  </div>
                  <div className="who">
                    <div className="nm">{c.name}</div>
                    <div className="sub">DNI: {c.dni} · {clientLoans} préstamo{clientLoans !== 1 && "s"}</div>
                  </div>
                  <div className="amt">
                    <RatingChip rating="good" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: "auto", paddingTop: 30, textAlign: "center" }}>
          <button className="btn" style={{ background: "transparent", color: "var(--muted)", fontWeight: 500, fontSize: 13, opacity: 0.8 }} onClick={onSignOut}>
            <LogOut size={14} /> Cerrar sesión ({userEmail})
          </button>
        </div>
      </div>
    </>
  );
}
