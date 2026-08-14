import { deriveInstallment } from "../domain/loanRules";
import { formatSoles } from "../lib/money";
import { formatShort } from "../lib/dates";
import { STATUS_STYLE, RATING_STYLE } from "./Chips";
import type { Installment, Client, Loan } from "../types/domain";

interface Props {
  installment: Installment;
  client: Client;
  loan: Loan;
  onPay: () => void;
}

export function InstallmentRow({ installment, client, loan, onPay }: Props) {
  const d = deriveInstallment(installment);
  const s = STATUS_STYLE[d.status];

  const sub =
    d.daysLate > 0
      ? `${d.daysLate} día${d.daysLate !== 1 ? "s" : ""} de atraso${d.latePeriods > 0 ? ` · +${d.latePeriods} interés` : ""}`
      : `Cuota ${installment.index}/${loan.installmentCount} · vence ${formatShort(new Date(installment.dueDate + "T00:00:00"))}`;

  // Placeholder for rating until 4c
  const rating = "good";

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
        <div className="big num">{formatSoles(d.totalOwedCents - installment.paidCents)}</div>
        {installment.paidCents > 0 && <div className="sm num">abonó {formatSoles(installment.paidCents)}</div>}
      </div>
      {d.status !== "paid" && (
        <button className="btn btn-p" onClick={onPay}>Cobrar</button>
      )}
    </div>
  );
}
