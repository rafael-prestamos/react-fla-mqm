import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import logoPdfUrl from "../assets/logo-pdf.png";

import type { BusinessSettings } from "../types/domain";
import type { ActiveLoanReportRow } from "../domain/activeLoansReport";
import { formatSoles, formatRatePercent } from "../lib/money";
import { startOfToday } from "../lib/dates";
import { formatDate, formatDateTime } from "./formatters";

const NAVY = "#16325C";
const MUTED = "#65728A";
const BAD = "#B3261E";
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
  lateText: { color: BAD, fontFamily: "Helvetica-Bold" },
  onTimeText: { fontFamily: "Helvetica-Bold" },
  totalsBox: {
    backgroundColor: ACCENT_SOFT,
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  totalsItem: { width: "33%", marginBottom: 4 },
  totalsLabel: { fontSize: 8.5, color: MUTED },
  totalsValue: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 2 },
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
  rows: ActiveLoanReportRow[]; // ya filtradas: solo activos (no anulados, no pagados) — sprint 7c-3
  totalPrincipalCents: number;
  totalBalanceCents: number;
  count: number;
  reference?: Date;
}

export function ActiveLoansPdf({ business, rows, totalPrincipalCents, totalBalanceCents, count, reference = startOfToday() }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image src={logoPdfUrl} style={{ width: 64, height: 64, marginRight: 12 }} />
            <View>
              <Text style={styles.businessName}>{business.businessName}</Text>
              <Text style={styles.subtitle}>Préstamos activos</Text>
            </View>
          </View>
          <Text style={styles.headerDate}>{formatDate(reference.toISOString())}</Text>
        </View>

        <View style={styles.section}>
          {rows.length === 0 ? (
            <Text style={{ color: MUTED }}>No hay préstamos activos.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { width: "22%" }]}>Cliente</Text>
                <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Capital</Text>
                <Text style={[styles.tableHeaderCell, { width: "10%" }]}>Tasa</Text>
                <Text style={[styles.tableHeaderCell, { width: "23%" }]}>Entrega → Vencimiento</Text>
                <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Saldo</Text>
                <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Estado</Text>
              </View>
              {rows.map(({ loan, client, derived }) => {
                const isLate = derived.daysLate > 0;
                return (
                  <View key={loan.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { width: "22%" }]}>{client.name}</Text>
                    <Text style={[styles.tableCell, { width: "15%" }]}>{formatSoles(loan.principalCents)}</Text>
                    <Text style={[styles.tableCell, { width: "10%" }]}>{formatRatePercent(loan.rate)}</Text>
                    <Text style={[styles.tableCell, { width: "23%" }]}>
                      {formatDate(derived.disbursedDate.toISOString())} → {formatDate(derived.dueDate.toISOString())}
                    </Text>
                    <Text style={[styles.tableCell, { width: "15%" }]}>{formatSoles(derived.balanceCents)}</Text>
                    <Text style={[styles.tableCell, isLate ? styles.lateText : styles.onTimeText, { width: "15%" }]}>
                      {isLate ? "Atrasado" : "Al día"}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.totalsBox}>
            <View style={styles.totalsItem}>
              <Text style={styles.totalsLabel}>Préstamos activos</Text>
              <Text style={styles.totalsValue}>{count}</Text>
            </View>
            <View style={styles.totalsItem}>
              <Text style={styles.totalsLabel}>Capital total prestado</Text>
              <Text style={styles.totalsValue}>{formatSoles(totalPrincipalCents)}</Text>
            </View>
            <View style={styles.totalsItem}>
              <Text style={styles.totalsLabel}>Saldo total por cobrar</Text>
              <Text style={styles.totalsValue}>{formatSoles(totalBalanceCents)}</Text>
            </View>
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
