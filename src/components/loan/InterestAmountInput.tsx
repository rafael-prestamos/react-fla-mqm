import { formatRatePercent } from "../../lib/money";

interface Props {
  value: string; // soles, texto libre del input
  onChange: (value: string) => void;
  principalCents: number; // para mostrar el % equivalente
  interestCents: number;
  error?: string;
  placeholder?: string;
  label?: string;
}

/**
 * Interés en soles con el % equivalente debajo (sprint 6a-8c: Fla piensa en montos, no en %).
 * Interés 0 es válido (sprint 7b-1). % siempre con formatRatePercent (2 decimales).
 * Extraído en el sprint 7d-1 para compartirlo entre préstamo nuevo, edición y renovación.
 */
export function InterestAmountInput({ value, onChange, principalCents, interestCents, error, placeholder = "200.00", label = "Interés (S/)" }: Props) {
  const rate = principalCents > 0 ? interestCents / principalCents : 0;
  return (
    <div className="field" style={{ flex: 1 }}>
      <label>{label}</label>
      <input className="inp num" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {principalCents > 0 && interestCents >= 0 && (
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>= {formatRatePercent(rate)}</div>
      )}
      {error && <div style={{ color: "var(--bad)", fontSize: 11, marginTop: 4 }}>{error}</div>}
    </div>
  );
}
