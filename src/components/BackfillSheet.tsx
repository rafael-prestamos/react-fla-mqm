import { useState, useMemo } from "react";
import { formatSoles, toCents } from "../lib/money";
import { formatShort, startOfToday, toIsoDate } from "../lib/dates";
import { X } from "lucide-react";
import type { Client, InstallmentFrequency } from "../types/domain";
import { validateLoanBackfillInput, type LoanBackfillInput, type LoanBackfillErrors } from "../domain/loanBackfill";
import { buildSchedule } from "../domain/installmentSchedule";

interface Props {
  clients: Client[];
  onClose: () => void;
  onSubmit: (input: LoanBackfillInput) => Promise<string | null>;
  onSwitchToNew: () => void;
}

export function BackfillSheet({ clients, onClose, onSubmit, onSwitchToNew }: Props) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [principal, setPrincipal] = useState("");
  const [ratePct, setRatePct] = useState("20");
  const [installmentCount, setInstallmentCount] = useState<number>(4);
  const [frequency, setFrequency] = useState<InstallmentFrequency>("weekly");
  const [disbursedAt, setDisbursedAt] = useState(toIsoDate(startOfToday()));
  
  const [errors, setErrors] = useState<LoanBackfillErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [edits, setEdits] = useState<Record<number, { paidStr: string; paidAt: string }>>({});

  const principalCents = toCents(parseFloat(principal) || 0);
  const rate = (parseFloat(ratePct) || 0) / 100;
  
  const schedule = useMemo(() => {
    const inputComplete =
      principalCents > 0 &&
      rate >= 0 &&
      rate <= 1 &&
      Number.isInteger(installmentCount) &&
      installmentCount >= 1 &&
      installmentCount <= 60 &&
      !!disbursedAt;
      
    if (!inputComplete) return [];
    try {
      return buildSchedule({
        loanId: "preview",
        principalCents,
        rate,
        installmentCount,
        frequency,
        disbursedAt,
      });
    } catch {
      return [];
    }
  }, [principalCents, rate, installmentCount, frequency, disbursedAt]);

  const totalOwed = schedule.reduce((sum, i) => sum + i.amountCents, 0);
  let totalPaid = 0;
  
  const installmentsInput = schedule.map(s => {
    const edit = edits[s.index];
    const paidCents = edit ? toCents(parseFloat(edit.paidStr) || 0) : 0;
    const paidAt = edit?.paidAt || null;
    totalPaid += paidCents;
    return { index: s.index, paidCents, paidAt };
  });

  const pendingCount = schedule.length - installmentsInput.filter(i => {
    const s = schedule.find(x => x.index === i.index)!;
    return i.paidCents >= s.amountCents;
  }).length;

  const handleSubmit = async () => {
    const input: LoanBackfillInput = { 
      clientId, 
      principalCents, 
      rate, 
      installmentCount, 
      frequency, 
      disbursedAt,
      installments: installmentsInput
    };
    const { ok, errors: errs } = validateLoanBackfillInput(input);
    if (!ok) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitError(null);
    const err = await onSubmit(input);
    if (err) setSubmitError(err);
  };

  const handleEditPaid = (index: number, str: string) => {
    setEdits(prev => ({ ...prev, [index]: { ...prev[index], paidStr: str } }));
  };

  const handleEditPaidAt = (index: number, date: string) => {
    setEdits(prev => ({ ...prev, [index]: { ...prev[index], paidAt: date } }));
  };

  const toggleFullPaid = (index: number, amountCents: number, dueDate: string) => {
    const isPaid = (edits[index]?.paidStr && toCents(parseFloat(edits[index].paidStr) || 0) >= amountCents);
    if (isPaid) {
      setEdits(prev => { const next = { ...prev }; delete next[index]; return next; });
    } else {
      setEdits(prev => ({ ...prev, [index]: { paidStr: (amountCents / 100).toString(), paidAt: dueDate } }));
    }
  };

  if (clients.length === 0) return null; // handled by NewLoanSheet

  return (
    <div className="ovl" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 15 }}>
          <div className="seg" style={{ flex: 1, marginRight: 20 }}>
            <button className="" onClick={onSwitchToNew}>Nuevo</button>
            <button className="on">Histórico</button>
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

        <div className="field">
          <label>Fecha de desembolso (Cuándo se prestó)</label>
          <input className="inp" type="date" value={disbursedAt} max={toIsoDate(startOfToday())} onChange={e => setDisbursedAt(e.target.value)} />
          {errors.disbursedAt && <div style={{ color: "var(--bad)", fontSize: 12, marginTop: 4 }}>{errors.disbursedAt}</div>}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Capital (S/)</label>
            <input className="inp num" inputMode="decimal" value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="0.00" />
            {errors.principalCents && <div style={{ color: "var(--bad)", fontSize: 12, marginTop: 4 }}>{errors.principalCents}</div>}
          </div>
          <div className="field" style={{ width: 100 }}>
            <label>Interés (%)</label>
            <input className="inp num" inputMode="decimal" value={ratePct} onChange={e => setRatePct(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div className="field" style={{ width: 100 }}>
            <label>Cuotas</label>
            <input className="inp num" type="number" min={1} max={60} value={installmentCount} onChange={e => setInstallmentCount(parseInt(e.target.value) || 0)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Frecuencia</label>
            <select className="inp" value={frequency} onChange={e => setFrequency(e.target.value as InstallmentFrequency)}>
              <option value="weekly">Semanal</option>
              <option value="biweekly">Quincenal</option>
              <option value="monthly">Mensual</option>
            </select>
          </div>
        </div>

        {schedule.length > 0 && (
          <div className="preview">
            <div className="r"><span>Total del préstamo</span><span className="num">{formatSoles(totalOwed)}</span></div>
            <div className="r"><span>Ya cobrado</span><span className="num">{formatSoles(totalPaid)}</span></div>
            <div className="r"><span>Saldo pendiente</span><span className="num">{formatSoles(Math.max(0, totalOwed - totalPaid))}</span></div>
            <div className="r"><span>Cuotas pendientes</span><span className="num">{pendingCount}</span></div>
            
            <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>Configurar estado de cuotas:</div>
            <div style={{ maxHeight: 250, overflowY: "auto", borderTop: "1px solid var(--line)", marginTop: 6, paddingTop: 6 }}>
              {schedule.map(s => {
                const edit = edits[s.index];
                const paidCents = edit ? toCents(parseFloat(edit.paidStr) || 0) : 0;
                const isPaid = paidCents >= s.amountCents;
                
                return (
                  <div key={s.index} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px dashed var(--line)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>#{s.index} · Vence: {formatShort(new Date(s.dueDate + "T00:00:00"))} · {formatSoles(s.amountCents)}</span>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                        <input type="checkbox" checked={isPaid} onChange={() => toggleFullPaid(s.index, s.amountCents, s.dueDate)} />
                        Pagada completa
                      </label>
                    </div>
                    
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>Monto abonado (S/)</div>
                        <input className="inp num" style={{ padding: "6px 8px", fontSize: 13 }} inputMode="decimal" placeholder="0.00"
                          value={edit?.paidStr ?? ""}
                          onChange={e => handleEditPaid(s.index, e.target.value)} />
                      </div>
                      {paidCents > 0 && (
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>Fecha de pago</div>
                          <input className="inp" type="date" style={{ padding: "6px 8px", fontSize: 13 }}
                            value={edit?.paidAt ?? ""}
                            max={toIsoDate(startOfToday())}
                            onChange={e => handleEditPaidAt(s.index, e.target.value)} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button className="btn btn-p btn-block" style={{ marginTop: 18 }} onClick={handleSubmit}>
          Registrar préstamo existente
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
