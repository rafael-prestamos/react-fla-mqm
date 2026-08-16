import { useRef, useState } from "react";
import type { Loan, Payment } from "../types/domain";
import { formatSoles, formatRatePercent } from "../lib/money";
import { formatShort } from "../lib/dates";
import { useKeyboardAwareInput } from "../ui/useKeyboardAwareInput";

interface Props { loan: Loan; payments: Payment[]; onClose: () => void; onConfirm: (reason?: string) => Promise<void>; }
export function CancelLoanModal({ loan, payments, onClose, onConfirm }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  useKeyboardAwareInput(modalRef);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const canCancel = confirmation.trim().toLocaleUpperCase() === "ELIMINAR";
  async function handleConfirm() { setSaving(true); try { await onConfirm(reason.trim() || undefined); onClose(); } finally { setSaving(false); } }
  return <div className="ovl" onClick={onClose}><div ref={modalRef} className="cancel-modal" onClick={(event) => event.stopPropagation()}>
    <h4>¿Anular préstamo?</h4>
    <div>{formatSoles(loan.principalCents)} al {formatRatePercent(loan.rate)} · {formatShort(new Date(loan.disbursedAt))}</div>
    {payments.length > 0 && <div className="affected"><b>También se anularán estos pagos:</b>{payments.map((payment) => <div key={payment.id}>• {formatShort(new Date(payment.paidAt))} — {formatSoles(payment.amountCents)} ({payment.type})</div>)}</div>}
    <div className="field"><label>Motivo (opcional)</label><textarea className="inp" value={reason} onChange={(event) => setReason(event.target.value)} /></div>
    <div className="confirm-input"><label>Escribe ELIMINAR para confirmar</label><input className="inp" value={confirmation} placeholder="ELIMINAR" onChange={(event) => setConfirmation(event.target.value)} /></div>
    <div className="cancel-actions"><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-danger" disabled={!canCancel || saving} onClick={() => void handleConfirm()}>Anular préstamo</button></div>
  </div></div>;
}
