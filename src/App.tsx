import { useMemo, useState, useEffect, useRef, type ReactNode } from "react";
import {
  CalendarClock, Wallet, TrendingUp, AlertTriangle, Plus, X, CheckCircle2,
  Users, Home, WifiOff, Coins, User, Check, RefreshCw, Pencil
} from "lucide-react";
import { BrandLogo } from "./components/brand/BrandLogo";
import type { Client, Loan, LoanTerm, Payment, PaymentMethod, PaymentType, ClientRating } from "./types/domain";
import { deriveLoan, type LoanDerived, type LoanStatus } from "./domain/loanRules";
import { formatSoles, toCents } from "./lib/money";
import { formatShort, formatLong, addDays, startOfToday, toIsoDate } from "./lib/dates";
import { downloadBlob } from "./lib/downloadBlob";
import { useLiveQuery } from "dexie-react-hooks";
import { clientsRepo } from "./repositories/clientsRepo";
import { loansRepo } from "./repositories/loansRepo";
import { paymentsRepo } from "./repositories/paymentsRepo";
import { settingsRepo } from "./repositories/settingsRepo";
import { validateClientInput, type ClientInput, type ClientErrors } from "./domain/clientValidation";
import { validateLoanInput, type LoanErrors } from "./domain/loanValidation";
import { validateLoanBackfillInput, type LoanBackfillInput, type LoanBackfillErrors } from "./domain/loanBackfill";
import { LOAN_TERM_PRESETS } from "./domain/loanTerm";

import { useSync } from "./sync/SyncEngine";
import { useToast } from "./ui/ToastContext";
import { useDailyBrief } from "./ui/useDailyBrief";
import { recomputeAllRatings } from "./sync/ratingsSync";
import { collectedThisMonth } from "./domain/collections";
import { ClientDetailSheet } from "./components/ClientDetailSheet";
import { SettingsSheet } from "./components/SettingsSheet";
import { ProfileSheet } from "./components/ProfileSheet";
import { normalizeClientName, clientNameMatches } from "./domain/clientName";
import { PaymentSheet, type PaymentSubmitResult } from "./components/PaymentSheet";
import { WhatsappButton } from "./components/WhatsappButton";
import { useKeyboardAwareInput } from "./ui/useKeyboardAwareInput";
import { EditLoanSheet } from "./components/EditLoanSheet";
import { PushPermissionModal } from "./components/PushPermissionModal";
import { isPushSubscribed } from "./push/pushSubscription";

/* ------------------------------------------------------------------ *
 *  Fla MpM — Gestor de Préstamos (PWA)
 *  Tema azul marino. Reglas de negocio en ./domain/loanRules.ts
 * ------------------------------------------------------------------ */

