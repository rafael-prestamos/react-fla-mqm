import { useMemo, type ReactNode } from "react";
import { formatSoles } from "../lib/money";
import { deriveInstallment } from "../domain/loanRules";
import { InstallmentRow } from "./InstallmentRow";
import type { Client, Loan, Installment, Payment } from "../types/domain";
import { Wallet, TrendingUp, Coins, Users, CalendarClock, AlertTriangle } from "lucide-react";

interface Props {
  header: ReactNode;
  clients: Client[];
  loans: Loan[];
  installments: Installment[];
  payments: Payment[];
  onPay: (installmentId: string) => void;
}

function Stat({ icon, k, v }: { icon: ReactNode; k: string; v: string }) {
  return (
    <div className="pf-stat">
      <div className="k">{icon}{k}</div>
      <div className="v num">{v}</div>
    </div>
  );
}

export function TodayView({ header, clients, loans, installments, payments, onPay }: Props) {
  const activeLoans = useMemo(() => loans.filter(l => !l.isPaid), [loans]);

  const pendingInstallments = useMemo(() => {
    return installments.filter(i => {
      if (i.status === "paid") return false;
      return activeLoans.some(l => l.id === i.loanId);
    });
  }, [installments, activeLoans]);

  const { dueSoon, dueToday, overdue, totalDueToday, lateInterestCount, capitalOut, interestOut } = useMemo(() => {
    const dSoon: { i: Installment; l: Loan; c: Client; d: ReturnType<typeof deriveInstallment> }[] = [];
    const dToday: typeof dSoon = [];
    const oDue: typeof dSoon = [];
    let totDueToday = 0;
    let lateIntCount = 0;
    let capOut = 0;
    let intOut = 0;

    activeLoans.forEach(l => { capOut += l.principalCents; });

    for (const i of pendingInstallments) {
      const l = activeLoans.find(loan => loan.id === i.loanId);
      const c = clients.find(client => client.id === l?.clientId);
      if (!l || !c) continue;

      const d = deriveInstallment(i);
      const owed = d.totalOwedCents - i.paidCents;
      intOut += owed;

      if (d.daysLate >= -3 && d.daysLate <= -1) {
        dSoon.push({ i, l, c, d });
      } else if (d.daysLate === 0) {
        dToday.push({ i, l, c, d });
        totDueToday += owed;
      } else if (d.daysLate > 0) {
        oDue.push({ i, l, c, d });
        if (d.daysLate > 7) lateIntCount++;
      }
    }

    oDue.sort((a, b) => {
      if (b.d.daysLate !== a.d.daysLate) return b.d.daysLate - a.d.daysLate;
      return (b.d.totalOwedCents - b.i.paidCents) - (a.d.totalOwedCents - a.i.paidCents);
    });

    return { dueSoon: dSoon, dueToday: dToday, overdue: oDue, totalDueToday: totDueToday, lateInterestCount: lateIntCount, capitalOut: capOut, interestOut: intOut };
  }, [pendingInstallments, activeLoans, clients]);

  return (
    <>
      <div className="pf-head">
        {header}
        <div className="pf-cobranza-lbl" style={{ marginTop: 14 }}>Debes cobrar hoy</div>
        <div className="pf-cobranza num">{formatSoles(totalDueToday)}</div>
        <div className="pf-mini">
          <div><div className="k">Vencen hoy</div><div className="v num">{dueToday.length}</div></div>
          <div><div className="k">Atrasadas</div><div className="v num">{overdue.length}</div></div>
          <div><div className="k">Con interés extra</div><div className="v num">{lateInterestCount}</div></div>
        </div>
      </div>

      <div className="pf-body">
        <div className="pf-stats">
          <Stat icon={<Wallet size={13} />} k="Capital en la calle" v={formatSoles(capitalOut)} />
          <Stat icon={<TrendingUp size={13} />} k="Por cobrar" v={formatSoles(interestOut)} />
          <Stat icon={<Coins size={13} />} k="Cobrado este mes" v={formatSoles(0)} />
          <Stat icon={<Users size={13} />} k="Préstamos activos" v={String(activeLoans.length)} />
        </div>

        {dueSoon.length > 0 && (
          <>
            <div className="pf-sect"><CalendarClock size={14} /> Por vencer (próximos 3 días) <span className="cnt">{dueSoon.length}</span></div>
            {dueSoon.map(r => <InstallmentRow key={r.i.id} installment={r.i} client={r.c} loan={r.l} onPay={() => onPay(r.i.id)} />)}
          </>
        )}

        <div className="pf-sect"><CalendarClock size={14} /> Vence hoy <span className="cnt">{dueToday.length}</span></div>
        {dueToday.length > 0 ? (
          dueToday.map(r => <InstallmentRow key={r.i.id} installment={r.i} client={r.c} loan={r.l} onPay={() => onPay(r.i.id)} />)
        ) : (
          <div className="empty">Nadie vence hoy.</div>
        )}

        {overdue.length > 0 && (
          <>
            <div className="pf-sect"><AlertTriangle size={14} /> Atrasados <span className="cnt">{overdue.length}</span></div>
            {overdue.map(r => <InstallmentRow key={r.i.id} installment={r.i} client={r.c} loan={r.l} onPay={() => onPay(r.i.id)} />)}
          </>
        )}
      </div>
    </>
  );
}
