import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import logoUrl from "../assets/logo.png";
import type { BusinessSettings, Client, Loan, Payment } from "../types/domain";
import { formatSoles } from "../lib/money";
import { startOfToday } from "../lib/dates";
import { deriveLoan } from "../domain/loanRules";
import { paymentTypeLabel, paymentMethodLabel, formatDate, formatDateTime } from "./formatters";

const NAVY = "#16325C";
const MUTED = "#65728A";
const GOOD = "#1E7A55";
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
  loans: Loan[];
  payments: Payment[];
  reference?: Date;
}

export function StatementPdf({ business, client, loans, payments, reference = startOfToday() }: Props) {
  const sortedLoans = [...loans].sort((a, b) => new Date(b.disbursedAt).getTime() - new Date(a.disbursedAt).getTime());
  const sortedPayments = [...payments].sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

  const totalLentCents = loans.reduce((s, l) => s + l.principalCents, 0);
  const totalCollectedCents = payments.reduce((s, p) => s + p.amountCents, 0);
  const activeLoans = loans.filter((l) => !l.isPaid);
  const pendingBalanceCents = activeLoans.reduce((s, l) => s + deriveLoan(l, reference).balanceCents, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ backgroundColor: "#FBF5E9", padding: 4, borderRadius: 8, marginRight: 12 }}>
              <Image src={logoUrl} style={{ width: 32, height: 32 }} />
            </View>
            <View>
              <Text style={styles.businessName}>{business.businessName}</Text>
              <Text style={styles.subtitle}>Estado de cuenta</Text>
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
          <View style={styles.rowLast}>
            <Text style={styles.label}>Cliente desde</Text>
            <Text style={styles.value}>{formatDate(client.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen</Text>
          <View style={styles.summaryBox}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total prestado histórico</Text>
              <Text style={styles.summaryValue}>{formatSoles(totalLentCents)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total cobrado histórico</Text>
              <Text style={styles.summaryValue}>{formatSoles(totalCollectedCents)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Saldo pendiente actual</Text>
              <Text style={styles.summaryValue}>{formatSoles(pendingBalanceCents)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Préstamos (activos / total)</Text>
              <Text style={styles.summaryValue}>{activeLoans.length} / {loans.length}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Préstamos</Text>
          {sortedLoans.length === 0 ? (
            <Text style={{ color: MUTED }}>Este cliente aún no tiene préstamos.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { width: "16%" }]}>Entrega</Text>
                <Text style={[styles.tableHeaderCell, { width: "16%" }]}>Capital</Text>
                <Text style={[styles.tableHeaderCell, { width: "12%" }]}>Tasa</Text>
                <Text style={[styles.tableHeaderCell, { width: "12%" }]}>Plazo</Text>
                <Text style={[styles.tableHeaderCell, { width: "18%" }]}>Vencimiento</Text>
                <Text style={[styles.tableHeaderCell, { width: "12%" }]}>Estado</Text>
                <Text style={[styles.tableHeaderCell, { width: "14%" }]}>Saldo</Text>
              </View>
              {sortedLoans.map((loan) => {
                const d = deriveLoan(loan, reference);
                return (
                  <View key={loan.id} style={[styles.tableRow, loan.isPaid ? { opacity: 0.7 } : {}]}>
                    <Text style={[styles.tableCell, { width: "16%" }]}>{formatDate(loan.disbursedAt)}</Text>
                    <Text style={[styles.tableCell, { width: "16%" }]}>{formatSoles(loan.principalCents)}</Text>
                    <Text style={[styles.tableCell, { width: "12%" }]}>{loan.rate * 100}%</Text>
                    <Text style={[styles.tableCell, { width: "12%" }]}>{loan.termDays}d</Text>
                    <Text style={[styles.tableCell, { width: "18%" }]}>{formatDate(d.dueDate.toISOString())}</Text>
                    <Text style={[styles.tableCell, loan.isPaid ? styles.paidText : {}, { width: "12%" }]}>
                      {loan.isPaid ? "Pagado" : "Activo"}
                    </Text>
                    <Text style={[styles.tableCell, { width: "14%" }]}>
                      {loan.isPaid ? formatSoles(0) : formatSoles(d.balanceCents)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pagos</Text>
          {sortedPayments.length === 0 ? (
            <Text style={{ color: MUTED }}>Este cliente aún no tiene pagos registrados.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Fecha</Text>
                <Text style={[styles.tableHeaderCell, { width: "35%" }]}>Tipo</Text>
                <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Monto</Text>
                <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Método</Text>
              </View>
              {sortedPayments.map((p) => (
                <View key={p.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: "25%" }]}>{formatDate(p.paidAt)}</Text>
                  <Text style={[styles.tableCell, { width: "35%" }]}>{paymentTypeLabel(p.type)}</Text>
                  <Text style={[styles.tableCell, { width: "20%" }]}>{formatSoles(p.amountCents)}</Text>
                  <Text style={[styles.tableCell, { width: "20%" }]}>{paymentMethodLabel(p.method)}</Text>
                </View>
              ))}
            </View>
          )}
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
