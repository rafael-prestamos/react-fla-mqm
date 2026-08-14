import { useState } from "react";
import { formatSoles, toCents } from "../lib/money";
import { formatShort, startOfToday, toIsoDate } from "../lib/dates";
import { X } from "lucide-react";
import type { Client, InstallmentFrequency } from "../types/domain";
import { validateLoanInput, type LoanInput, type LoanErrors } from "../domain/loanValidation";
import { buildSchedule } from "../domain/installmentSchedule";

interface Props {
  clients: Client[];
  onClose: () => void;
  onOpenNewClient: () => void;
  onSubmit: (input: LoanInput) => Promise<string | null>;
  onSwitchToHistorical: () => void;
}

export function NewLoanSheet({ clients, onClose, onOpenNewClient, onSubmit, onSwitchToHistorical }: Props) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [principal, setPrincipal] = useState("");
  const [ratePct, setRatePct] = useState("20");
  const [installmentCount, setInstallmentCount] = useState<number>(4);
  const [frequency, setFrequency] = useState<InstallmentFrequency>("weekly");
  const [errors, setErrors] = useState<LoanErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (clients.length === 0) {
    return (
      <div className="ovl" onClick={onClose}>
        <div className="sheet" onClick={e => e.stopPropagation()}>
          <h3>Nuevo Préstamo <span className="x" onClick={onClose}><X size={17} /></span></h3>
          <div className="empty" style={{ marginTop: 20 }}>
            Primero registra un cliente.
            <button className="btn btn-p btn-block" style={{ marginTop: 12 }} onClick={onOpenNewClient}>Registrar cliente</button>
          </div>
        </div>
      </div>
    );
  }

  const principalCents = toCents(parseFloat(principal) || 0);
  const rate = (parseFloat(ratePct) || 0) / 100;
  
  const schedule = buildSchedule({
    loanId: "preview",
    principalCents,
    rate,
    installmentCount: installmentCount || 1,
    frequency,
    disbursedAt: toIsoDate(startOfToday()),
  });

  const totalOwed = schedule.reduce((sum, i) => sum + i.amountCents, 0);
  const firstDueDate = schedule[0]?.dueDate;
  const lastDueDate = schedule[schedule.length - 1]?.dueDate;

  const handleSubmit = async () => {
    const input: LoanInput = { clientId, principalCents, rate, installmentCount, frequency };
    const { ok, errors: errs } = validateLoanInput(input);
    if (!ok) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitError(null);
    const err = await onSubmit(input);
    if (err) setSubmitError(err);
  };

  return (
    <div className="ovl" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 15 }}>
          <div className="seg" style={{ flex: 1, marginRight: 20 }}>
            <button className="on">Nuevo</button>
            <button className="" onClick={onSwitchToHistorical}>Histórico</button>
          </div>
          <span className="x" onClick={onClose}><X size={17} /></span>
        </div>

        <div className="field">
          <label>Cliente</label>
          <select className="inp" value={clientId} onChange={e => setClientId(e.target.value)}>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.clientId && <div style={{ color: "var(--bad)", fontSize: 12, marginTop: 4 }}>{errors.clientId}</div>}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Capital (S/)</label>
            <input className="inp num" inputMode="decimal" value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="0.00" />
            {errors.principal && <div style={{ color: "var(--bad)", fontSize: 12, marginTop: 4 }}>{errors.principal}</div>}
          </div>
          <div className="field" style={{ width: 100 }}>
            <label>Interés (%)</label>
            <input className="inp num" inputMode="decimal" value={ratePct} onChange={e => setRatePct(e.target.value)} />
            {errors.rate && <div style={{ color: "var(--bad)", fontSize: 12, marginTop: 4 }}>{errors.rate}</div>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div className="field" style={{ width: 100 }}>
            <label>Cuotas</label>
            <input className="inp num" type="number" min={1} max={60} value={installmentCount} onChange={e => setInstallmentCount(parseInt(e.target.value) || 0)} />
            {errors.installmentCount && <div style={{ color: "var(--bad)", fontSize: 12, marginTop: 4 }}>{errors.installmentCount}</div>}
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Frecuencia</label>
            <select className="inp" value={frequency} onChange={e => setFrequency(e.target.value as InstallmentFrequency)}>
              <option value="weekly">Semanal</option>
              <option value="biweekly">Quincenal</option>
              <option value="monthly">Mensual</option>
            </select>
            {errors.frequency && <div style={{ color: "var(--bad)", fontSize: 12, marginTop: 4 }}>{errors.frequency}</div>}
          </div>
        </div>

        {principalCents > 0 && installmentCount > 0 && (
          <div className="preview">
            <div className="r"><span>Total a cobrar (capital + interés)</span><span className="num">{formatSoles(totalOwed)}</span></div>
            <div className="r"><span>Cuota base</span><span className="num">{formatSoles(schedule[0]?.amountCents ?? 0)}</span></div>
            <div className="r"><span>Primera cuota vence</span><span className="num">{firstDueDate ? formatShort(new Date(firstDueDate + "T00:00:00")) : ""}</span></div>
            <div className="r"><span>Última cuota vence</span><span className="num">{lastDueDate ? formatShort(new Date(lastDueDate + "T00:00:00")) : ""}</span></div>
            
            <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>Cronograma:</div>
            <div style={{ maxHeight: 200, overflowY: "auto", borderTop: "1px solid var(--line)", marginTop: 6, paddingTop: 6 }}>
              {schedule.map(s => (
                <div key={s.index} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                  <span>#{s.index} · {formatShort(new Date(s.dueDate + "T00:00:00"))}</span>
                  <span className="num" style={{ fontWeight: 600 }}>{formatSoles(s.amountCents)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="btn btn-p btn-block" style={{ marginTop: 18 }} onClick={handleSubmit}>
          Registrar préstamo
        </button>
        {submitError && (
          <div style={{ color: "var(--bad)", fontSize: 13, marginTop: 12, textAlign: "center", fontWeight: 500 }}>
            {submitError}
          </div>
        )}
      </div>
    </div>
  );
}
