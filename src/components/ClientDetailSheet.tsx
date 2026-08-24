import { useState } from "react";
import { X, User, Download, Pencil, Trash2, FileDown, Banknote } from "lucide-react";
import type { Client, Loan, Payment } from "../types/domain";
import { formatSoles, formatRatePercent } from "../lib/money";
import { formatShort, startOfToday, toIsoDate, parseLocalDate } from "../lib/dates";
import { settingsRepo } from "../repositories/settingsRepo";
import { downloadBlob } from "../lib/downloadBlob";
import { sanitizeFilename } from "../lib/sanitizeFilename";
import { useToast } from "../ui/ToastContext";
import { deriveLoan } from "../domain/loanRules";
import { balanceCentsAfterPayment } from "../domain/loanBalanceHistory";
import { isClosingRenewalPayment } from "../domain/loanRenewal";
import { WhatsappButton } from "./WhatsappButton";
import { EditClientSheet } from "./EditClientSheet";
import { EditLoanSheet } from "./EditLoanSheet";
import { EditPaymentSheet } from "./EditPaymentSheet";
import { CancelLoanModal } from "./CancelLoanModal";
import { CancelPaymentModal } from "./CancelPaymentModal";
import { DeleteClientModal } from "./DeleteClientModal";


interface Props {
  client: Client;
  loans: Loan[];
  payments: Payment[];
  onClose: () => void;
  onEditClient: (id: string, patch: Pick<Client, "name" | "dni" | "phone">) => Promise<void>;
  onEditLoan: (id: string, patch: Partial<Pick<Loan, "principalCents" | "rate" | "termDays" | "disbursedAt">>) => Promise<void>;
  onCancelLoan: (id: string, reason?: string) => Promise<{ cancelledPaymentIds: string[] }>;
  onEditPayment: (id: string, patch: Pick<Payment, "method">) => Promise<void>;
  onCancelPayment: (id: string, reason?: string) => Promise<void>;
  onPayLoan: (loanId: string) => void;
  onDeleteClient: (id: string) => Promise<void>;
}

