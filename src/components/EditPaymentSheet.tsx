import { useRef, useState } from "react";
import { X } from "lucide-react";
import type { Payment, PaymentMethod } from "../types/domain";
import { formatSoles } from "../lib/money";
import { useKeyboardAwareInput } from "../ui/useKeyboardAwareInput";

interface Props { payment: Payment; onClose: () => void; onSave: (patch: Pick<Payment, "method">) => Promise<void>; }
export function EditPaymentSheet({ payment, onClose, onSave }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  useKeyboardAwareInput(sheetRef);
  const [method, setMethod] = useState<PaymentMethod>(payment.method);
  const [saving, setSaving] = useState(false);
  async function handleSave() {
    setSaving(true);
    try { await onSave({ method }); onClose(); } finally { setSaving(false); }
  }
  return <div className="ovl" onClick={onClose}><div ref={sheetRef} className="sheet" onClick={(event) => event.stopPropagation()}>
    <h3>Editar pago <span className="x" onClick={onClose}><X size={17} /></span></h3>
    <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>Monto: {formatSoles(payment.amountCents)} (no editable — anular y re-registrar si es incorrecto)</div>
    <div className="field"><label>Método</label><div className="seg"><button className={method === "cash" ? "on" : ""} onClick={() => setMethod("cash")}>Efectivo</button><button className={method === "digital" ? "on" : ""} onClick={() => setMethod("digital")}>Virtual</button></div></div>
    <button className="btn btn-p btn-block" style={{ marginTop: 18 }} disabled={saving || method === payment.method} onClick={() => void handleSave()}>{saving ? "Guardando…" : "Guardar cambios"}</button>
  </div></div>;
}
