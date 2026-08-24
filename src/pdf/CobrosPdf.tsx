import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import logoPdfUrl from "../assets/logo-pdf.png";

import type { BusinessSettings } from "../types/domain";
import type { PaymentReportRow } from "../domain/paymentsReport";
import { formatSoles, formatRatePercent } from "../lib/money";
import { startOfToday } from "../lib/dates";
import { paymentMethodLabel, formatDate, formatDateTime } from "./formatters";

const NAVY = "#16325C";
const MUTED = "#65728A";
const LINE = "#E4E8F0";
const ACCENT_SOFT = "#F2F4F8";

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
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: ACCENT_SOFT,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  totalLabel: { fontSize: 10.5, fontFamily: "Helvetica-Bold" },
  totalValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: NAVY },
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
  rows: PaymentReportRow[]; // ya filtradas por CobrosTab (fecha + cliente) — sprint 7c-3
  subtitle: string;
  totalCents: number;
  reference?: Date;
}

export function CobrosPdf({ business, rows, subtitle, totalCents, reference = startOfToday() }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image src={logoPdfUrl} style={{ width: 64, height: 64, marginRight: 12 }} />
            <View>
              <Text style={styles.businessName}>{business.businessName}</Text>
              <Text style={styles.subtitle}>Reporte de cobros</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
          </View>
          <Text style={styles.headerDate}>{formatDate(reference.toISOString())}</Text>
        </View>

        <View style={styles.section}>
          {rows.length === 0 ? (
            <Text style={{ color: MUTED }}>No hay cobros para este filtro.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { width: "16%" }]}>Fecha</Text>
                <Text style={[styles.tableHeaderCell, { width: "26%" }]}>Cliente</Text>
                <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Monto</Text>
                <Text style={[styles.tableHeaderCell, { width: "28%" }]}>Préstamo</Text>
                <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Método</Text>
              </View>
              {rows.map(({ payment, loan, client }) => (
                <View key={payment.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: "16%" }]}>{formatDate(payment.paidAt)}</Text>
                  <Text style={[styles.tableCell, { width: "26%" }]}>{client.name}</Text>
                  <Text style={[styles.tableCell, { width: "15%" }]}>{formatSoles(payment.amountCents)}</Text>
                  <Text style={[styles.tableCell, { width: "28%" }]}>
                    {formatSoles(loan.principalCents)} al {formatRatePercent(loan.rate)}
                  </Text>
                  <Text style={[styles.tableCell, { width: "15%" }]}>{paymentMethodLabel(payment.method)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total cobrado</Text>
            <Text style={styles.totalValue}>{formatSoles(totalCents)}</Text>
          </View>
        </View>

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
