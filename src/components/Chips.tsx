import type { ClientRating } from "../types/domain";
import type { LoanStatus } from "../domain/loanRules";

export interface RatingStyle { label: string; color: string; bg: string; }
export const RATING_STYLE: Record<ClientRating, RatingStyle> = {
  good: { label: "Buen pagador", color: "var(--good)", bg: "var(--good-soft)" },
  slow: { label: "Se demora", color: "var(--warn)", bg: "var(--warn-soft)" },
  bad: { label: "Mal pagador", color: "var(--bad)", bg: "var(--bad-soft)" },
};

export interface StatusStyle { label: string; color: string; bg: string; bar: string; }
export const STATUS_STYLE: Record<LoanStatus, StatusStyle> = {
  active: { label: "Al día", color: "var(--muted)", bg: "var(--paper)", bar: "#C6CFDD" },
  dueSoon: { label: "Por vencer", color: "var(--warn)", bg: "var(--warn-soft)", bar: "var(--warn)" },
  dueToday: { label: "Vence hoy", color: "var(--accent)", bg: "var(--accent-soft)", bar: "var(--accent)" },
  grace: { label: "En tolerancia", color: "var(--warn)", bg: "var(--warn-soft)", bar: "var(--warn)" },
  lateInterest: { label: "Interés extra", color: "var(--bad)", bg: "var(--bad-soft)", bar: "var(--bad)" },
  paid: { label: "Pagado", color: "var(--good)", bg: "var(--good-soft)", bar: "var(--good)" },
};

export function RatingChip({ rating }: { rating: ClientRating }) {
  const s = RATING_STYLE[rating];
  return (
    <span className="chip" style={{ background: s.bg, color: s.color }}>
      <span className="dot" style={{ background: s.color }} />{s.label}
    </span>
  );
}

export function StatusChip({ status }: { status: LoanStatus }) {
  const s = STATUS_STYLE[status];
  return <span className="chip" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
}
