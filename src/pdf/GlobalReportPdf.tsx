import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import logoPdfUrl from "../assets/logo-pdf.png";

import type { BusinessSettings, Client, Loan, Payment } from "../types/domain";
import { formatSoles } from "../lib/money";
import { startOfToday } from "../lib/dates";
import { deriveLoan } from "../domain/loanRules";
import { formatDate, formatDateTime, isCurrentMonth, ratingLabel } from "./formatters";

const NAVY = "#16325C";
const MUTED = "#65728A";
const SLOW = "#F59E0B";
const BAD = "#DC2626";
const LINE = "#E4E8F0";

const RATING_COLOR: Record<Client["rating"], string> = {
  good: NAVY,
  slow: SLOW,
  bad: BAD,
};

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
  clients: Client[];
  loans: Loan[]; // solo activos (sin anulados) — se filtra en el caller
  payments: Payment[]; // solo activos (sin anulados) — se filtra en el caller
  reference?: Date;
}

export function GlobalReportPdf({ business, clients, loans, payments, reference = startOfToday() }: Props) {
  const activeLoans = loans.filter((l) => !l.isPaid);
  const derivedActive = activeLoans.map((l) => ({ loan: l, derived: deriveLoan(l, reference) }));

  const activeCapitalCents = activeLoans.reduce((s, l) => s + l.principalCents, 0);
  const activeInterestCents = derivedActive.reduce((s, { derived }) => s + derived.interestCents, 0);
  const activeBalanceCents = derivedActive.reduce((s, { derived }) => s + derived.balanceCents, 0);

  const monthPayments = payments.filter((p) => isCurrentMonth(p.paidAt, reference));
  const monthTotalCents = monthPayments.reduce((s, p) => s + p.amountCents, 0);
  const monthFullCents = monthPayments.filter((p) => p.type === "full").reduce((s, p) => s + p.amountCents, 0);
  const monthInterestCents = monthPayments.filter((p) => p.type === "interest").reduce((s, p) => s + p.amountCents, 0);
  const monthPartialCents = monthPayments.filter((p) => p.type === "partial").reduce((s, p) => s + p.amountCents, 0);

  const graceCount = derivedActive.filter(({ derived }) => derived.status === "grace").length;
  const lateInterestCount = derivedActive.filter(({ derived }) => derived.status === "lateInterest").length;
  const badRatingCount = clients.filter((c) => c.rating === "bad").length;

  const loansByClient = new Map<string, Loan[]>();
  for (const loan of loans) {
    const list = loansByClient.get(loan.clientId) ?? [];
    list.push(loan);
    loansByClient.set(loan.clientId, list);
  }
  const loanIdToClientId = new Map<string, string>();
  for (const loan of loans) loanIdToClientId.set(loan.id, loan.clientId);

  const clientRows = clients
    .map((c) => {
      const clientLoans = loansByClient.get(c.id) ?? [];
      const activeClientLoans = clientLoans.filter((l) => !l.isPaid);
      const balanceCents = activeClientLoans.reduce((s, l) => s + deriveLoan(l, reference).balanceCents, 0);
      const clientPayments = payments.filter((p) => loanIdToClientId.get(p.loanId) === c.id);
      const lastPayment = clientPayments.reduce<Payment | null>((latest, p) => {
        if (!latest) return p;
        return new Date(p.paidAt).getTime() > new Date(latest.paidAt).getTime() ? p : latest;
      }, null);
      return {
        client: c,
        activeCount: activeClientLoans.length,
        balanceCents,
        lastPaymentAt: lastPayment?.paidAt ?? null,
      };
    })
    .sort((a, b) => a.client.name.localeCompare(b.client.name));

  const totalLentHistoricalCents = loans.reduce((s, l) => s + l.principalCents, 0);
  const totalCollectedHistoricalCents = payments.reduce((s, p) => s + p.amountCents, 0);
  const completedLoansCount = loans.filter((l) => l.isPaid).length;

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image src={logoPdfUrl} style={{ width: 64, height: 64, marginRight: 12 }} />
            <View>
              <Text style={styles.businessName}>{business.businessName}</Text>
              <Text style={styles.subtitle}>Reporte general</Text>
            </View>
          </View>
          <Text style={styles.headerDate}>{formatDate(reference.toISOString())}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cartera activa</Text>
          <View style={styles.summaryBox}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Préstamos activos</Text>
              <Text style={styles.summaryValue}>{activeLoans.length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Capital total prestado</Text>
              <Text style={styles.summaryValue}>{formatSoles(activeCapitalCents)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Intereses por cobrar</Text>
              <Text style={styles.summaryValue}>{formatSoles(activeInterestCents)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Saldo total por cobrar</Text>
              <Text style={styles.summaryValue}>{formatSoles(activeBalanceCents)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cobranza del mes</Text>
          <View style={styles.summaryBox}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total cobrado este mes</Text>
              <Text style={styles.summaryValue}>{formatSoles(monthTotalCents)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Cancelaciones</Text>
              <Text style={styles.summaryValue}>{formatSoles(monthFullCents)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Renovaciones</Text>
              <Text style={styles.summaryValue}>{formatSoles(monthInterestCents)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Abonos</Text>
              <Text style={styles.summaryValue}>{formatSoles(monthPartialCents)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Morosidad</Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { width: "70%" }]}>Indicador</Text>
              <Text style={[styles.tableHeaderCell, { width: "30%" }]}>Cantidad</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: "70%" }]}>En tolerancia (dentro de gracia)</Text>
              <Text style={[styles.tableCell, { width: "30%" }]}>{graceCount}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: "70%" }]}>En atraso con interés extra</Text>
              <Text style={[styles.tableCell, { width: "30%" }]}>{lateInterestCount}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: "70%" }]}>Clientes clasificados como mal pagador</Text>
              <Text style={[styles.tableCell, { width: "30%" }]}>{badRatingCount}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen por cliente</Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { width: "32%" }]}>Cliente</Text>
              <Text style={[styles.tableHeaderCell, { width: "17%" }]}>Préstamos activos</Text>
              <Text style={[styles.tableHeaderCell, { width: "21%" }]}>Saldo por cobrar</Text>
              <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Estado</Text>
              <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Último pago</Text>
            </View>
            {clientRows.map(({ client, activeCount, balanceCents, lastPaymentAt }) => (
              <View key={client.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: "32%" }]}>{client.name}</Text>
                <Text style={[styles.tableCell, { width: "17%" }]}>{activeCount}</Text>
                <Text style={[styles.tableCell, { width: "21%" }]}>{formatSoles(balanceCents)}</Text>
                <Text style={[styles.tableCell, { width: "15%", color: RATING_COLOR[client.rating], fontFamily: "Helvetica-Bold" }]}>
                  {ratingLabel(client.rating)}
                </Text>
                <Text style={[styles.tableCell, { width: "15%" }]}>{lastPaymentAt ? formatDate(lastPaymentAt) : "—"}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Histórico acumulado</Text>
          <View style={styles.summaryBox}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total capital prestado histórico</Text>
              <Text style={styles.summaryValue}>{formatSoles(totalLentHistoricalCents)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total cobrado históricamente</Text>
              <Text style={styles.summaryValue}>{formatSoles(totalCollectedHistoricalCents)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Préstamos completados</Text>
              <Text style={styles.summaryValue}>{completedLoansCount}</Text>
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
