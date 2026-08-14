import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { PawPrint, Check, RefreshCw, WifiOff, CalendarClock, Users, Wallet } from "lucide-react";
import { useSession } from "./auth/SessionContext";
import { useSync } from "./sync/SyncEngine";

import { clientsRepo } from "./repositories/clientsRepo";
import { loansRepo } from "./repositories/loansRepo";
import { installmentsRepo } from "./repositories/installmentsRepo";
import { paymentsRepo } from "./repositories/paymentsRepo";

import { TodayView } from "./components/TodayView";
import { LoansView } from "./components/LoansView";
import { ClientsView } from "./components/ClientsView";
import { PaymentSheet } from "./components/PaymentSheet";
import { NewLoanSheet } from "./components/NewLoanSheet";
import { BackfillSheet } from "./components/BackfillSheet";
import { NewClientSheet } from "./components/NewClientSheet";

function SyncStatusChip() {
  const sync = useSync();
  if (sync.status === "synced") {
    return (
      <div style={{ background: "var(--good-soft)", color: "var(--good)", borderRadius: 9, padding: "4px 8px", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
        <Check size={13} /> Al día
      </div>
    );
  }
  if (sync.status === "syncing") {
    return (
      <div style={{ background: "var(--warn-soft)", color: "var(--warn)", borderRadius: 9, padding: "4px 8px", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
        <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> Sincronizando…
      </div>
    );
  }
  return (
    <div style={{ background: "var(--card)", color: "var(--muted)", borderRadius: 9, padding: "4px 8px", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
      <WifiOff size={13} /> Offline · {sync.pendingCount} pdte{sync.pendingCount !== 1 && "s"}
    </div>
  );
}

function Header() {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 18px 0" }}>
      <div className="pf-brand" style={{ color: "var(--cream)" }}><PawPrint size={18} /> Fla MpM</div>
      <SyncStatusChip />
    </div>
  );
}

function NavBar({ tab, onChange }: { tab: "today" | "loans" | "clients"; onChange: (t: "today" | "loans" | "clients") => void }) {
  return (
    <div className="nav">
      <button className={tab === "today" ? "on" : ""} onClick={() => onChange("today")}>
        <CalendarClock size={22} />
        Hoy
      </button>
      <button className={tab === "loans" ? "on" : ""} onClick={() => onChange("loans")}>
        <Wallet size={22} />
        Préstamos
      </button>
      <button className={tab === "clients" ? "on" : ""} onClick={() => onChange("clients")}>
        <Users size={22} />
        Clientes
      </button>
    </div>
  );
}

export default function App() {
  const { session, signOut } = useSession();
  
  const clients = useLiveQuery(() => clientsRepo.all()) ?? [];
  const loans = useLiveQuery(() => loansRepo.all()) ?? [];
  const installments = useLiveQuery(() => installmentsRepo.all()) ?? [];
  const payments = useLiveQuery(() => paymentsRepo.all()) ?? [];

  const [tab, setTab] = useState<"today" | "loans" | "clients">("today");
  const [payingInstallmentId, setPayingInstallmentId] = useState<string | null>(null);
  const [creatingLoan, setCreatingLoan] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [creatingHistorical, setCreatingHistorical] = useState(false);
  const [viewingClientId, setViewingClientId] = useState<string | null>(null);

  const payingInstallment = installments.find(i => i.id === payingInstallmentId);
  const payingLoan = loans.find(l => l.id === payingInstallment?.loanId);
  const payingClient = clients.find(c => c.id === payingLoan?.clientId);

  const handleCreateClient = async (input: any) => {
    try {
      await clientsRepo.create(input);
      setCreatingClient(false);
      return null;
    } catch (err: any) {
      return err.message || "Error al crear cliente";
    }
  };

  const handleCreateLoan = async (input: any) => {
    try {
      await loansRepo.create(input);
      setCreatingLoan(false);
      return null;
    } catch (err: any) {
      return err.message || "Error al crear préstamo";
    }
  };

  const handleBackfillLoan = async (input: any) => {
    try {
      await loansRepo.backfill(input);
      setCreatingHistorical(false);
      return null;
    } catch (err: any) {
      return err.message || "Error al registrar histórico";
    }
  };

  const handleApplyPayment = async (amountCents: number, method: any) => {
    if (!payingInstallmentId) return "Error";
    try {
      await installmentsRepo.applyPayment(payingInstallmentId, amountCents, method);
      setPayingInstallmentId(null);
      return null;
    } catch (err: any) {
      return err.message || "Error al registrar pago";
    }
  };

  return (
    <div className="pf-root">
      <div className="pf-shell">
        
        {tab === "today" ? (
          <TodayView 
            header={<Header />}
            clients={clients} loans={loans} installments={installments} payments={payments} onPay={setPayingInstallmentId} 
          />
        ) : tab === "loans" ? (
          <LoansView 
            header={<Header />}
            clients={clients} loans={loans} installments={installments} onPay={setPayingInstallmentId} onNewLoan={() => setCreatingLoan(true)} 
          />
        ) : (
          <ClientsView 
            header={<Header />}
            clients={clients} loans={loans} onOpenDetail={setViewingClientId} onNewClient={() => setCreatingClient(true)} onSignOut={signOut} userEmail={session?.user?.email} 
          />
        )}

        <NavBar tab={tab} onChange={setTab} />

        {payingInstallmentId && payingInstallment && payingLoan && payingClient && (
          <PaymentSheet
            installment={payingInstallment}
            loan={payingLoan}
            client={payingClient}
            onClose={() => setPayingInstallmentId(null)}
            onSubmit={handleApplyPayment}
          />
        )}
        
        {creatingLoan && (
          <NewLoanSheet
            clients={clients}
            onClose={() => setCreatingLoan(false)}
            onOpenNewClient={() => { setCreatingLoan(false); setCreatingClient(true); }}
            onSubmit={handleCreateLoan}
            onSwitchToHistorical={() => { setCreatingLoan(false); setCreatingHistorical(true); }}
          />
        )}
        
        {creatingHistorical && (
          <BackfillSheet
            clients={clients}
            onClose={() => setCreatingHistorical(false)}
            onSubmit={handleBackfillLoan}
            onSwitchToNew={() => { setCreatingHistorical(false); setCreatingLoan(true); }}
          />
        )}
        
        {creatingClient && (
          <NewClientSheet
            onClose={() => setCreatingClient(false)}
            onSubmit={handleCreateClient}
          />
        )}
      </div>
    </div>
  );
}