const CSS = `
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.pf-root{background:var(--paper);color:var(--ink);font-family:Inter,system-ui,sans-serif;
  min-height:100vh;display:flex;justify-content:center}
.pf-shell{width:100%;max-width:500px;min-height:100vh;background:var(--paper);
  position:relative;padding-bottom:78px;display:flex;flex-direction:column}
.num{font-family:'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.pf-head{padding:18px 18px 14px;background:linear-gradient(160deg,var(--navy-light),var(--navy-deep));
  color:var(--cream);border-radius:0 0 22px 22px}
.pf-brand{display:flex;align-items:center;gap:8px;font-weight:700;font-size:15px;
  letter-spacing:.02em;opacity:.92}
.header-actions{display:flex;align-items:center;gap:8px}
.header-avatar{width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.26);
  background:rgba(255,255,255,.12);color:var(--cream);display:inline-flex;align-items:center;
  justify-content:center;cursor:pointer;flex-shrink:0}.header-avatar:active{transform:scale(.96)}
.profile-sheet{padding:20px 16px 22px}.profile-sheet__header{display:flex;align-items:center;gap:12px;color:var(--navy)}
.profile-sheet__header h2{margin:0;font-size:19px}.profile-sheet__header small{color:var(--muted)}.profile-sheet__header .x{margin-left:auto}
.profile-sheet__sync{margin:20px 0 14px;padding:13px;background:var(--card);border:1px solid var(--line);border-radius:12px;display:flex;flex-direction:column;gap:5px}
.profile-sheet__status{font-size:13px;font-weight:700}.profile-sheet__status.online{color:var(--color-status-good)}.profile-sheet__status.offline{color:var(--color-status-bad)}
.profile-sheet__sync small{color:var(--muted)}.profile-sheet__actions{display:flex;flex-direction:column;gap:9px}.profile-sheet__action{padding:12px;background:var(--color-status-good-soft);color:var(--navy);font-size:14px}
.profile-sheet__logout{background:var(--color-status-bad);color:#fff}
.badge-edited{font-size:10px;color:var(--muted);font-style:italic;margin-left:6px}
.cancel-modal{background:var(--paper);border-radius:16px;padding:20px;max-width:400px;width:90%;margin:auto}
.cancel-modal h4{margin:0 0 12px;font-size:16px;font-weight:700;color:var(--color-status-bad)}
.cancel-modal .affected{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px;margin:10px 0;font-size:12.5px}
.cancel-modal .confirm-input{margin-top:12px}.cancel-modal .confirm-input input{width:100%;text-align:center;letter-spacing:.05em}
.cancel-actions{display:flex;gap:8px;margin-top:14px}.cancel-actions .btn{flex:1}.btn-danger{background:var(--color-status-bad);color:#fff;border:none}.btn-danger:disabled{opacity:.4}
.pf-hello{font-size:13px;opacity:.72;margin-top:14px;text-transform:capitalize}
.pf-cobranza-lbl{font-size:12.5px;opacity:.78;margin-top:2px}
.pf-cobranza{font-size:40px;font-weight:700;line-height:1.05;margin-top:2px}
.pf-mini{display:flex;gap:8px;margin-top:14px}
.pf-mini > div{flex:1;background:rgba(255,255,255,.10);border-radius:12px;padding:9px 10px}
.pf-mini .k{font-size:11px;opacity:.72}
.pf-mini .v{font-size:16px;font-weight:600;margin-top:1px}
.pf-body{padding:14px 14px 20px;flex:1}
.pf-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
.pf-stat{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 13px}
.pf-stat .k{font-size:11.5px;color:var(--muted);display:flex;align-items:center;gap:6px}
.pf-stat .v{font-size:19px;font-weight:700;margin-top:5px}
.pf-sect{font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;
  letter-spacing:.06em;margin:18px 2px 9px;display:flex;align-items:center;gap:7px}
.pf-sect .cnt{background:var(--navy);color:#fff;border-radius:20px;font-size:11px;
  padding:1px 7px;font-weight:600}
.row{background:var(--card);border:1px solid var(--line);border-radius:14px;
  padding:12px 13px;margin-bottom:9px;display:flex;align-items:center;gap:11px;
  position:relative;overflow:hidden}
.row .bar{position:absolute;left:0;top:0;bottom:0;width:4px}
.row .who{flex:1;min-width:0}
.row .nm{font-weight:600;font-size:14.5px;display:flex;align-items:center;gap:7px}
.row .sub{font-size:12px;color:var(--muted);margin-top:2px}
.row .amt{text-align:right;flex-shrink:0}
.row .amt .big{font-weight:700;font-size:15px}
.row .amt .sm{font-size:11px;color:var(--muted)}
.chip{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;
  padding:2px 8px;border-radius:20px;white-space:nowrap}
.dot{width:7px;height:7px;border-radius:50%}
.btn{border:none;cursor:pointer;font-family:inherit;font-weight:600;border-radius:11px;
  display:inline-flex;align-items:center;justify-content:center;gap:7px;transition:.15s}
.btn:active{transform:scale(.97)}
.btn-p{background:var(--navy);color:#fff;padding:8px 12px;font-size:13px}
.btn-block{width:100%;padding:13px;font-size:15px}
.fab{position:fixed;bottom:92px;left:50%;transform:translateX(calc(-50% + 138px));
  background:var(--navy);color:#fff;width:54px;height:54px;border-radius:50%;
  box-shadow:0 6px 18px rgba(22,50,92,.42);z-index:20}
.nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:500px;
  background:#fff;border-top:1px solid var(--line);display:flex;padding:8px 0 12px;z-index:30}
.nav button{flex:1;background:none;border:none;cursor:pointer;font-family:inherit;
  display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--muted);
  font-size:11px;font-weight:600}
.nav button.on{color:var(--navy)}
.empty{text-align:center;color:var(--muted);font-size:13px;padding:22px 10px;
  background:var(--card);border:1px dashed var(--line);border-radius:14px}
.offbar{background:var(--accent-soft);color:#7a4d05;font-size:12px;font-weight:500;
  padding:8px 14px;display:flex;align-items:center;gap:8px;justify-content:center}
.ovl{position:fixed;inset:0;background:rgba(18,40,69,.46);z-index:50;display:flex;
  align-items:flex-end;justify-content:center}
.sheet{background:var(--paper);width:100%;max-width:500px;border-radius:20px 20px 0 0;
  padding:18px 16px 22px;max-height:90vh;overflow:auto}
.sheet h3{font-size:17px;font-weight:700;margin:0 0 3px;display:flex;justify-content:space-between;align-items:center}
.sheet .x{background:var(--card);border:1px solid var(--line);border-radius:9px;
  width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer}
.field{margin-top:13px}
.field label{font-size:12.5px;font-weight:600;color:var(--muted);display:block;margin-bottom:6px}
.inp{width:100%;background:var(--card);border:1px solid var(--line);border-radius:11px;
  padding:11px 12px;font-family:inherit;font-size:15px;color:var(--ink);outline:none;scroll-margin-bottom:120px}
.inp:focus{border-color:var(--accent)}
.seg{display:flex;gap:7px}
.seg button{flex:1;background:var(--card);border:1px solid var(--line);border-radius:11px;
  padding:10px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;color:var(--ink)}
.seg button.on{background:var(--navy);color:#fff;border-color:var(--navy)}
.preview{background:var(--card);border:1px solid var(--line);border-radius:13px;
  padding:13px;margin-top:15px}
.preview .r{display:flex;justify-content:space-between;font-size:13.5px;padding:4px 0}
.preview .r.tot{border-top:1px dashed var(--line);margin-top:5px;padding-top:9px;
  font-weight:700;font-size:16px}
.warn{background:var(--bad-soft);color:#7d281c;border-radius:12px;padding:11px 12px;
  font-size:12.5px;display:flex;gap:9px;margin-top:14px;align-items:flex-start}
.hist{font-size:12px;color:var(--muted);margin-top:8px;padding-left:2px}
.hist .h{display:flex;justify-content:space-between;padding:3px 0}
/* Patrón: Compound input — plazo libre + presets (sprint 6a-4) */
.term-input-wrap{display:flex;gap:7px;align-items:center}
.term-input-wrap .inp{flex:1;min-width:0}
.term-presets{display:flex;gap:5px;flex-shrink:0}
.term-preset-btn{background:var(--card);border:1px solid var(--line);border-radius:9px;
  padding:9px 10px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;
  color:var(--muted);transition:background .15s,color .15s,border-color .15s}
.term-preset-btn.active{background:var(--navy);color:#fff;border-color:var(--navy)}
.term-preset-btn:not(.active):hover{border-color:var(--accent);color:var(--ink)}
`;


/* ---------- etiquetas y colores (UI en español) ---------- */
interface RatingStyle { label: string; color: string; bg: string; }
const RATING_STYLE: Record<ClientRating, RatingStyle> = {
  good: { label: "Buen pagador", color: "var(--color-status-good)", bg: "var(--color-status-good-soft)" },
  slow: { label: "Se demora", color: "var(--color-status-slow)", bg: "var(--color-status-slow-soft)" },
  bad: { label: "Mal pagador", color: "var(--color-status-bad)", bg: "var(--color-status-bad-soft)" },
};

