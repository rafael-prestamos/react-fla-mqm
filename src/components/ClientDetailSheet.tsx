import { useState } from "react";
import { X, User, Download, Pencil, Trash2 } from "lucide-react";
import type { Client, Loan, Payment } from "../types/domain";
import { formatSoles } from "../lib/money";
import { formatShort, startOfToday, toIsoDate } from "../lib/dates";
import { settingsRepo } from "../repositories/settingsRepo";
import { downloadBlob } from "../lib/downloadBlob";
import { sanitizeFilename } from "../lib/sanitizeFilename";
import { useToast } from "../ui/ToastContext";
import { deriveLoan } from "../domain/loanRules";
import { WhatsappButton } from "./WhatsappButton";
import { EditClientSheet } from "./EditClientSheet";
import { EditLoanSheet } from "./EditLoanSheet";
import { EditPaymentSheet } from "./EditPaymentSheet";
import { CancelLoanModal } from "./CancelLoanModal";
import { CancelPaymentModal } from "./CancelPaymentModal";


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
}

export function ClientDetailSheet({ client, loans, payments, onClose, onEditClient, onEditLoan, onCancelLoan, onEditPayment, onCancelPayment }: Props) {
  const toast = useToast();
  const [generatingStatement, setGeneratingStatement] = useState(false);
  const [generatingHistory, setGeneratingHistory] = useState(false);
  const [editingClient, setEditingClient] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [cancellingLoan, setCancellingLoan] = useState<Loan | null>(null);
  const [cancellingPayment, setCancellingPayment] = useState<Payment | null>(null);
  const sortedLoans = [...loans].sort((a, b) => new Date(b.disbursedAt).getTime() - new Date(a.disbursedAt).getTime());

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
    } catch {
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
    } catch {
      toast.error("No se pudo generar el historial");
    } finally {
      setGeneratingHistory(false);
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
              
              return (
                <div key={loan.id} className="preview" style={{ marginBottom: 12 }}>
                  <div className="r" style={{ fontWeight: 600 }}>
                    <span>Préstamo {formatShort(new Date(loan.disbursedAt))}</span>
                    <span>{formatSoles(loan.principalCents)} al {loan.rate * 100}%{loan.editedAt && <span className="badge-edited">editado</span>}</span>
                  </div>
                  <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
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
                    <span style={{ color: loan.isPaid ? "var(--good)" : "var(--warn)", fontWeight: 600 }}>
                      {loan.isPaid ? "Pagado" : "Activo"}
                    </span>
                  </div>

                  {/* Patrón: Presentational reuse — WhatsappButton reutilizable desde Hoy, Préstamos y Detalle (sprint 6a-5) */}
                  {!loan.isPaid && (() => {
                    const d = deriveLoan(loan, startOfToday());
                    return (
                      <div style={{ marginTop: 10 }}>
                        <WhatsappButton
                          client={client}
                          loan={loan}
                          balanceCents={d.balanceCents}
                          dueDate={d.dueDate}
                        />
                      </div>
                    );
                  })()}

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
    </div>
  );
}
