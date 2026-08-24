import { useRef, useState } from "react";
import { X, Download, CheckCircle2 } from "lucide-react";
import type { Client, Loan, Payment, PaymentMethod, PaymentType } from "../types/domain";
import { deriveLoan, type LoanDerived } from "../domain/loanRules";
import { isValidLoanTerm } from "../domain/loanTerm";
import { formatSoles, fromCents, toCents, formatRatePercent } from "../lib/money";
import { formatShort, addDays, startOfToday, toIsoDate } from "../lib/dates";
import { settingsRepo } from "../repositories/settingsRepo";
import { downloadBlob } from "../lib/downloadBlob";
import { sanitizeFilename } from "../lib/sanitizeFilename";
import { paymentMethodLabel } from "../pdf/formatters";
import { useToast } from "../ui/ToastContext";
import { useKeyboardAwareInput } from "../ui/useKeyboardAwareInput";
import { InterestAmountInput } from "./loan/InterestAmountInput";
import { LoanTermInput } from "./loan/LoanTermInput";

export interface PaymentSubmitResult {
  error: string | null;
  payment?: Payment;
  balanceCentsAfter?: number;
}

/** Sprint 7d-1: resultado de una renovación flexible. `payment` es null si el monto recibido fue 0. */
export interface RenewSubmitResult {
  error: string | null;
  payment?: Payment | null;
  newLoan?: Loan;
}

export interface RenewInput {
  receivedCents: number;
  principalCents: number;
  rate: number;
  termDays: number;
  method: PaymentMethod;
}

interface Props {
  client: Client;
  loan: Loan;
  derived: LoanDerived;
  onClose: () => void;
  onSubmit: (input: { type: PaymentType; amountCents: number; method: PaymentMethod }) => Promise<PaymentSubmitResult>;
  onRenew: (input: RenewInput) => Promise<RenewSubmitResult>;
}

/** Modo del formulario. "renew" reemplaza al antiguo "interest" (solo interés) del modelo legado. */
type Mode = "full" | "renew" | "partial";

/** Estado post-registro: pago normal o renovación (con su préstamo nuevo). */
type Registered =
  | { kind: "payment"; payment: Payment; balanceCentsAfter: number }
  | { kind: "renewal"; payment: Payment | null; newLoan: Loan };

