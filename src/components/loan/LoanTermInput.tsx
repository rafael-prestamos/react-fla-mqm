import { LOAN_TERM_PRESETS, LOAN_TERM_MIN, LOAN_TERM_MAX } from "../../domain/loanTerm";

interface Props {
  value: number;
  onChange: (termDays: number) => void;
  error?: string;
}

/**
 * Plazo en días: número libre (1-365) + presets 25/28/30 (sprint 6a-4).
 * Patrón: Compound input — extraído en el sprint 7d-1 para compartirlo entre
 * NewLoanSheet, EditLoanSheet y la renovación en PaymentSheet sin duplicar markup.
 */
export function LoanTermInput({ value, onChange, error }: Props) {
  return (
    <div className="field">
      <label>Plazo (días)</label>
      <div className="term-input-wrap">
        <input
          className="inp num"
          type="number"
          inputMode="numeric"
          min={LOAN_TERM_MIN}
          max={LOAN_TERM_MAX}
          step={1}
          value={value}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            onChange(isNaN(v) ? LOAN_TERM_MIN : v);
          }}
        />
        <div className="term-presets">
          {LOAN_TERM_PRESETS.map((day) => (
            <button
              key={day}
              type="button"
              className={`term-preset-btn${value === day ? " active" : ""}`}
              onClick={() => onChange(day)}
            >
              {day}d
            </button>
          ))}
        </div>
      </div>
      {error && <div style={{ color: "var(--bad)", fontSize: 11, marginTop: 4 }}>{error}</div>}
    </div>
  );
}
