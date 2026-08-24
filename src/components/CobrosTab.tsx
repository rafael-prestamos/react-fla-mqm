import { useMemo, useState } from "react";
import { Coins, SlidersHorizontal, Download } from "lucide-react";
import type { Client, Loan, Payment } from "../types/domain";
import { formatSoles, formatRatePercent } from "../lib/money";
import { formatShort, startOfToday, toLocalIsoDate } from "../lib/dates";
import { paymentMethodLabel } from "../pdf/formatters";
import { sumPaymentsCents, type PaymentsDateFilter } from "../domain/paymentsFilter";
import { buildPaymentReportRows, paymentsReportSubtitle } from "../domain/paymentsReport";
import { settingsRepo } from "../repositories/settingsRepo";
import { downloadBlob } from "../lib/downloadBlob";
import { sanitizeFilename } from "../lib/sanitizeFilename";
import { useToast } from "../ui/ToastContext";
import { PaymentsFilterModal } from "./PaymentsFilterModal";

interface Props {
  clients: Client[];
  loans: Loan[];
  payments: Payment[];
}

/** Nombre de archivo del PDF de Cobros según el filtro activo. Sprint 7c-3. */
function cobrosPdfFilename(filter: PaymentsDateFilter, clientSearch: string): string {
  let period: string;
  if (filter.month) period = filter.month;
  else if (filter.dateFrom || filter.dateTo) period = `${filter.dateFrom ?? "inicio"}_${filter.dateTo ?? toLocalIsoDate(startOfToday())}`;
  else period = `todos-${toLocalIsoDate(startOfToday())}`;

  const searchSlug = clientSearch.trim() ? `_${sanitizeFilename(clientSearch)}` : "";
  return `cobros-${period}${searchSlug}.pdf`;
}

/** Patrón: Presentational — vista de Cobros (sprint 7c-2 + payments-filter-modal + PDF sprint 7c-3), join/filtro puro en paymentsReport.ts. */
export function CobrosTab({ clients, loans, payments }: Props) {
  const toast = useToast();
  const [dateFilter, setDateFilter] = useState<PaymentsDateFilter>({});
  const [clientSearch, setClientSearch] = useState("");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const filteredRows = useMemo(
    () => buildPaymentReportRows(clients, loans, payments, dateFilter, clientSearch),
    [clients, loans, payments, dateFilter, clientSearch]
  );

  const totalCents = sumPaymentsCents(filteredRows.map((r) => r.payment));
  const hasDateFilter = Boolean(dateFilter.month || dateFilter.dateFrom || dateFilter.dateTo);

  /** Patrón: dynamic import — @react-pdf/renderer solo se carga al tocar "Descargar PDF". */
  async function handleDownloadPdf() {
    setGeneratingPdf(true);
    try {
      const business = await settingsRepo.get();
      if (!business) {
        toast.error("Ajustes no configurados");
        return;
      }
      const [{ pdf }, { CobrosPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../pdf/CobrosPdf"),
      ]);
      const subtitle = paymentsReportSubtitle(dateFilter, clientSearch);
      const blob = await pdf(
        <CobrosPdf business={business} rows={filteredRows} subtitle={subtitle} totalCents={totalCents} />
      ).toBlob();
      downloadBlob(blob, cobrosPdfFilename(dateFilter, clientSearch));
      toast.success("Reporte de cobros descargado");
    } catch (err) {
      console.error("Error al generar el reporte de cobros:", err);
      toast.error("No se pudo generar el reporte");
    } finally {
      setGeneratingPdf(false);
    }
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "4px 2px 12px" }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Cobros</div>
        {payments.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn"
              aria-label="Descargar PDF"
              disabled={generatingPdf}
              onClick={() => void handleDownloadPdf()}
              style={{ background: "var(--card)", border: "1px solid var(--line)", padding: 8, opacity: generatingPdf ? 0.6 : 1 }}
            >
              <Download size={16} />
            </button>
            <button
              className="btn"
              aria-label="Filtrar cobros"
              onClick={() => setFilterModalOpen(true)}
              style={{ background: "var(--card)", border: "1px solid var(--line)", padding: 8, position: "relative" }}
            >
              <SlidersHorizontal size={16} />
              {hasDateFilter && (
                <span style={{ position: "absolute", top: 5, right: 5, width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
              )}
            </button>
          </div>
        )}
      </div>

      {payments.length > 0 && (
        <>
          <input
            className="inp"
            placeholder="Buscar por cliente..."
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            style={{ marginBottom: 14 }}
          />

          <div className="pf-stat" style={{ marginBottom: 16 }}>
            <div className="k"><Coins size={13} /> Total cobrado</div>
            <div className="v num" style={{ fontSize: 24 }}>{formatSoles(totalCents)}</div>
          </div>
        </>
      )}

      {payments.length === 0 ? (
        <div className="empty">Aún no se han registrado cobros.</div>
      ) : filteredRows.length === 0 ? (
        <div className="empty">No se encontraron cobros para este filtro.</div>
      ) : (
        filteredRows.map(({ payment, loan, client }) => (
          <div key={payment.id} className="row">
            <div className="who">
              <div className="nm">{client.name}</div>
              <div className="sub">
                {formatShort(new Date(payment.paidAt))} · {paymentMethodLabel(payment.method)} · {formatSoles(loan.principalCents)} al {formatRatePercent(loan.rate)}
              </div>
            </div>
            <div className="amt">
              <div className="big num">{formatSoles(payment.amountCents)}</div>
            </div>
          </div>
        ))
      )}

      {filterModalOpen && (
        <PaymentsFilterModal
          filter={dateFilter}
          onClose={() => setFilterModalOpen(false)}
          onApply={setDateFilter}
          onClear={() => setDateFilter({})}
        />
      )}
    </>
  );
}
