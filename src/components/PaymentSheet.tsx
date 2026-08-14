import { useState } from "react";
import { formatSoles, toCents } from "../lib/money";
import { X } from "lucide-react";
import type { Installment, Loan, Client, PaymentMethod } from "../types/domain";
import { deriveInstallment } from "../domain/loanRules";

interface Props {
  installment: Installment;
  loan: Loan;
  client: Client;
  onClose: () => void;
  onSubmit: (amountCents: number, method: PaymentMethod) => Promise<string | null>;
}

export function PaymentSheet({ installment, loan, client, onClose, onSubmit }: Props) {
  if (!installment) return null;
  const d = deriveInstallment(installment);
  const owed = d.totalOwedCents - installment.paidCents;

  const [type, setType] = useState<"full" | "partial">("full");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const amountCents = toCents(parseFloat(amount) || 0);
  const isTooMuch = type === "partial" && amountCents > owed;
  const payAmount = type === "full" ? owed : amountCents;

  const handleSubmit = async () => {
    setSubmitError(null);
    if (payAmount <= 0 || isTooMuch) return;
    const err = await onSubmit(payAmount, method);
    if (err) setSubmitError(err);
  };

  return (
    <div className="ovl" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>Registrar pago <span className="x" onClick={onClose}><X size={17} /></span></h3>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          {client.name} · Cuota {installment.index}/{loan.installmentCount} · Debe: {formatSoles(owed)}
        </div>

        <div className="field">
          <label>¿Cuánto?</label>
          <div className="seg">
            <button className={type === "full" ? "on" : ""} onClick={() => { setType("full"); setSubmitError(null); }}>Cuota completa</button>
            <button className={type === "partial" ? "on" : ""} onClick={() => { setType("partial"); setSubmitError(null); }}>Abono parcial</button>
          </div>
        </div>

        {type === "partial" && (
          <div className="field">
            <input className="inp num" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); setSubmitError(null); }} placeholder="0.00" />
            <div className="preview" style={{ marginTop: 8, padding: 8 }}>
              <div className="r" style={{ margin: 0 }}>
                <span>Después del pago quedará:</span>
                <span className="num">{formatSoles(Math.max(0, owed - amountCents))}</span>
              </div>
            </div>
            {isTooMuch && (
              <div className="warn" style={{ marginTop: 8 }}>El monto excede lo debido.</div>
            )}
          </div>
        )}

        <div className="field">
          <label>¿Cómo pagó?</label>
          <div className="seg">
            <button className={method === "cash" ? "on" : ""} onClick={() => setMethod("cash")}>Efectivo</button>
            <button className={method === "digital" ? "on" : ""} onClick={() => setMethod("digital")}>Virtual (Yape/Plin)</button>
          </div>
        </div>

        <button
          className="btn btn-p btn-block"
          style={{ marginTop: 18 }}
          disabled={payAmount <= 0 || isTooMuch}
          onClick={handleSubmit}
        >
          Registrar {formatSoles(payAmount)}
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
