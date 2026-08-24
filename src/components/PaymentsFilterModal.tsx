import { useRef, useState } from "react";
import { X } from "lucide-react";
import { useKeyboardAwareInput } from "../ui/useKeyboardAwareInput";
import type { PaymentsDateFilter } from "../domain/paymentsFilter";

interface Props {
  filter: PaymentsDateFilter;
  onClose: () => void;
  onApply: (filter: PaymentsDateFilter) => void;
  onClear: () => void;
}

/** Patrón: controlled-sheet — filtro de fecha de la vista Cobros (sprint payments-filter-modal). */
export function PaymentsFilterModal({ filter, onClose, onApply, onClear }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  useKeyboardAwareInput(sheetRef);
  const [month, setMonth] = useState(filter.month ?? "");
  const [dateFrom, setDateFrom] = useState(filter.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(filter.dateTo ?? "");

  // Mes e intervalo son mutuamente excluyentes dentro del modal (mismo criterio que antes).
  function handleMonthChange(value: string) {
    setMonth(value);
    if (value) {
      setDateFrom("");
      setDateTo("");
    }
  }

  function handleRangeChange(field: "from" | "to", value: string) {
    if (field === "from") setDateFrom(value);
    else setDateTo(value);
    if (value) setMonth("");
  }

  function handleApply() {
    onApply(month ? { month } : { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
    onClose();
  }

  function handleClear() {
    setMonth("");
    setDateFrom("");
    setDateTo("");
    onClear();
    onClose();
  }

  return (
    <div className="ovl" onClick={onClose}>
      <div ref={sheetRef} className="sheet" onClick={(event) => event.stopPropagation()}>
        <h3>Filtrar cobros <span className="x" onClick={onClose}><X size={17} /></span></h3>

        <div className="field">
          <label>Mes</label>
          <input type="month" className="inp" value={month} onChange={(e) => handleMonthChange(e.target.value)} />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Desde</label>
            <input type="date" className="inp" value={dateFrom} onChange={(e) => handleRangeChange("from", e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Hasta</label>
            <input type="date" className="inp" value={dateTo} onChange={(e) => handleRangeChange("to", e.target.value)} />
          </div>
        </div>

        <button className="btn btn-p btn-block" style={{ marginTop: 18 }} onClick={handleApply}>Aplicar</button>
        <button
          className="btn btn-block"
          style={{ marginTop: 9, background: "var(--card)", border: "1px solid var(--line)" }}
          onClick={handleClear}
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}
