import { useMemo, useState, type ReactNode } from "react";
import {
  CalendarClock, Wallet, TrendingUp, AlertTriangle, Plus, X, CheckCircle2,
  Users, Home, WifiOff, Coins, User, PawPrint, Check, RefreshCw
} from "lucide-react";
import type { Client, Loan, LoanTerm, PaymentMethod, PaymentType, ClientRating } from "./types/domain";
import { deriveLoan, classifyByMaxDaysLate, type LoanDerived, type LoanStatus } from "./domain/loanRules";
import { formatSoles, toCents } from "./lib/money";
import { formatShort, formatLong, addDays, startOfToday } from "./lib/dates";
import { useLiveQuery } from "dexie-react-hooks";
import { clientsRepo } from "./repositories/clientsRepo";
import { loansRepo } from "./repositories/loansRepo";
import { paymentsRepo } from "./repositories/paymentsRepo";
import { validateClientInput, type ClientInput, type ClientErrors } from "./domain/clientValidation";
import { validateLoanInput, type LoanErrors } from "./domain/loanValidation";
import { validateLoanBackfillInput, type LoanBackfillInput, type LoanBackfillErrors } from "./domain/loanBackfill";
import { useSession } from "./auth/SessionContext";
import { useSync } from "./sync/SyncEngine";
import { useToast } from "./ui/ToastContext";

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
  padding:11px 12px;font-family:inherit;font-size:15px;color:var(--ink);outline:none}
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
`;

const COLLECTED_THIS_MONTH_CENTS = 340_000; // dato de ejemplo del panel

/* ---------- etiquetas y colores (UI en español) ---------- */
interface RatingStyle { label: string; color: string; bg: string; }
const RATING_STYLE: Record<ClientRating, RatingStyle> = {
  good: { label: "Buen pagador", color: "var(--good)", bg: "var(--good-soft)" },
  slow: { label: "Se demora", color: "var(--warn)", bg: "var(--warn-soft)" },
  bad: { label: "Mal pagador", color: "var(--bad)", bg: "var(--bad-soft)" },
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
  const { session, signOut } = useSession();
  const sync = useSync();
  const toast = useToast();
  const clients = useLiveQuery(() => clientsRepo.all()) ?? [];
  const loans = useLiveQuery(() => loansRepo.all()) ?? [];
  const payments = useLiveQuery(() => paymentsRepo.all()) ?? [];

  const [tab, setTab] = useState<"today" | "loans" | "clients">("today");
  const [payingId, setPayingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);

  const clientById = (id: string): Client =>
    clients.find((c) => c.id === id) ?? ({} as Client);

  const maxDaysLateOf = (clientId: string): number => {
    const fromLoans = loans
      .filter((l) => l.clientId === clientId && !l.isPaid)
      .map((l) => deriveLoan(l).daysLate);
    const fromHistory = payments
      .filter((p) => loans.some((l) => l.id === p.loanId && l.clientId === clientId))
      .map((p) => p.daysLate);
    return Math.max(0, ...fromLoans, ...fromHistory);
  };
  const ratingOf = (clientId: string): ClientRating =>
    classifyByMaxDaysLate(maxDaysLateOf(clientId));

  const rows = useMemo<LoanRow[]>(
    () =>
      loans.map((loan) => ({
        loan,
        d: deriveLoan(loan),
        client: clientById(loan.clientId),
        rating: ratingOf(loan.clientId),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loans, payments, clients]
  );

  const activeRows = rows.filter((r) => !r.loan.isPaid);
  const paidRows = rows.filter((r) => r.loan.isPaid);
  const dueToday = activeRows.filter((r) => r.d.daysLate === 0).sort((a, b) => b.d.balanceCents - a.d.balanceCents);
  const overdue = activeRows.filter((r) => r.d.daysLate > 0).sort((a, b) => b.d.daysLate !== a.d.daysLate ? b.d.daysLate - a.d.daysLate : b.d.balanceCents - a.d.balanceCents);
  const dueSoon = activeRows.filter((r) => r.d.daysLate < 0 && r.d.daysLate >= -3).sort((a, b) => b.d.balanceCents - a.d.balanceCents);
  const capitalOut = activeRows.reduce((s, r) => s + r.loan.principalCents, 0);
  const interestOut = activeRows.reduce((s, r) => s + r.d.interestCents + r.d.lateInterestCents, 0);
  const badCount = activeRows.filter((r) => r.d.daysLate > 7).length;

  /* acciones */
  async function registerPayment(loanId: string, input: { type: PaymentType; amountCents: number; method: PaymentMethod }): Promise<string | null> {
    const target = loans.find((l) => l.id === loanId);
    if (!target) return "Préstamo no encontrado";

    try {
      await loansRepo.applyPayment({
        loan: target,
        type: input.type,
        amountCents: input.amountCents,
        method: input.method,
      });
      setPayingId(null);
      toast.success("Pago registrado");
      return null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ocurrió un error al procesar el pago";
      toast.error(msg);
      return msg;
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
            <div className="pf-brand"><PawPrint size={18} /> Fla MpM</div>
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
          </div>
          <div className="pf-hello">Buen día · {formatLong(startOfToday())} · 7:00 a.m.</div>
          <div className="pf-cobranza-lbl">Debes cobrar hoy</div>
          <div className="pf-cobranza num">{formatSoles(dueToday.reduce((s, r) => s + r.d.balanceCents, 0))}</div>
          <div className="pf-mini">
            <div><div className="k">Vencen hoy</div><div className="v num">{dueToday.length}</div></div>
            <div><div className="k">Atrasados</div><div className="v num">{overdue.length}</div></div>
            <div><div className="k">Mal pagador</div><div className="v num">{badCount}</div></div>
          </div>
        </div>

        <div className="pf-body">
          {tab === "today" && (
            <>
              <div className="pf-stats">
                <Stat icon={<Wallet size={13} />} k="Capital en la calle" v={formatSoles(capitalOut)} />
                <Stat icon={<TrendingUp size={13} />} k="Interés por cobrar" v={formatSoles(interestOut)} />
                <Stat icon={<Coins size={13} />} k="Cobrado este mes" v={formatSoles(COLLECTED_THIS_MONTH_CENTS)} />
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
                  {activeRows.map((r) => <LoanCard key={r.loan.id} row={r} onPay={() => setPayingId(r.loan.id)} />)}
                  {paidRows.length > 0 && <div className="pf-sect"><CheckCircle2 size={14} /> Pagados (historial)</div>}
                  {paidRows.map((r) => <LoanCard key={r.loan.id} row={r} onPay={() => undefined} />)}
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
              {clients.length === 0 ? (
                <div className="empty">Aún no tienes clientes. Agrega el primero para empezar.</div>
              ) : (
                clients.map((c) => {
                  const theirs = rows.filter((r) => r.loan.clientId === c.id);
                  const rating = ratingOf(c.id);
                  const totalLent = theirs.reduce((s, r) => s + r.loan.principalCents, 0);
                return (
                  <div key={c.id} className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
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
              
              {session && (
                <div style={{ marginTop: 24, textAlign: "center" }}>
                  <button 
                    onClick={() => signOut()} 
                    style={{ background: "transparent", border: "1px solid var(--line)", color: "var(--muted)", padding: "8px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
                  >
                    Cerrar sesión ({session.user?.email})
                  </button>
                </div>
              )}
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
            row={payingRow}
            onClose={() => setPayingId(null)}
            onSubmit={(input) => registerPayment(payingRow.loan.id, input)}
          />
        )}
        {creating && (
          <NewLoanSheet
            clients={clients}
            ratingOf={ratingOf}
            onClose={() => setCreating(false)}
            onOpenNewClient={() => { setCreating(false); setCreatingClient(true); }}
            onSubmit={createLoan}
            onSubmitHistorical={createHistoricalLoan}
          />
        )}
        {creatingClient && <NewClientSheet onClose={() => setCreatingClient(false)} onSubmit={createClient} />}
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
      <button className="btn btn-p" onClick={onPay}>Cobrar</button>
    </div>
  );
}

function LoanCard({ row, onPay }: { row: LoanRow; onPay: () => void }) {
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
      {!loan.isPaid && <button className="btn btn-p btn-block" onClick={onPay}>Registrar pago</button>}
    </div>
  );
}

function PaymentSheet({ row, onClose, onSubmit }: {
  row: LoanRow;
  onClose: () => void;
  onSubmit: (input: { type: PaymentType; amountCents: number; method: PaymentMethod }) => Promise<string | null>;
}) {
  const { d, client } = row;
  const [type, setType] = useState<PaymentType>("full");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
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
    const err = await onSubmit({ type, amountCents, method });
    if (err) setSubmitError(err);
  };
  return (
    <div className="ovl" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
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
            <div className="r"><span>Renueva {row.loan.termDays} días · nueva fecha</span>
              <span className="num">{formatShort(addDays(d.dueDate, row.loan.termDays))}</span></div>
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

function NewLoanSheet({ clients, ratingOf, onClose, onOpenNewClient, onSubmit, onSubmitHistorical }: {
  clients: Client[];
  ratingOf: (clientId: string) => ClientRating;
  onClose: () => void;
  onOpenNewClient: () => void;
  onSubmit: (input: { clientId: string; principalCents: number; rate: number; termDays: LoanTerm }) => void;
  onSubmitHistorical?: (input: LoanBackfillInput) => Promise<string | null>;
}) {
  const [mode, setMode] = useState<"new" | "historical">("new");
  const [clientId, setClientId] = useState<string>(clients[0]?.id ?? "");
  const [principal, setPrincipal] = useState("");
  const [ratePct, setRatePct] = useState("20");
  const [termDays, setTermDays] = useState<LoanTerm>(30);

  // Historical fields
  const [lastCycleStart, setLastCycleStart] = useState("");
  const [renewalCount, setRenewalCount] = useState("0");
  const [outstandingBalance, setOutstandingBalance] = useState("");

  const [errors, setErrors] = useState<LoanErrors & LoanBackfillErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const principalCents = toCents(parseFloat(principal) || 0);
  const rate = (parseFloat(ratePct) || 0) / 100;
  const interestCents = Math.round(principalCents * rate);
  const totalCents = principalCents + interestCents;
  const isBad = ratingOf(clientId) === "bad";
  const terms: LoanTerm[] = [25, 28, 30];

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
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
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
                <label>Interés (%)</label>
                <input className="inp num" inputMode="decimal" value={ratePct} onChange={(e) => setRatePct(e.target.value)} />
                {errors.rate && <div style={{ color: "var(--bad)", fontSize: 11, marginTop: 4 }}>{errors.rate}</div>}
              </div>
              <div className="field" style={{ flex: 2 }}>
                <label>Plazo</label>
                <div className="seg">
                  {terms.map((day) => (
                    <button key={day} className={termDays === day ? "on" : ""} onClick={() => setTermDays(day)}>{day} días</button>
                  ))}
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
                <div className="r"><span>Interés ({ratePct || 0}%)</span><span className="num">{formatSoles(interestCents)}</span></div>
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
              disabled={principalCents <= 0 || !Number.isInteger(principalCents)}
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
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>Nuevo cliente <span className="x" onClick={onClose}><X size={17} /></span></h3>
        
        <div className="field">
          <label>Nombre</label>
          <input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Ana Torres" />
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