export function PaymentSheet({ client, loan, derived: d, onClose, onSubmit, onRenew }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  useKeyboardAwareInput(sheetRef);
  const toast = useToast();
  const [mode, setMode] = useState<Mode>("full");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registered, setRegistered] = useState<Registered | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const amountCents = toCents(parseFloat(amount) || 0);

  // Sprint 7d-1 — renovación flexible. Pre-llenado con el caso más común:
  // recibe el interés del ciclo actual, mismo capital, mismo interés y mismo plazo.
  const cycleInterestCents = d.interestCents + d.lateInterestCents;
  const [received, setReceived] = useState(String(fromCents(cycleInterestCents)));
  const [newPrincipal, setNewPrincipal] = useState(String(fromCents(loan.principalCents)));
  const [newInterest, setNewInterest] = useState(String(fromCents(d.interestCents)));
  const [newTermDays, setNewTermDays] = useState<number>(loan.termDays);
  const receivedCents = toCents(parseFloat(received) || 0);
  const newPrincipalCents = toCents(parseFloat(newPrincipal) || 0);
  const newInterestCents = toCents(parseFloat(newInterest) || 0);
  const newRate = newPrincipalCents > 0 ? newInterestCents / newPrincipalCents : 0;
  const renewValid = receivedCents >= 0 && newPrincipalCents > 0 && newInterestCents >= 0 && isValidLoanTerm(newTermDays);
  const newStart = d.dueDate; // inicio del nuevo = vencimiento del anterior (no cambia)
  const newDue = addDays(newStart, newTermDays);

  const handleModeChange = (next: Mode) => {
    setMode(next);
    setSubmitError(null);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (mode === "renew") {
        const result = await onRenew({ receivedCents, principalCents: newPrincipalCents, rate: newRate, termDays: newTermDays, method });
        if (result.error) {
          setSubmitError(result.error);
          return;
        }
        if (result.newLoan) {
          setRegistered({ kind: "renewal", payment: result.payment ?? null, newLoan: result.newLoan });
        }
        return;
      }
      const result = await onSubmit({ type: mode, amountCents, method });
      if (result.error) {
        setSubmitError(result.error);
        return;
      }
      if (result.payment && result.balanceCentsAfter !== undefined) {
        setRegistered({ kind: "payment", payment: result.payment, balanceCentsAfter: result.balanceCentsAfter });
      }
    } finally {
      setSubmitting(false);
    }
  };

  /** Patrón: dynamic import — @react-pdf/renderer (~450kb) solo se carga al tocar "Descargar". */
  async function handleDownloadReceipt() {
    if (!registered) return;
    const payment = registered.payment;
    if (!payment) return;
    // Para una renovación, el comprobante muestra el préstamo NUEVO y su saldo (es lo que el cliente debe ahora).
    const receiptLoan = registered.kind === "renewal" ? registered.newLoan : loan;
    const balanceAfter = registered.kind === "renewal" ? deriveLoan(registered.newLoan).balanceCents : registered.balanceCentsAfter;
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
          loan={receiptLoan}
          payment={payment}
          balanceCentsAfterPayment={balanceAfter}
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
    const newLoanDerived = registered.kind === "renewal" ? deriveLoan(registered.newLoan) : null;
    return (
      <div className="ovl" onClick={onClose}>
      <div ref={sheetRef} className="sheet" onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "12px 0 4px" }}>
            <CheckCircle2 size={52} color="var(--good)" />
            <div style={{ fontSize: 17, fontWeight: 700, marginTop: 12 }}>
              {registered.kind === "renewal" ? "Renovación registrada ✓" : "Pago registrado ✓"}
            </div>
            {registered.kind === "payment" ? (
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
            ) : (
              <div className="preview" style={{ width: "100%", marginTop: 16, textAlign: "left" }}>
                <div className="r"><span>Monto recibido</span><span className="num" style={{ fontWeight: 700 }}>{formatSoles(registered.payment?.amountCents ?? 0)}</span></div>
                {registered.payment && <div className="r"><span>Método</span><span>{paymentMethodLabel(registered.payment.method)}</span></div>}
                <div className="r"><span>Nuevo capital</span><span className="num">{formatSoles(registered.newLoan.principalCents)}</span></div>
                <div className="r"><span>Interés ({formatRatePercent(registered.newLoan.rate)})</span><span className="num">{formatSoles(newLoanDerived!.interestCents)}</span></div>
                <div className="r"><span>Vence</span><span className="num">{formatShort(newLoanDerived!.dueDate)} · {registered.newLoan.termDays} días</span></div>
                <div className="r tot"><span>Nuevo saldo</span><span className="num">{formatSoles(newLoanDerived!.balanceCents)}</span></div>
              </div>
            )}

            {registered.payment && (
              <button
                className="btn btn-p btn-block"
                style={{ marginTop: 18 }}
                disabled={downloading}
                onClick={handleDownloadReceipt}
              >
                <Download size={16} /> {downloading ? "Generando…" : "Descargar comprobante"}
              </button>
            )}
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
            <button className={mode === "full" ? "on" : ""} onClick={() => handleModeChange("full")}>Todo</button>
            <button className={mode === "renew" ? "on" : ""} onClick={() => handleModeChange("renew")}>Renovar</button>
            <button className={mode === "partial" ? "on" : ""} onClick={() => handleModeChange("partial")}>Una parte</button>
          </div>
        </div>

        {mode === "renew" && (
          <>
            {/* Sprint 7d-1: Fla define todo — lo recibido (puede ser 0) y capital/interés/plazo del nuevo préstamo. */}
            <div className="field">
              <label>Monto recibido (S/)</label>
              <input className="inp num" inputMode="decimal" value={received} onChange={(e) => { setReceived(e.target.value); setSubmitError(null); }} placeholder="0.00" />
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>Interés del ciclo actual: {formatSoles(cycleInterestCents)} · puede ser 0</div>
            </div>
            <div className="field">
              <label>Capital del nuevo préstamo (S/)</label>
              <input className="inp num" inputMode="decimal" value={newPrincipal} onChange={(e) => { setNewPrincipal(e.target.value); setSubmitError(null); }} placeholder="1000.00" />
            </div>
            <div style={{ display: "flex", gap: 11 }}>
              <InterestAmountInput label="Interés nuevo (S/)" value={newInterest} onChange={(v) => { setNewInterest(v); setSubmitError(null); }} principalCents={newPrincipalCents} interestCents={newInterestCents} />
              <div style={{ flex: 2 }}>
                <LoanTermInput value={newTermDays} onChange={setNewTermDays} />
              </div>
            </div>
            <div className="preview">
              <div className="r"><span>Nuevo préstamo inicia</span><span className="num">{formatShort(newStart)}</span></div>
              <div className="r"><span>Vence ({newTermDays} días)</span><span className="num">{formatShort(newDue)}</span></div>
              <div className="r tot"><span>Nuevo saldo</span><span className="num">{formatSoles(newPrincipalCents + newInterestCents)}</span></div>
            </div>
          </>
        )}
        {mode === "partial" && (
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
          disabled={submitting || (mode === "partial" && amountCents <= 0) || (mode === "renew" && !renewValid)}
          onClick={handleSubmit}
        >
          {mode === "full"
            ? `Cobrar ${formatSoles(d.balanceCents)}`
            : mode === "renew"
              ? (receivedCents > 0 ? `Recibir ${formatSoles(receivedCents)} y renovar` : "Renovar sin cobro")
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
