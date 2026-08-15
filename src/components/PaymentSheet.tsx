import { useRef, useState } from "react";
import { X, Download, CheckCircle2 } from "lucide-react";
import type { Client, Loan, Payment, PaymentMethod, PaymentType } from "../types/domain";
import type { LoanDerived } from "../domain/loanRules";
import { formatSoles, toCents } from "../lib/money";
import { formatShort, addDays, startOfToday, toIsoDate } from "../lib/dates";
import { settingsRepo } from "../repositories/settingsRepo";
import { downloadBlob } from "../lib/downloadBlob";
import { sanitizeFilename } from "../lib/sanitizeFilename";
import { paymentMethodLabel } from "../pdf/formatters";
import { useToast } from "../ui/ToastContext";
import { useKeyboardAwareInput } from "../ui/useKeyboardAwareInput";

export interface PaymentSubmitResult {
  error: string | null;
  payment?: Payment;
  balanceCentsAfter?: number;
}

interface Props {
  client: Client;
  loan: Loan;
  derived: LoanDerived;
  onClose: () => void;
  onSubmit: (input: { type: PaymentType; amountCents: number; method: PaymentMethod }) => Promise<PaymentSubmitResult>;
}

export function PaymentSheet({ client, loan, derived: d, onClose, onSubmit }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  useKeyboardAwareInput(sheetRef);
  const toast = useToast();
  const [type, setType] = useState<PaymentType>("full");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registered, setRegistered] = useState<{ payment: Payment; balanceCentsAfter: number } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const amountCents = toCents(parseFloat(amount) || 0);

  const handleTypeChange = (newType: PaymentType) => {
    setType(newType);
    setSubmitError(null);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    const result = await onSubmit({ type, amountCents, method });
    if (result.error) {
      setSubmitError(result.error);
      return;
    }
    if (result.payment && result.balanceCentsAfter !== undefined) {
      setRegistered({ payment: result.payment, balanceCentsAfter: result.balanceCentsAfter });
    }
  };

  /** Patrón: dynamic import — @react-pdf/renderer (~450kb) solo se carga al tocar "Descargar". */
  async function handleDownloadReceipt() {
    if (!registered) return;
    setDownloading(true);
    try {
      const business = await settingsRepo.get();
      if (!business) throw new Error("Ajustes no configurados");
      const [{ pdf }, { PaymentReceiptPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../pdf/PaymentReceiptPdf"),
      ]);
      const blob = await pdf(
        <PaymentReceiptPdf
          business={business}
          client={client}
          loan={loan}
          payment={registered.payment}
          balanceCentsAfterPayment={registered.balanceCentsAfter}
        />
      ).toBlob();
      downloadBlob(blob, `Comprobante_${sanitizeFilename(client.name)}_${toIsoDate(startOfToday())}.pdf`);
      toast.success("Comprobante descargado");
    } catch {
      toast.error("No se pudo generar el comprobante");
    } finally {
      setDownloading(false);
    }
  }

  if (registered) {
    return (
      <div className="ovl" onClick={onClose}>
      <div ref={sheetRef} className="sheet" onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "12px 0 4px" }}>
            <CheckCircle2 size={52} color="var(--good)" />
            <div style={{ fontSize: 17, fontWeight: 700, marginTop: 12 }}>Pago registrado ✓</div>
            <div className="preview" style={{ width: "100%", marginTop: 16, textAlign: "left" }}>
              <div className="r"><span>Monto cobrado</span><span className="num" style={{ fontWeight: 700 }}>{formatSoles(registered.payment.amountCents)}</span></div>
              <div className="r"><span>Método</span><span>{paymentMethodLabel(registered.payment.method)}</span></div>
              <div className="r tot">
                <span>Saldo restante</span>
                <span className="num" style={{ color: registered.balanceCentsAfter <= 0 ? "var(--good)" : "var(--ink)" }}>
                  {registered.balanceCentsAfter <= 0 ? "PAGADO" : formatSoles(registered.balanceCentsAfter)}
                </span>
              </div>
            </div>

            <button
              className="btn btn-p btn-block"
              style={{ marginTop: 18 }}
              disabled={downloading}
              onClick={handleDownloadReceipt}
            >
              <Download size={16} /> {downloading ? "Generando…" : "Descargar comprobante"}
            </button>
            <button
              className="btn"
              style={{ marginTop: 10, width: "100%", background: "var(--card)", border: "1px solid var(--line)", color: "var(--ink)", padding: 13, fontSize: 15 }}
              onClick={onClose}
            >
              Listo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ovl" onClick={onClose}>
      <div ref={sheetRef} className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>Registrar pago <span className="x" onClick={onClose}><X size={17} /></span></h3>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>{client.name} · saldo {formatSoles(d.balanceCents)}</div>

        <div className="field">
          <label>¿Qué pagó?</label>
          <div className="seg">
            <button className={type === "full" ? "on" : ""} onClick={() => handleTypeChange("full")}>Todo</button>
            <button className={type === "interest" ? "on" : ""} onClick={() => handleTypeChange("interest")}>Solo interés</button>
            <button className={type === "partial" ? "on" : ""} onClick={() => handleTypeChange("partial")}>Una parte</button>
          </div>
        </div>

        {type === "interest" && (
          <div className="preview">
            <div className="r"><span>Cobra el interés</span><span className="num">{formatSoles(d.interestCents)}</span></div>
            <div className="r"><span>Renueva {loan.termDays} días · nueva fecha</span>
              <span className="num">{formatShort(addDays(d.dueDate, loan.termDays))}</span></div>
          </div>
        )}
        {type === "partial" && (
          <div className="field">
            <label>¿Cuánto abonó? (S/)</label>
            <input className="inp num" inputMode="decimal" value={amount} onChange={handleAmountChange} placeholder="0.00" />
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
          disabled={type === "partial" && amountCents <= 0}
          onClick={handleSubmit}
        >
          {type === "full"
            ? `Cobrar ${formatSoles(d.balanceCents)}`
            : type === "interest"
              ? "Cobrar interés y renovar"
              : `Registrar abono ${amount ? formatSoles(amountCents) : ""}`}
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
