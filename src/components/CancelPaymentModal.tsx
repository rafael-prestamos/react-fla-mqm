import { useRef, useState } from "react";
import type { Payment } from "../types/domain";
import { formatSoles } from "../lib/money";
import { formatShort } from "../lib/dates";
import { useKeyboardAwareInput } from "../ui/useKeyboardAwareInput";

interface Props { payment: Payment; onClose: () => void; onConfirm: (reason?: string) => Promise<void>; }
export function CancelPaymentModal({ payment, onClose, onConfirm }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  useKeyboardAwareInput(modalRef);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  async function handleConfirm() { setSaving(true); try { await onConfirm(reason.trim() || undefined); onClose(); } finally { setSaving(false); } }
  return <div className="ovl" onClick={onClose}><div ref={modalRef} className="cancel-modal" onClick={(event) => event.stopPropagation()}>
    <h4>¿Anular pago?</h4>
    <div>{formatShort(new Date(payment.paidAt))} — {formatSoles(payment.amountCents)} ({payment.type})</div>
    <div className="field"><label>Motivo (opcional)</label><textarea className="inp" value={reason} onChange={(event) => setReason(event.target.value)} /></div>
    <div className="cancel-actions"><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-danger" disabled={saving} onClick={() => void handleConfirm()}>Anular pago</button></div>
  </div></div>;
}