export function ClientDetailSheet({ client, loans, payments, onClose, onEditClient, onEditLoan, onCancelLoan, onEditPayment, onCancelPayment, onPayLoan, onDeleteClient }: Props) {
  const toast = useToast();
  const [generatingStatement, setGeneratingStatement] = useState(false);
  const [generatingHistory, setGeneratingHistory] = useState(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [cancellingLoan, setCancellingLoan] = useState<Loan | null>(null);
  const [cancellingPayment, setCancellingPayment] = useState<Payment | null>(null);
  const [deletingClient, setDeletingClient] = useState(false);
  const sortedLoans = [...loans].sort((a, b) => parseLocalDate(b.disbursedAt).getTime() - parseLocalDate(a.disbursedAt).getTime());
  // Sprint 7c-1: bloquea el hard delete si el cliente tiene préstamos activos (no pagados, no anulados)
  const hasActiveLoans = loans.some((loan) => !loan.isPaid && !loan.cancelledAt);
  // Sprint 7d-1: préstamos cerrados por una renovación (tienen un préstamo hijo activo/pagado en la cadena).
  const renewedLoanIds = new Set(loans.map((loan) => loan.renewedFromLoanId).filter((id): id is string => !!id));

  /** Patrón: dynamic import — @react-pdf/renderer (~450kb) solo se carga al tocar "Descargar". */
  async function handleDownloadStatement() {
    setGeneratingStatement(true);
    try {
      const business = await settingsRepo.get();
      if (!business) {
        toast.error("Ajustes no configurados");
        return;
      }
      const [{ pdf }, { StatementPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../pdf/StatementPdf"),
      ]);
      const blob = await pdf(
        <StatementPdf business={business} client={client} loans={loans} payments={payments} />
      ).toBlob();
      downloadBlob(blob, `EstadoDeCuenta_${sanitizeFilename(client.name)}_${toIsoDate(startOfToday())}.pdf`);
      toast.success("Estado de cuenta descargado");
    } catch (err) {
      console.error("Error al generar el estado de cuenta:", err);
      toast.error("No se pudo generar el estado de cuenta");
    } finally {
      setGeneratingStatement(false);
    }
  }

  /** Historial completo (incluye anulados) — se lee directo de Dexie para no perder esos registros. */
  async function handleDownloadHistory() {
    setGeneratingHistory(true);
    try {
      const business = await settingsRepo.get();
      if (!business) {
        toast.error("Ajustes no configurados");
        return;
      }
      const [{ pdf }, { ClientHistoryPdf }, { db }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../pdf/ClientHistoryPdf"),
        import("../db/database"),
      ]);
      const allLoans = await db.loans.where("clientId").equals(client.id).toArray();
      const allLoanIds = allLoans.map((l) => l.id);
      const allPayments = (await db.payments.toArray()).filter((p) => allLoanIds.includes(p.loanId));
      const blob = await pdf(
        <ClientHistoryPdf business={business} client={client} loans={allLoans} payments={allPayments} />
      ).toBlob();
      downloadBlob(blob, `Historial_${sanitizeFilename(client.name)}_${toIsoDate(startOfToday())}.pdf`);
      toast.success("Historial descargado");
    } catch (err) {
      console.error("Error al generar el historial:", err);
      toast.error("No se pudo generar el historial");
    } finally {
      setGeneratingHistory(false);
    }
  }

  /** Re-descarga el comprobante de un pago ya registrado (Sprint 7a-4). Reutiliza PaymentReceiptPdf tal cual. */
  async function handleDownloadReceipt(loan: Loan, targetPayment: Payment) {
    setDownloadingReceiptId(targetPayment.id);
    try {
      const business = await settingsRepo.get();
      if (!business) {
        toast.error("Ajustes no configurados");
        return;
      }
      const loanPayments = payments.filter((p) => p.loanId === loan.id);
      // Sprint 7d-1: si el pago cerró una renovación, el comprobante muestra el préstamo NUEVO y su saldo
      // (igual que el comprobante generado al momento de renovar). Se consulta Dexie directo porque
      // `loans` (prop) excluye anulados y el hijo puede haberse anulado (reabriendo este préstamo).
      const { db } = await import("../db/database");
      const renewalChildren = await db.loans.filter((candidate) => candidate.renewedFromLoanId === loan.id).toArray();
      const activeChild = renewalChildren.find((child) => !child.cancelledAt);
      const chronological = [...loanPayments].sort((a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime());
      const closingRenewal = isClosingRenewalPayment(loan, chronological, targetPayment.id, renewalChildren.length > 0);
      const receiptLoan = closingRenewal && activeChild ? activeChild : loan;
      const balanceAfter = closingRenewal && activeChild
        ? deriveLoan(activeChild, new Date(targetPayment.paidAt)).balanceCents
        : balanceCentsAfterPayment(loan, loanPayments, targetPayment.id, renewalChildren.length > 0);
      const [{ pdf }, { PaymentReceiptPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../pdf/PaymentReceiptPdf"),
      ]);
      const blob = await pdf(
        <PaymentReceiptPdf
          business={business}
          client={client}
          loan={receiptLoan}
          payment={targetPayment}
          balanceCentsAfterPayment={balanceAfter}
        />
      ).toBlob();
      downloadBlob(blob, `Comprobante_${sanitizeFilename(client.name)}_${toIsoDate(new Date(targetPayment.paidAt))}.pdf`);
      toast.success("Comprobante descargado");
    } catch (err) {
      console.error("Error al generar el comprobante:", err);
      toast.error("No se pudo generar el comprobante");
    } finally {
      setDownloadingReceiptId(null);
    }
  }

  return (
    <div className="ovl" onClick={onClose}>
      <div className="sheet" style={{ height: "90vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ flexShrink: 0 }}>
          Detalle del Cliente <span className="x" onClick={onClose}><X size={17} /></span>
        </h3>
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, margin: "16px 0" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--card)", border: "1px solid var(--line)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
              <User size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{client.name}{client.editedAt && <span className="badge-edited">editado</span>}</div>
              <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>DNI {client.dni} · {client.phone}</div>
            </div>
            <button className="btn" aria-label="Editar cliente" onClick={() => setEditingClient(true)} style={{ background: "var(--card)", border: "1px solid var(--line)", padding: 8 }}><Pencil size={16} /></button>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-p btn-block"
              disabled={generatingStatement}
              onClick={handleDownloadStatement}
            >
              <Download size={16} /> {generatingStatement ? "Generando…" : "Estado de cuenta"}
            </button>
            <button
              className="btn btn-block"
              disabled={generatingHistory}
              onClick={handleDownloadHistory}
              style={{ background: "var(--card)", border: "1px solid var(--line)" }}
            >
              <Download size={16} /> {generatingHistory ? "Generando…" : "Historial"}
            </button>
          </div>

          <div className="pf-sect">Historial de préstamos</div>
          
          {sortedLoans.length === 0 ? (
            <div className="empty">Este cliente aún no tiene préstamos.</div>
          ) : (
            sortedLoans.map(loan => {
              const loanPayments = payments
                .filter(p => p.loanId === loan.id)
                .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
              // Sprint 6a-8c: bloquear edición si el préstamo tiene pagos activos (Patrón: Guard)
              const hasPayments = payments.filter(p => p.loanId === loan.id && !p.cancelledAt).length > 0;
              const d = deriveLoan(loan, startOfToday());
              const isActive = !loan.isPaid && !loan.cancelledAt;

              return (
                <div key={loan.id} className="preview" style={{ marginBottom: 12 }}>
                  <div className="r" style={{ fontWeight: 600 }}>
                    <span>Préstamo {formatShort(parseLocalDate(loan.disbursedAt))}</span>
                    <span>{formatSoles(loan.principalCents)} al {formatRatePercent(loan.rate)}{loan.editedAt && <span className="badge-edited">editado</span>}</span>
                  </div>
                  <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
                    {isActive && (
                      <button className="btn btn-p" aria-label="Cobrar" onClick={() => onPayLoan(loan.id)} style={{ padding: "7px 9px" }}>
                        <Banknote size={15} /> Cobrar
                      </button>
                    )}
                    <button
                      className="btn"
                      aria-label="Editar préstamo"
                      onClick={() => setEditingLoan(loan)}
                      disabled={hasPayments}
                      title={hasPayments ? "Anula los pagos primero para editar" : "Editar préstamo"}
                      style={{ background: "var(--card)", border: "1px solid var(--line)", padding: "7px 9px", opacity: hasPayments ? 0.4 : 1 }}
                    ><Pencil size={15} /> Editar</button>
                    <button className="btn btn-danger" aria-label="Anular préstamo" onClick={() => setCancellingLoan(loan)} style={{ padding: "7px 9px" }}><Trash2 size={15} /> Anular</button>
                  </div>
                  <div className="r" style={{ color: "var(--muted)" }}>
                    <span>Plazo: {loan.termDays} días</span>
                    {loan.cancelledAt ? (
                      <span style={{ color: "var(--muted)", fontWeight: 600 }}>Anulado</span>
                    ) : loan.isPaid ? (
                      // Sprint 7d-1: cerrado por renovación → "Renovado" (el saldo vive en el préstamo nuevo)
                      <span style={{ color: renewedLoanIds.has(loan.id) ? "var(--navy)" : "var(--good)", fontWeight: 600 }}>
                        {renewedLoanIds.has(loan.id) ? "Renovado" : "Pagado"}
                      </span>
                    ) : (
                      <span className="num" style={{ color: "var(--navy)", fontWeight: 600 }}>Saldo: {formatSoles(d.balanceCents)}</span>
                    )}
                  </div>

                  {/* Patrón: Presentational reuse — WhatsappButton reutilizable desde Hoy, Préstamos y Detalle (sprint 6a-5) */}
                  {!loan.isPaid && (
                    <div style={{ marginTop: 10 }}>
                      <WhatsappButton
                        client={client}
                        loan={loan}
                        balanceCents={d.balanceCents}
                        dueDate={d.dueDate}
                      />
                    </div>
                  )}

                  {loanPayments.length > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--line)" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 8 }}>
                        Pagos recibidos
                      </div>
                      {loanPayments.map((p, index) => (
                        <div key={p.id} className="r" style={{ fontSize: 12.5, gap: 6 }}>
                          <span>
                            {formatShort(new Date(p.paidAt))}
                            {p.type === "interest" && " (Renovación)"}
                            {p.type === "partial" && " (Abono)"}
                            {p.type === "full" && " (Cancelación)"}
                          </span>
                          <span className="num" style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
                            {formatSoles(p.amountCents)}{p.editedAt && <span className="badge-edited">editado</span>}
                            <button
                              className="btn"
                              aria-label="Descargar comprobante"
                              onClick={() => void handleDownloadReceipt(loan, p)}
                              disabled={downloadingReceiptId === p.id}
                              style={{ background: "transparent", padding: 2, color: "var(--navy)", opacity: downloadingReceiptId === p.id ? 0.5 : 1 }}
                            ><FileDown size={13} /></button>
                            <button className="btn" aria-label="Editar pago" onClick={() => setEditingPayment(p)} style={{ background: "transparent", padding: 2, color: "var(--muted)" }}><Pencil size={13} /></button>
                            {index === 0 && <button className="btn" aria-label="Anular pago" onClick={() => setCancellingPayment(p)} style={{ background: "transparent", padding: 2, color: "var(--color-status-bad)" }}><Trash2 size={13} /></button>}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}

          <div style={{ marginTop: 22 }}>
            <button
              className="btn btn-danger btn-block"
              disabled={hasActiveLoans}
              title={hasActiveLoans ? "Anula o cierra sus préstamos primero" : "Eliminar cliente"}
              onClick={() => setDeletingClient(true)}
            >
              <Trash2 size={15} /> Eliminar cliente
            </button>
            {hasActiveLoans && (
              <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6, textAlign: "center" }}>
                Anula o cierra sus préstamos primero
              </div>
            )}
          </div>
        </div>
      </div>
      {editingClient && <EditClientSheet client={client} onClose={() => setEditingClient(false)} onSave={async (patch) => { await onEditClient(client.id, patch); toast.success("Cliente actualizado"); }} />}
      {editingLoan && <EditLoanSheet loan={editingLoan} onClose={() => setEditingLoan(null)} onSave={async (patch) => {
        try { await onEditLoan(editingLoan.id, patch); toast.success("Préstamo actualizado"); }
        catch (err) { toast.error(err instanceof Error ? err.message : "Error al editar"); }
      }} />}
      {editingPayment && <EditPaymentSheet payment={editingPayment} onClose={() => setEditingPayment(null)} onSave={async (patch) => { await onEditPayment(editingPayment.id, patch); toast.success("Pago actualizado"); }} />}
      {cancellingLoan && <CancelLoanModal loan={cancellingLoan} payments={payments.filter((payment) => payment.loanId === cancellingLoan.id)} onClose={() => setCancellingLoan(null)} onConfirm={async (reason) => { await onCancelLoan(cancellingLoan.id, reason); toast.success("Préstamo anulado"); }} />}
      {cancellingPayment && <CancelPaymentModal payment={cancellingPayment} onClose={() => setCancellingPayment(null)} onConfirm={async (reason) => { await onCancelPayment(cancellingPayment.id, reason); toast.success("Pago anulado"); }} />}
      {deletingClient && <DeleteClientModal client={client} onClose={() => setDeletingClient(false)} onConfirm={async () => {
        try { await onDeleteClient(client.id); toast.success("Cliente eliminado"); onClose(); }
        catch (err) { toast.error(err instanceof Error ? err.message : "Error al eliminar"); }
      }} />}
    </div>
  );
}