interface StatusStyle { label: string; color: string; bg: string; bar: string; }
const STATUS_STYLE: Record<LoanStatus, StatusStyle> = {
  active: { label: "Al día", color: "var(--muted)", bg: "var(--paper)", bar: "#C6CFDD" },
  dueSoon: { label: "Por vencer", color: "var(--warn)", bg: "var(--warn-soft)", bar: "var(--warn)" },
  dueToday: { label: "Vence hoy", color: "var(--accent)", bg: "var(--accent-soft)", bar: "var(--accent)" },
  grace: { label: "En tolerancia", color: "var(--warn)", bg: "var(--warn-soft)", bar: "var(--warn)" },
  lateInterest: { label: "Interés extra", color: "var(--bad)", bg: "var(--bad-soft)", bar: "var(--bad)" },
  paid: { label: "Pagado", color: "var(--good)", bg: "var(--good-soft)", bar: "var(--good)" },
};

/* ---------- modelos de vista ---------- */
interface LoanRow { loan: Loan; d: LoanDerived; client: Client; rating: ClientRating; }

/* ---------- app ---------- */
export default function App() {
  const sync = useSync();
  const toast = useToast();
  const clientsRaw = useLiveQuery(() => clientsRepo.all());
  const loansRaw = useLiveQuery(() => loansRepo.all());
  const paymentsRaw = useLiveQuery(() => paymentsRepo.all());

  const clients = clientsRaw ?? [];
  const loans = loansRaw ?? [];
  const payments = paymentsRaw ?? [];

  useDailyBrief({ loans: loansRaw, clients: clientsRaw });

  const [tab, setTab] = useState<"today" | "loans" | "clients">("today");
  const [payingId, setPayingId] = useState<string | null>(null);
  const [viewingClient, setViewingClient] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [generatingGlobalReport, setGeneratingGlobalReport] = useState(false);
  const [showPushModal, setShowPushModal] = useState(false);
  // Sprint 6a-8c: Patrón: controlled-sheet — editar préstamo desde tab Préstamos (LoanCard)
  const [editingLoanFromTab, setEditingLoanFromTab] = useState<Loan | null>(null);

  useEffect(() => {
    if (clients.length === 0 && loans.length === 0 && payments.length === 0) return;
    const t = setTimeout(() => {
      void recomputeAllRatings();
    }, 500);
    return () => clearTimeout(t);
  }, [loans, payments, clients]);

  // Sprint 5b-2: ofrecer activar notificaciones push una sola vez (hasta que las active o las descarte).
  useEffect(() => {
    const PUSH_DISMISSED_KEY = "fla_push_dismissed";
    if (localStorage.getItem(PUSH_DISMISSED_KEY)) return;
    void isPushSubscribed().then((subscribed) => {
      if (!subscribed) setShowPushModal(true);
    });
  }, []);

  function handlePushDismiss() {
    localStorage.setItem("fla_push_dismissed", "1");
    setShowPushModal(false);
  }

  function handlePushSuccess() {
    localStorage.setItem("fla_push_dismissed", "1");
    setShowPushModal(false);
    toast.success("Notificaciones activadas");
  }

  const clientById = (id: string): Client =>
    clients.find((c) => c.id === id) ?? ({} as Client);

  const rows = useMemo<LoanRow[]>(
    () =>
      loans.map((loan) => {
        const client = clientById(loan.clientId);
        return {
          loan,
          d: deriveLoan(loan),
          client,
          rating: client.rating ?? "good",
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loans, payments, clients]
  );

  const activeRows = rows.filter((r) => !r.loan.isPaid);
  const paidRows = rows.filter((r) => r.loan.isPaid).sort((a, b) => new Date(b.loan.createdAt).getTime() - new Date(a.loan.createdAt).getTime());
  // const badCount = activeRows.filter((r) => r.d.daysLate > 7).length; 
  const dueToday = activeRows.filter((r) => r.d.daysLate === 0).sort((a, b) => b.d.balanceCents - a.d.balanceCents);
  const overdue = activeRows.filter((r) => r.d.daysLate > 0).sort((a, b) => b.d.daysLate !== a.d.daysLate ? b.d.daysLate - a.d.daysLate : b.d.balanceCents - a.d.balanceCents);
  const dueSoon = activeRows.filter((r) => r.d.daysLate < 0 && r.d.daysLate >= -3).sort((a, b) => b.d.balanceCents - a.d.balanceCents);
  const capitalOut = activeRows.reduce((s, r) => s + r.loan.principalCents, 0);
  const interestOut = activeRows.reduce((s, r) => s + r.d.interestCents + r.d.lateInterestCents, 0);

  /* acciones */
  async function registerPayment(loanId: string, input: { type: PaymentType; amountCents: number; method: PaymentMethod }): Promise<PaymentSubmitResult> {
    const target = loans.find((l) => l.id === loanId);
    if (!target) return { error: "Préstamo no encontrado" };

    try {
      const result = await loansRepo.applyPayment({
        loan: target,
        type: input.type,
        amountCents: input.amountCents,
        method: input.method,
      });
      toast.success("Pago registrado");
      return {
        error: null,
        payment: result.payment,
        balanceCentsAfter: deriveLoan(result.updatedLoan).balanceCents,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ocurrió un error al procesar el pago";
      toast.error(msg);
      return { error: msg };
    }
  }

  async function handleEditClient(id: string, patch: Pick<Client, "name" | "dni" | "phone">) {
    await clientsRepo.update(id, patch);
  }

  async function handleEditLoan(id: string, patch: Partial<Pick<Loan, "principalCents" | "rate" | "termDays" | "disbursedAt">>) {
    await loansRepo.update(id, patch);
  }

  async function handleCancelLoan(id: string, reason?: string) {
    return loansRepo.cancel(id, reason);
  }

  async function handleEditPayment(id: string, patch: Pick<Payment, "method">) {
    await paymentsRepo.update(id, patch);
  }

  async function handleCancelPayment(id: string, reason?: string) {
    await paymentsRepo.cancel(id, reason);
  }

  /** Patrón: dynamic import — @react-pdf/renderer solo se carga al tocar "Reporte global". */
  async function handleDownloadGlobalReport() {
    setGeneratingGlobalReport(true);
    try {
      const business = await settingsRepo.get();
      if (!business) {
        toast.error("Ajustes no configurados");
        return;
      }
      const [{ pdf }, { GlobalReportPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./pdf/GlobalReportPdf"),
      ]);
      const [allClients, allLoans, allPayments] = await Promise.all([
        clientsRepo.all(),
        loansRepo.all(),
        paymentsRepo.all(),
      ]);
      const blob = await pdf(
        <GlobalReportPdf business={business} clients={allClients} loans={allLoans} payments={allPayments} />
      ).toBlob();
      downloadBlob(blob, `ReporteGlobal_${toIsoDate(startOfToday())}.pdf`);
      toast.success("Reporte global descargado");
    } catch {
      toast.error("No se pudo generar el reporte");
    } finally {
      setGeneratingGlobalReport(false);
    }
  }

  async function createLoan(input: { clientId: string; principalCents: number; rate: number; termDays: LoanTerm }) {
    const validation = validateLoanInput(input);
    if (!validation.ok) return;
    try {
      await loansRepo.create(input);
      setCreating(false);
      setTab("loans");
      toast.success("Préstamo creado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al crear préstamo");
    }
  }

  async function createHistoricalLoan(input: LoanBackfillInput): Promise<string | null> {
    try {
      await loansRepo.backfill(input);
      setCreating(false);
      setTab("loans");
      toast.success("Histórico registrado");
      return null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al registrar el préstamo histórico";
      toast.error(msg);
      return msg;
    }
  }

  async function createClient(input: ClientInput): Promise<string | null> {
    const existing = await clientsRepo.findByDni(input.dni);
    if (existing) return "Ya existe un cliente con ese DNI";
    try {
      await clientsRepo.create({ name: input.name, dni: input.dni, phone: input.phone });
      setCreatingClient(false);
      toast.success("Cliente registrado");
      return null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al crear cliente";
      toast.error(msg);
      return msg;
    }
  }

  const payingRow = payingId ? rows.find((r) => r.loan.id === payingId) ?? null : null;

  return (
    <div className="pf-root">
      <style>{CSS + "\n@keyframes spin { 100% { transform: rotate(360deg); } }"}</style>
      <div className="pf-shell">
        {sync.status === "offline" && (
          <div className="offbar">
            <WifiOff size={14} /> Sin conexión · los cambios se guardan aquí y se sincronizan luego
          </div>
        )}

        <div className="pf-head">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="pf-brand"><BrandLogo size={18} /> Fla MpM</div>
            <div className="header-actions">
            {sync.status === "synced" && (
              <div style={{ background: "var(--good-soft)", color: "var(--good)", borderRadius: 9, padding: "4px 8px", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                <Check size={13} /> Al día
              </div>
            )}
            {sync.status === "syncing" && (
              <div style={{ background: "var(--warn-soft)", color: "var(--warn)", borderRadius: 9, padding: "4px 8px", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> Sincronizando…
              </div>
            )}
            {sync.status === "offline" && (
              <div style={{ background: "var(--card)", color: "var(--muted)", borderRadius: 9, padding: "4px 8px", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                <WifiOff size={13} /> Offline · {sync.pendingCount} pendiente{sync.pendingCount !== 1 && "s"}
              </div>
            )}
            {sync.status === "error" && (
              <button onClick={() => sync.forcePush()} style={{ background: "var(--bad-soft)", border: "none", color: "var(--bad)", borderRadius: 9, padding: "4px 8px", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontFamily: "inherit" }}>
                <AlertTriangle size={13} /> Error de sync
              </button>
            )}
              {/* Patrón: Header action button + controlled sheet. Sprint 6a-6 */}
              <button type="button" onClick={() => setProfileOpen(true)} className="header-avatar" aria-label="Perfil">
                <User size={20} />
              </button>
            </div>
          </div>
          <div className="pf-hello">Buen día · {formatLong(startOfToday())} · 7:00 a.m.</div>
          <div className="pf-cobranza-lbl">Debes cobrar hoy</div>
          <div className="pf-cobranza num">{formatSoles(dueToday.reduce((s, r) => s + r.d.balanceCents, 0))}</div>
          <div className="pf-mini">
            <div><div className="k">Vencen hoy</div><div className="v num">{dueToday.length}</div></div>
            <div><div className="k">Atrasados</div><div className="v num">{overdue.length}</div></div>
            {/* TODO: componente sin uso desde sprint 6a-2, evaluar borrar si sigue sin uso en 2 sprints
            <div><div className="k">Mal pagador</div><div className="v num">{badCount}</div></div> */}
          </div>
        </div>

        <div className="pf-body">
          {tab === "today" && (
            <>
              <div className="pf-stats">
                <Stat icon={<Wallet size={13} />} k="Capital en la calle" v={formatSoles(capitalOut)} />
                <Stat icon={<TrendingUp size={13} />} k="Interés por cobrar" v={formatSoles(interestOut)} />
                <Stat icon={<Coins size={13} />} k="Cobrado este mes" v={formatSoles(collectedThisMonth(payments))} />
                <Stat icon={<Users size={13} />} k="Préstamos activos" v={String(activeRows.length)} />
              </div>

              {dueSoon.length > 0 && (
                <>
                  <div className="pf-sect"><CalendarClock size={14} /> Por vencer (próximos 3 días) <span className="cnt">{dueSoon.length}</span></div>
                  {dueSoon.map((r) => <LoanRowItem key={r.loan.id} row={r} onPay={() => setPayingId(r.loan.id)} />)}
                </>
              )}

              <div className="pf-sect"><CalendarClock size={14} /> Vence hoy <span className="cnt">{dueToday.length}</span></div>
              {dueToday.length ? (
                dueToday.map((r) => <LoanRowItem key={r.loan.id} row={r} onPay={() => setPayingId(r.loan.id)} />)
              ) : (
                <div className="empty">Nadie vence hoy. Todo tranquilo. 👌</div>
              )}

              <div className="pf-sect"><AlertTriangle size={14} /> Atrasados <span className="cnt">{overdue.length}</span></div>
              {overdue.length ? (
                overdue.map((r) => <LoanRowItem key={r.loan.id} row={r} onPay={() => setPayingId(r.loan.id)} />)
              ) : (
                <div className="empty">Sin atrasados. 🎉</div>
              )}
            </>
          )}

          {tab === "loans" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "4px 2px 12px" }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Préstamos</div>
                {loans.length > 0 && <button className="btn btn-p" onClick={() => setCreating(true)}><Plus size={16} /> Nuevo</button>}
              </div>
              {loans.length === 0 ? (
                <div className="empty" style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
                  Aún no tienes préstamos activos.
                  <button className="btn btn-p" onClick={() => setCreating(true)}><Plus size={16} /> Nuevo</button>
                </div>
              ) : (
                <>
                  {activeRows.map((r) => <LoanCard key={r.loan.id} row={r} onPay={() => setPayingId(r.loan.id)} onEdit={() => setEditingLoanFromTab(r.loan)} />)}
                  {paidRows.length > 0 && <div className="pf-sect"><CheckCircle2 size={14} /> Pagados (historial)</div>}
                  {paidRows.map((r) => <LoanCard key={r.loan.id} row={r} onPay={() => undefined} onEdit={() => undefined} />)}
                </>
              )}
            </>
          )}

          {tab === "clients" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "4px 2px 12px" }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Clientes</div>
                <button className="btn btn-p" onClick={() => setCreatingClient(true)}><Plus size={16} /> Nuevo</button>
              </div>
              
              {clients.length > 0 && (
                <div style={{ marginBottom: 16, padding: "0 2px" }}>
                  <input 
                    className="inp" 
                    placeholder="Buscar cliente..." 
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />
                </div>
              )}

              {clients.length === 0 ? (
                <div className="empty">Aún no tienes clientes. Agrega el primero para empezar.</div>
              ) : (
                clients
                  .filter(c => !clientSearch || clientNameMatches(c.name, clientSearch))
                  .map((c) => {
                  const theirs = rows.filter((r) => r.loan.clientId === c.id);
                  const rating = c.rating ?? "good";
                  const totalLent = theirs.reduce((s, r) => s + r.loan.principalCents, 0);
                return (
                  <div key={c.id} className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8, cursor: "pointer" }} onClick={() => setViewingClient(c.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--paper)",
                        display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                        <User size={18} />
                      </div>
                      <div className="who">
                        <div className="nm">{c.name}</div>
                        <div className="sub">DNI {c.dni} · {theirs.length} préstamo{theirs.length !== 1 ? "s" : ""}</div>
                      </div>
                      <RatingChip rating={rating} />
                    </div>
                    <div className="hist">
                      {theirs.map((r) => (
                        <div className="h" key={r.loan.id}>
                          <span>
                            {formatShort(r.d.disbursedDate)} · {formatSoles(r.loan.principalCents)} al {r.loan.rate * 100}%
                            {r.loan.renewalCount > 0 ? ` · renovó ${r.loan.renewalCount}×` : ""}
                          </span>
                          <span className="num" style={{ color: r.loan.isPaid ? "var(--good)" : "var(--ink)" }}>
                            {r.loan.isPaid ? "pagado" : formatSoles(r.d.balanceCents)}
                          </span>
                        </div>
                      ))}
                      <div className="h" style={{ fontWeight: 600, borderTop: "1px dashed var(--line)", marginTop: 4, paddingTop: 6 }}>
                        <span>Total histórico prestado</span><span className="num">{formatSoles(totalLent)}</span>
                      </div>
                    </div>
                  </div>
                );
              }))}
              
            </>
          )}
        </div>

        {tab === "loans" && <button className="fab" onClick={() => setCreating(true)}><Plus size={24} /></button>}
        {tab === "clients" && <button className="fab" onClick={() => setCreatingClient(true)}><Plus size={24} /></button>}

        <div className="nav">
          <NavBtn on={tab === "today"} onClick={() => setTab("today")} icon={<Home size={20} />} label="Hoy" />
          <NavBtn on={tab === "loans"} onClick={() => setTab("loans")} icon={<Wallet size={20} />} label="Préstamos" />
          <NavBtn on={tab === "clients"} onClick={() => setTab("clients")} icon={<Users size={20} />} label="Clientes" />
        </div>

        {payingRow && (
          <PaymentSheet
            client={payingRow.client}
            loan={payingRow.loan}
            derived={payingRow.d}
            onClose={() => setPayingId(null)}
            onSubmit={(input) => registerPayment(payingRow.loan.id, input)}
          />
        )}
        {viewingClient && (
          <ClientDetailSheet
            client={clientById(viewingClient)}
            loans={loans.filter(l => l.clientId === viewingClient)}
            payments={payments.filter(p => loans.some(l => l.id === p.loanId && l.clientId === viewingClient))}
            onClose={() => setViewingClient(null)}
            onEditClient={handleEditClient}
            onEditLoan={handleEditLoan}
            onCancelLoan={handleCancelLoan}
            onEditPayment={handleEditPayment}
            onCancelPayment={handleCancelPayment}
          />
        )}
        {creating && (
          <NewLoanSheet
            clients={clients}
            
            onClose={() => setCreating(false)}
            onOpenNewClient={() => { setCreating(false); setCreatingClient(true); }}
            onSubmit={createLoan}
            onSubmitHistorical={createHistoricalLoan}
          />
        )}
        {creatingClient && <NewClientSheet onClose={() => setCreatingClient(false)} onSubmit={createClient} />}
        <ProfileSheet
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          onOpenSettings={() => { setProfileOpen(false); setSettingsOpen(true); }}
          onDownloadGlobalReport={handleDownloadGlobalReport}
          generatingGlobalReport={generatingGlobalReport}
        />
        <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        {showPushModal && <PushPermissionModal onClose={handlePushDismiss} onSuccess={handlePushSuccess} />}
        {/* Sprint 6a-8c: Patrón: controlled-sheet — editar desde tab Préstamos (error por pagos activos → toast) */}
        {editingLoanFromTab && (
          <EditLoanSheet
            loan={editingLoanFromTab}
            onClose={() => setEditingLoanFromTab(null)}
            onSave={async (patch) => {
              try {
                await handleEditLoan(editingLoanFromTab.id, patch);
                setEditingLoanFromTab(null);
                toast.success("Préstamo actualizado");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Error al editar");
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- subcomponentes ---------- */
function Stat({ icon, k, v }: { icon: ReactNode; k: string; v: string }) {
  return <div className="pf-stat"><div className="k">{icon}{k}</div><div className="v num">{v}</div></div>;
}

function NavBtn({ on, onClick, icon, label }: { on: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return <button className={on ? "on" : ""} onClick={onClick}>{icon}{label}</button>;
}

function RatingChip({ rating }: { rating: ClientRating }) {
  const s = RATING_STYLE[rating];
  return (
    <span className="chip" style={{ background: s.bg, color: s.color }}>
      <span className="dot" style={{ background: s.color }} />{s.label}
    </span>
  );
}

function StatusChip({ status }: { status: LoanStatus }) {
  const s = STATUS_STYLE[status];
  return <span className="chip" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
}

function LoanRowItem({ row, onPay }: { row: LoanRow; onPay: () => void }) {
  const { loan, d, client, rating } = row;
  const s = STATUS_STYLE[d.status];
  const sub =
    d.daysLate > 0
      ? `${d.daysLate} día${d.daysLate !== 1 ? "s" : ""} de atraso${d.latePeriods > 0 ? ` · +${d.latePeriods} interés` : ""}`
      : d.daysLate === 0
        ? "Vence hoy"
        : `Vence ${formatShort(d.dueDate)}`;
  return (
    <div className="row">
      <div className="bar" style={{ background: s.bar }} />
      <div className="who">
        <div className="nm">
          {client.name}
          <span className="dot" style={{ background: RATING_STYLE[rating].color }} title={RATING_STYLE[rating].label} />
        </div>
        <div className="sub">{sub}</div>
      </div>
      <div className="amt">
        <div className="big num">{formatSoles(d.balanceCents)}</div>
        {loan.paidOffCents > 0 && <div className="sm num">abonó {formatSoles(loan.paidOffCents)}</div>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
        <WhatsappButton client={client} loan={loan} balanceCents={d.balanceCents} dueDate={d.dueDate} />
        <button className="btn btn-p" onClick={onPay}>Cobrar</button>
      </div>
    </div>
  );
}

// Sprint 6a-8c: Patrón: Presentational — botón Editar en LoanCard (tab Préstamos)
function LoanCard({ row, onPay, onEdit }: { row: LoanRow; onPay: () => void; onEdit: () => void }) {
  const { loan, d, client } = row;
  return (
    <div className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 9 }}>
      <div className="bar" style={{ background: STATUS_STYLE[d.status].bar }} />
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <div className="who">
          <div className="nm">{client.name}</div>
          <div className="sub">
            {formatSoles(loan.principalCents)} al {loan.rate * 100}% · {loan.termDays} días
            {loan.renewalCount > 0 ? ` · renovó ${loan.renewalCount}×` : ""}
          </div>
        </div>
        <StatusChip status={d.status} />
        {!loan.isPaid && (
          <button className="btn" aria-label="Editar préstamo" onClick={onEdit} style={{ background: "var(--card)", border: "1px solid var(--line)", padding: 6 }}><Pencil size={14} /></button>
        )}
      </div>
      <div className="preview" style={{ margin: 0 }}>
        <div className="r"><span>Entrega → Pago</span><span className="num">{formatShort(d.disbursedDate)} → {formatShort(d.dueDate)}</span></div>
        <div className="r"><span>Interés ({loan.rate * 100}%)</span><span className="num">{formatSoles(d.interestCents)}</span></div>
        {d.lateInterestCents > 0 && (
          <div className="r" style={{ color: "var(--bad)" }}>
            <span>Interés por atraso (×{d.latePeriods})</span><span className="num">{formatSoles(d.lateInterestCents)}</span>
          </div>
        )}
        <div className="r tot">
          <span>{loan.isPaid ? "Pagado" : "Saldo a cobrar"}</span>
          <span className="num" style={{ color: loan.isPaid ? "var(--good)" : "var(--ink)" }}>
            {loan.isPaid ? formatSoles(d.debtCents) : formatSoles(d.balanceCents)}
          </span>
        </div>
      </div>
      {!loan.isPaid && (
        // Patrón: Presentational reuse — mismo WhatsappButton que pestaña Hoy (sprint 6a-5)
        <div style={{ display: "flex", gap: 8 }}>
          <WhatsappButton client={client} loan={loan} balanceCents={d.balanceCents} dueDate={d.dueDate} />
          <button className="btn btn-p btn-block" onClick={onPay}>Registrar pago</button>
        </div>
      )}
    </div>
  );
}


function NewLoanSheet({ clients, onClose, onOpenNewClient, onSubmit, onSubmitHistorical }: {
  clients: Client[];
  onClose: () => void;
  onOpenNewClient: () => void;
  onSubmit: (input: { clientId: string; principalCents: number; rate: number; termDays: LoanTerm }) => void;
  onSubmitHistorical?: (input: LoanBackfillInput) => Promise<string | null>;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  useKeyboardAwareInput(sheetRef);
  const [mode, setMode] = useState<"new" | "historical">("new");
  const [clientId, setClientId] = useState<string>(clients[0]?.id ?? "");
  const [principal, setPrincipal] = useState("");
  // Sprint 6a-8c: Fla piensa en montos, no en porcentajes. rate = interésCents / principalCents.
  const [interestAmount, setInterestAmount] = useState("");
  const [termDays, setTermDays] = useState<LoanTerm>(30);

  // Historical fields
  const [lastCycleStart, setLastCycleStart] = useState("");
  const [renewalCount, setRenewalCount] = useState("0");
  const [outstandingBalance, setOutstandingBalance] = useState("");

  const [errors, setErrors] = useState<LoanErrors & LoanBackfillErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const principalCents = toCents(parseFloat(principal) || 0);
  // Sprint 6a-8c: rate = interésCents / principalCents (Fla ingresa monto, no porcentaje)
  const interestCents = toCents(parseFloat(interestAmount) || 0);
  const rate = principalCents > 0 ? interestCents / principalCents : 0;
  const totalCents = principalCents + interestCents;
  const client = clients.find(c => c.id === clientId);
  const isBad = client?.rating === "bad";
  // Patrón: Domain Value Object — usar constantes del dominio en la UI
  const terms = LOAN_TERM_PRESETS;


  let historicalPreview = null;
  if (mode === "historical") {
    try {
      const previewLoan: Loan = {
        id: "__preview__",
        clientId,
        principalCents,
        rate,
        termDays,
        disbursedAt: lastCycleStart,
        paidOffCents: 0,
        renewalCount: parseInt(renewalCount, 10) || 0,
        isPaid: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      // deriveLoan maneja fechas inválidas o NaN si lastCycleStart no está completo devolviendo NaN en calculations.
      // Así que lo validaremos solo si la fecha es más o menos parseable.
      if (lastCycleStart && !isNaN(new Date(lastCycleStart).getTime())) {
        const d = deriveLoan(previewLoan, startOfToday());
        const outCents = toCents(parseFloat(outstandingBalance) || 0);
        const consol = outCents > 0 && d.debtCents > 0 ? d.debtCents - outCents : 0;
        historicalPreview = {
          dueDate: d.dueDate,
          debtCents: d.debtCents,
          consolCents: consol,
          status: d.status,
        };
      }
    } catch (e) {
      // ignore preview error
    }
  }

  async function handleSubmit() {
    setSubmitError(null);
    setErrors({});

    if (mode === "new") {
      const input = { clientId, principalCents, rate, termDays };
      const validation = validateLoanInput(input);
      if (!validation.ok) {
        setErrors(validation.errors);
        return;
      }
      onSubmit(input);
    } else {
      const input: LoanBackfillInput = {
        clientId,
        principalCents,
        rate,
        termDays,
        lastCycleStart,
        renewalCount: parseInt(renewalCount, 10) || 0,
        outstandingBalanceCents: toCents(parseFloat(outstandingBalance) || 0),
      };
      const validation = validateLoanBackfillInput(input);
      if (!validation.ok) {
        setErrors(validation.errors);
        return;
      }
      if (onSubmitHistorical) {
        const err = await onSubmitHistorical(input);
        if (err) setSubmitError(err);
      }
    }
  }

  return (
    <div className="ovl" onClick={onClose}>
      <div ref={sheetRef} className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>Nuevo préstamo <span className="x" onClick={onClose}><X size={17} /></span></h3>

        {clients.length === 0 ? (
          <div className="warn" style={{ flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
            <div>Primero registra un cliente para poder prestar.</div>
            <button className="btn btn-p" onClick={onOpenNewClient}>Registrar cliente</button>
          </div>
        ) : (
          <>
            <div className="seg" style={{ marginBottom: 16 }}>
              <button className={mode === "new" ? "on" : ""} onClick={() => { setMode("new"); setErrors({}); setSubmitError(null); }}>Nuevo</button>
              <button className={mode === "historical" ? "on" : ""} onClick={() => { setMode("historical"); setErrors({}); setSubmitError(null); }}>Registro histórico</button>
            </div>

            <div className="field">
              <label>Cliente</label>
              <select className="inp" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                {clientId === "" && <option value="" disabled>Selecciona un cliente</option>}
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name} — DNI {c.dni}</option>)}
              </select>
              {errors.clientId && <div style={{ color: "var(--bad)", fontSize: 11, marginTop: 4 }}>{errors.clientId}</div>}
            </div>

            {isBad && (
              <div className="warn">
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span><b>Este cliente quedó como mal pagador.</b> Puedes prestarle igual — tú decides — pero revisa su historial antes.</span>
              </div>
            )}

            <div className="field">
              <label>Capital a prestar (S/)</label>
              <input className="inp num" inputMode="decimal" value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="1000.00" />
              {errors.principal && <div style={{ color: "var(--bad)", fontSize: 11, marginTop: 4 }}>{errors.principal}</div>}
            </div>

            <div style={{ display: "flex", gap: 11 }}>
              <div className="field" style={{ flex: 1 }}>
                <label>Interés (S/)</label>
                <input className="inp num" inputMode="decimal" value={interestAmount} onChange={(e) => setInterestAmount(e.target.value)} placeholder="200.00" />
                {principalCents > 0 && interestCents > 0 && (
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>= {(rate * 100).toFixed(1)}%</div>
                )}
                {errors.rate && <div style={{ color: "var(--bad)", fontSize: 11, marginTop: 4 }}>{errors.rate}</div>}
              </div>
              <div className="field" style={{ flex: 2 }}>
                <label>Plazo (días)</label>
                {/* Patrón: Compound input — número libre + presets. Shortcuts respetan hábito de Fla. */}
                <div className="term-input-wrap">
                  <input
                    className="inp num"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={365}
                    step={1}
                    value={termDays}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setTermDays(isNaN(v) ? 1 : v);
                    }}
                  />
                  <div className="term-presets">
                    {terms.map((day) => (
                      <button
                        key={day}
                        type="button"
                        className={`term-preset-btn${termDays === day ? " active" : ""}`}
                        onClick={() => setTermDays(day)}
                      >
                        {day}d
                      </button>
                    ))}
                  </div>
                </div>
                {errors.termDays && <div style={{ color: "var(--bad)", fontSize: 11, marginTop: 4 }}>{errors.termDays}</div>}
              </div>

            </div>

            {mode === "historical" && (
              <>
                <div className="field">
                  <label>Fecha de última renovación (o entrega)</label>
                  <input type="date" className="inp" value={lastCycleStart} onChange={(e) => setLastCycleStart(e.target.value)} />
                  {errors.lastCycleStart && <div style={{ color: "var(--bad)", fontSize: 11, marginTop: 4 }}>{errors.lastCycleStart}</div>}
                </div>
                <div className="field">
                  <label>Renovaciones previas</label>
                  <input type="number" className="inp num" value={renewalCount} onChange={(e) => setRenewalCount(e.target.value)} />
                  {errors.renewalCount && <div style={{ color: "var(--bad)", fontSize: 11, marginTop: 4 }}>{errors.renewalCount}</div>}
                </div>
                <div className="field">
                  <label>Saldo pendiente hoy (S/)</label>
                  <input className="inp num" inputMode="decimal" value={outstandingBalance} onChange={(e) => setOutstandingBalance(e.target.value)} placeholder="0.00" />
                  {errors.outstandingBalance && <div style={{ color: "var(--bad)", fontSize: 11, marginTop: 4 }}>{errors.outstandingBalance}</div>}
                </div>
              </>
            )}

            {mode === "new" ? (
              <div className="preview">
                <div className="r"><span>Capital</span><span className="num">{formatSoles(principalCents)}</span></div>
                <div className="r"><span>Interés</span><span className="num">{formatSoles(interestCents)}</span></div>
                <div className="r"><span>Fecha de pago</span><span className="num">{formatShort(addDays(startOfToday(), termDays))}</span></div>
                <div className="r tot"><span>Deberá pagar</span><span className="num">{formatSoles(totalCents)}</span></div>
              </div>
            ) : (
              <div className="preview">
                <div className="r"><span>Ciclo actual vence</span><span className="num">{historicalPreview ? formatShort(historicalPreview.dueDate) : "—"}</span></div>
                <div className="r"><span>Deuda del ciclo</span><span className="num">{historicalPreview && !isNaN(historicalPreview.debtCents) ? formatSoles(historicalPreview.debtCents) : "—"}</span></div>
                <div className="r"><span>Abonos consolidados</span><span className="num">{historicalPreview && historicalPreview.consolCents > 0 ? formatSoles(historicalPreview.consolCents) : "Sin abonos"}</span></div>
                <div className="r tot"><span>Estado</span><span>{historicalPreview ? (
                  historicalPreview.status === "lateInterest" ? "Interés extra" :
                  historicalPreview.status === "grace" ? "En tolerancia" :
                  historicalPreview.status === "dueToday" ? "Vence hoy" : "Al día"
                ) : "—"}</span></div>
              </div>
            )}

            <button
              className="btn btn-p btn-block"
              style={{ marginTop: 18 }}
              disabled={principalCents <= 0 || !Number.isInteger(principalCents) || (mode === "new" && interestCents <= 0)}
              onClick={handleSubmit}
            >
              {mode === "new" ? "Registrar préstamo" : "Registrar préstamo existente"}
            </button>
            {submitError && (
              <div style={{ color: "var(--bad)", fontSize: 13, marginTop: 12, textAlign: "center", fontWeight: 500 }}>
                {submitError}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function NewClientSheet({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (input: ClientInput) => Promise<string | null>;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  useKeyboardAwareInput(sheetRef);
  const [name, setName] = useState("");
  const [dni, setDni] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<ClientErrors>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const input = { name, dni, phone };
    const validation = validateClientInput(input);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }
    setSubmitting(true);
    const err = await onSubmit(input);
    setSubmitting(false);
    if (err) {
      setErrors({ dni: err });
    }
  }

  return (
    <div className="ovl" onClick={onClose}>
      <div ref={sheetRef} className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>Nuevo cliente <span className="x" onClick={onClose}><X size={17} /></span></h3>
        
        <div className="field">
          <label>Nombre</label>
          <input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Ana Torres" />
          {name && <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 4 }}>Se guardará como: {normalizeClientName(name)}</div>}
          {errors.name && <div style={{ color: "var(--bad)", fontSize: 11, marginTop: 4 }}>{errors.name}</div>}
        </div>

        <div className="field">
          <label>DNI</label>
          <input className="inp num" inputMode="numeric" maxLength={8} value={dni} onChange={(e) => setDni(e.target.value)} placeholder="8 dígitos" />
          {errors.dni && <div style={{ color: "var(--bad)", fontSize: 11, marginTop: 4 }}>{errors.dni}</div>}
        </div>

        <div className="field">
          <label>Celular</label>
          <input className="inp num" inputMode="numeric" maxLength={9} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9 dígitos" />
          {errors.phone && <div style={{ color: "var(--bad)", fontSize: 11, marginTop: 4 }}>{errors.phone}</div>}
        </div>

        <button
          className="btn btn-p btn-block"
          style={{ marginTop: 18 }}
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Guardando..." : "Guardar cliente"}
        </button>
      </div>
    </div>
  );
}
