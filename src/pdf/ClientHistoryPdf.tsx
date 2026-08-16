import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import logoPdfUrl from "../assets/logo-pdf.png";

import type { BusinessSettings, Client, Loan, Payment } from "../types/domain";
import { formatSoles } from "../lib/money";
import { startOfToday } from "../lib/dates";
import { deriveLoan } from "../domain/loanRules";
import { paymentTypeLabel, paymentMethodLabel, formatDate, formatDateTime, ratingLabel } from "./formatters";

const NAVY = "#16325C";
const MUTED = "#65728A";
const GOOD = "#1E7A55";
const BAD = "#B3261E";
const LINE = "#E4E8F0";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, color: "#152238", fontFamily: "Helvetica" },
  header: {
    backgroundColor: NAVY,
    color: "#FBF5E9",
    padding: 18,
    borderRadius: 10,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  businessName: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 11, marginTop: 3, opacity: 0.85 },
  headerDate: { fontSize: 9, opacity: 0.85 },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 9,
    color: MUTED,
    textTransform: "uppercase",
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  rowLast: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  label: { color: MUTED },
  value: { fontFamily: "Helvetica-Bold" },
  summaryBox: {
    backgroundColor: "#F2F4F8",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  summaryItem: { width: "50%", marginBottom: 8 },
  summaryLabel: { fontSize: 8.5, color: MUTED },
  summaryValue: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 2 },
  table: { marginTop: 4 },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: NAVY,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableHeaderCell: { fontSize: 8.5, color: MUTED, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  tableCell: { fontSize: 9 },
  paidText: { color: GOOD, fontFamily: "Helvetica-Bold" },
  cancelledText: { color: BAD, fontFamily: "Helvetica-Bold" },
  loanBox: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  loanBoxCancelled: { opacity: 0.55 },
  loanBoxHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  loanBoxTitle: { fontFamily: "Helvetica-Bold", fontSize: 10.5 },
  loanBoxMeta: { flexDirection: "row", flexWrap: "wrap", marginTop: 2 },
  loanBoxMetaItem: { fontSize: 8.5, color: MUTED, marginRight: 12 },
  editedBadge: { fontSize: 8, color: MUTED },
  cancelReason: { fontSize: 8.5, color: BAD, marginTop: 4 },
  paymentRowCancelled: { opacity: 0.6 },
  strike: { textDecoration: "line-through" },
  footer: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: LINE,
    fontSize: 9.5,
    color: MUTED,
  },
  footerTitle: { fontFamily: "Helvetica-Bold", color: "#152238", marginBottom: 4 },
  pageFooter: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    fontSize: 8,
    color: MUTED,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

interface Props {
  business: BusinessSettings;
  client: Client;
  loans: Loan[]; // TODOS incluyendo anulados
  payments: Payment[]; // TODOS incluyendo anulados
  reference?: Date;
}

/** Prioridad de orden: activos primero, luego pagados, luego anulados. */
function loanSortPriority(loan: Loan): number {
  if (loan.cancelledAt) return 2;
  if (loan.isPaid) return 1;
  return 0;
}

function loanStatusLabel(loan: Loan): string {
  if (loan.cancelledAt) return "Anulado";
  if (loan.isPaid) return "Pagado";
  return "Activo";
}

