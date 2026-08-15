import { useRef, useState } from "react";
import { X } from "lucide-react";
import type { Loan } from "../types/domain";
import { LOAN_TERM_PRESETS, isValidLoanTerm } from "../domain/loanTerm";
import { fromCents, toCents } from "../lib/money";
import { useKeyboardAwareInput } from "../ui/useKeyboardAwareInput";

interface Props { loan: Loan; onClose: () => void; onSave: (patch: Partial<Pick<Loan, "principalCents" | "rate" | "termDays" | "disbursedAt">>) => Promise<void>; }

export function EditLoanSheet({ loan, onClose, onSave }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  useKeyboardAwareInput(sheetRef);
  const [principal, setPrincipal] = useState(String(fromCents(loan.principalCents)));
  const [ratePct, setRatePct] = useState(String(loan.rate * 100));
  const [termDays, setTermDays] = useState(loan.termDays);
  const [disbursedAt, setDisbursedAt] = useState(loan.disbursedAt.slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const principalCents = toCents(Number(principal));
    const rate = Number(ratePct) / 100;
    if (principalCents <= 0 || rate <= 0 || !isValidLoanTerm(termDays) || !disbursedAt) return setError("Revisa monto, tasa, plazo y fecha");
    const patch = { principalCents, rate, termDays, disbursedAt };
    setSaving(true);
    try { await onSave(patch); onClose(); } finally { setSaving(false); }
  }

  return <div className="ovl" onClick={onClose}><div ref={sheetRef} className="sheet" onClick={(event) => event.stopPropagation()}>
    <h3>Editar préstamo <span className="x" onClick={onClose}><X size={17} /></span></h3>
    <Field label="Monto (S/)" value={principal} onChange={setPrincipal} inputMode="decimal" />
    <Field label="Interés (%)" value={ratePct} onChange={setRatePct} inputMode="decimal" />
    <div className="field"><label>Plazo (días)</label><div className="term-input-wrap"><input className="inp num" type="number" min={1} max={365} value={termDays} onChange={(event) => setTermDays(Number(event.target.value))} /><div className="term-presets">{LOAN_TERM_PRESETS.map((day) => <button key={day} type="button" className={`term-preset-btn${termDays === day ? " active" : ""}`} onClick={() => setTermDays(day)}>{day}d</button>)}</div></div></div>
    <Field label="Fecha de desembolso" value={disbursedAt} onChange={setDisbursedAt} type="date" />
    {error && <div style={{ color: "var(--bad)", fontSize: 12, marginTop: 10 }}>{error}</div>}
    <button className="btn btn-p btn-block" style={{ marginTop: 18 }} disabled={saving} onClick={() => void handleSave()}>{saving ? "Guardando…" : "Guardar cambios"}</button>
  </div></div>;
}

function Field({ label, value, onChange, inputMode, type }: { label: string; value: string; onChange: (value: string) => void; inputMode?: "decimal"; type?: string }) {
  return <div className="field"><label>{label}</label><input className="inp" type={type} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}
