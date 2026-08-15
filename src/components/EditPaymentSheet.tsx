import { useRef, useState } from "react";
import { X } from "lucide-react";
import type { Payment, PaymentMethod } from "../types/domain";
import { fromCents, toCents } from "../lib/money";
import { useKeyboardAwareInput } from "../ui/useKeyboardAwareInput";

interface Props { payment: Payment; onClose: () => void; onSave: (patch: Partial<Pick<Payment, "amountCents" | "method">>) => Promise<void>; }
export function EditPaymentSheet({ payment, onClose, onSave }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  useKeyboardAwareInput(sheetRef);
  const [amount, setAmount] = useState(String(fromCents(payment.amountCents)));
  const [method, setMethod] = useState<PaymentMethod>(payment.method);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function handleSave() {
    const amountCents = toCents(Number(amount));
    if (amountCents <= 0) return setError("Ingresa un monto válido");
    setSaving(true);
    try { await onSave({ amountCents, method }); onClose(); } finally { setSaving(false); }
  }
  return <div className="ovl" onClick={onClose}><div ref={sheetRef} className="sheet" onClick={(event) => event.stopPropagation()}>
    <h3>Editar pago <span className="x" onClick={onClose}><X size={17} /></span></h3>
    <div className="field"><label>Monto (S/)</label><input className="inp num" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
    <div className="field"><label>Método</label><div className="seg"><button className={method === "cash" ? "on" : ""} onClick={() => setMethod("cash")}>Efectivo</button><button className={method === "digital" ? "on" : ""} onClick={() => setMethod("digital")}>Virtual</button></div></div>
    {error && <div style={{ color: "var(--bad)", fontSize: 12, marginTop: 10 }}>{error}</div>}
    <button className="btn btn-p btn-block" style={{ marginTop: 18 }} disabled={saving} onClick={() => void handleSave()}>{saving ? "Guardando…" : "Guardar cambios"}</button>
  </div></div>;
}