export function ClientHistoryPdf({ business, client, loans, payments, reference = startOfToday() }: Props) {
  const sortedLoans = [...loans].sort((a, b) => {
    const priorityDiff = loanSortPriority(a) - loanSortPriority(b);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.disbursedAt).getTime() - new Date(a.disbursedAt).getTime();
  });

  const activeLoans = loans.filter((l) => !l.cancelledAt);
  const activePayments = payments.filter((p) => !p.cancelledAt);
  const totalLentCents = activeLoans.reduce((s, l) => s + l.principalCents, 0);
  const totalCollectedCents = activePayments.reduce((s, p) => s + p.amountCents, 0);
  const totalRenewals = activeLoans.reduce((s, l) => s + l.renewalCount, 0);

  const cancelledLoans = loans.filter((l) => l.cancelledAt);
  const cancelledPayments = payments.filter((p) => p.cancelledAt);
  const hasCancelledSection = cancelledLoans.length > 0 || cancelledPayments.length > 0;

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image src={logoPdfUrl} style={{ width: 64, height: 64, marginRight: 12 }} />
            <View>
              <Text style={styles.businessName}>{business.businessName}</Text>
              <Text style={styles.subtitle}>Historial completo</Text>
            </View>
          </View>
          <Text style={styles.headerDate}>{formatDate(reference.toISOString())}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre</Text>
            <Text style={styles.value}>{client.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>DNI</Text>
            <Text style={styles.value}>{client.dni}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Celular</Text>
            <Text style={styles.value}>{client.phone}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Cliente desde</Text>
            <Text style={styles.value}>{formatDate(client.createdAt)}</Text>
          </View>
          <View style={styles.rowLast}>
            <Text style={styles.label}>Clasificación</Text>
            <Text style={styles.value}>{ratingLabel(client.rating)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen</Text>
          <View style={styles.summaryBox}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total capital prestado</Text>
              <Text style={styles.summaryValue}>{formatSoles(totalLentCents)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total cobrado</Text>
              <Text style={styles.summaryValue}>{formatSoles(totalCollectedCents)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Préstamos totales</Text>
              <Text style={styles.summaryValue}>{loans.length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Renovaciones acumuladas</Text>
              <Text style={styles.summaryValue}>{totalRenewals}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Préstamos</Text>
          {sortedLoans.length === 0 ? (
            <Text style={{ color: MUTED }}>Este cliente aún no tiene préstamos.</Text>
          ) : (
            sortedLoans.map((loan) => {
              const d = deriveLoan(loan, reference);
              const loanPayments = payments
                .filter((p) => p.loanId === loan.id)
                .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
              const isCancelled = !!loan.cancelledAt;
              const statusStyle = isCancelled ? styles.cancelledText : loan.isPaid ? styles.paidText : {};

              return (
                <View key={loan.id} style={[styles.loanBox, isCancelled ? styles.loanBoxCancelled : {}]} wrap={false}>
                  <View style={styles.loanBoxHeader}>
                    <Text style={styles.loanBoxTitle}>
                      Préstamo {formatDate(loan.disbursedAt)}
                      {loan.editedAt && <Text style={styles.editedBadge}> (editado)</Text>}
                    </Text>
                    <Text style={statusStyle}>
                      {loanStatusLabel(loan)}
                    </Text>
                  </View>
                  <View style={styles.loanBoxMeta}>
                    <Text style={styles.loanBoxMetaItem}>Capital: {formatSoles(loan.principalCents)}</Text>
                    <Text style={styles.loanBoxMetaItem}>Tasa: {loan.rate * 100}%</Text>
                    <Text style={styles.loanBoxMetaItem}>Plazo: {loan.termDays}d</Text>
                    {!isCancelled && !loan.isPaid && (
                      <Text style={styles.loanBoxMetaItem}>Saldo actual: {formatSoles(d.balanceCents)}</Text>
                    )}
                  </View>
                  {isCancelled && (
                    <Text style={styles.cancelReason}>
                      Motivo de anulación: {loan.cancelReason?.trim() || "No especificado"}
                      {loan.cancelledAt ? ` — ${formatDate(loan.cancelledAt)}` : ""}
                    </Text>
                  )}

                  {loanPayments.length > 0 && (
                    <View style={styles.table}>
                      <View style={styles.tableHeaderRow}>
                        <Text style={[styles.tableHeaderCell, { width: "22%" }]}>Fecha</Text>
                        <Text style={[styles.tableHeaderCell, { width: "28%" }]}>Tipo</Text>
                        <Text style={[styles.tableHeaderCell, { width: "18%" }]}>Monto</Text>
                        <Text style={[styles.tableHeaderCell, { width: "17%" }]}>Método</Text>
                        <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Atraso</Text>
                      </View>
                      {loanPayments.map((p) => {
                        const pCancelled = !!p.cancelledAt;
                        const cellStyle = pCancelled ? [styles.tableCell, { color: MUTED }] : [styles.tableCell];
                        const textStyle = pCancelled ? styles.strike : {};
                        return (
                          <View key={p.id} style={[styles.tableRow, pCancelled ? styles.paymentRowCancelled : {}]}>
                            <Text style={[...cellStyle, textStyle, { width: "22%" }]}>{formatDate(p.paidAt)}</Text>
                            <Text style={[...cellStyle, textStyle, { width: "28%" }]}>
                              {paymentTypeLabel(p.type)}
                              {pCancelled ? ` (ANULADO${p.cancelReason?.trim() ? `: ${p.cancelReason.trim()}` : ""})` : ""}
                            </Text>
                            <Text style={[...cellStyle, textStyle, { width: "18%" }]}>{formatSoles(p.amountCents)}</Text>
                            <Text style={[...cellStyle, textStyle, { width: "17%" }]}>{paymentMethodLabel(p.method)}</Text>
                            <Text style={[...cellStyle, textStyle, { width: "15%" }]}>{p.daysLate}d</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {hasCancelledSection && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Registros anulados</Text>
            {cancelledLoans.map((loan) => (
              <View key={loan.id} style={styles.row}>
                <Text style={styles.label}>
                  Préstamo {formatDate(loan.disbursedAt)} — {formatSoles(loan.principalCents)}
                </Text>
                <Text style={styles.cancelledText}>
                  {loan.cancelReason?.trim() || "Sin motivo"}{loan.cancelledAt ? ` (${formatDate(loan.cancelledAt)})` : ""}
                </Text>
              </View>
            ))}
            {cancelledPayments.map((p) => (
              <View key={p.id} style={styles.row}>
                <Text style={styles.label}>
                  Pago {formatDate(p.paidAt)} — {formatSoles(p.amountCents)} ({paymentTypeLabel(p.type)})
                </Text>
                <Text style={styles.cancelledText}>
                  {p.cancelReason?.trim() || "Sin motivo"}{p.cancelledAt ? ` (${formatDate(p.cancelledAt)})` : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Datos de contacto:</Text>
          {business.yape && <Text>Yape/Plin: {business.yape}{business.yapeHolder?.trim() ? ` — ${business.yapeHolder.trim()}` : ""}</Text>}
          {business.bcpSoles && <Text>BCP Soles: {business.bcpSoles}{business.bcpSolesHolder?.trim() ? ` — ${business.bcpSolesHolder.trim()}` : ""}</Text>}
          {business.bcpInterbank && <Text>CCI interbancaria: {business.bcpInterbank}{business.bcpInterbankHolder?.trim() ? ` — ${business.bcpInterbankHolder.trim()}` : ""}</Text>}
          <Text>Contacto: {business.phone}</Text>
        </View>

        <Text
          style={styles.pageFooter}
          fixed
          render={({ pageNumber, totalPages }) =>
            `Documento generado el ${formatDateTime(reference.toISOString())}    ·    Página ${pageNumber} de ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}
