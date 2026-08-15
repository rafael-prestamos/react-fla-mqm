import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { BusinessSettings, Client, Loan, Payment } from "../types/domain";
import { formatSoles } from "../lib/money";
import { addDays } from "../lib/dates";
import { paymentTypeLabel, paymentMethodLabel, formatDate, formatDateTime } from "./formatters";

const NAVY = "#16325C";
const MUTED = "#65728A";
const GOOD = "#1E7A55";
const LINE = "#E4E8F0";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, color: "#152238", fontFamily: "Helvetica" },
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
  section: { marginBottom: 14 },
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
  amountBlock: { alignItems: "center", marginVertical: 14 },
  amountLabel: { fontSize: 9, color: MUTED },
  amountValue: { fontSize: 26, fontFamily: "Helvetica-Bold", color: NAVY, marginTop: 2 },
  paidBadge: { fontSize: 13, color: GOOD, fontFamily: "Helvetica-Bold", marginTop: 6 },
  footer: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: LINE,
    fontSize: 9.5,
    color: MUTED,
  },
  footerTitle: { fontFamily: "Helvetica-Bold", color: "#152238", marginBottom: 4 },
});

interface Props {
  business: BusinessSettings;
  client: Client;
  loan: Loan;
  payment: Payment;
  balanceCentsAfterPayment: number;
}

export function PaymentReceiptPdf({ business, client, loan, payment, balanceCentsAfterPayment }: Props) {
  const dueDate = addDays(new Date(loan.disbursedAt), loan.termDays);
  const isPaidOff = balanceCentsAfterPayment <= 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.businessName}>{business.businessName}</Text>
            <Text style={styles.subtitle}>Comprobante de pago</Text>
          </View>
          <Text style={styles.headerDate}>{formatDateTime(payment.paidAt)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Cliente</Text>
            <Text style={styles.value}>{client.name}</Text>
          </View>
          <View style={styles.rowLast}>
            <Text style={styles.label}>DNI</Text>
            <Text style={styles.value}>{client.dni}</Text>
          </View>
        </View>

        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>{paymentTypeLabel(payment.type)}</Text>
          <Text style={styles.amountValue}>{formatSoles(payment.amountCents)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle del pago</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Método</Text>
            <Text style={styles.value}>{paymentMethodLabel(payment.method)}</Text>
          </View>
          <View style={styles.rowLast}>
            <Text style={styles.label}>Fecha</Text>
            <Text style={styles.value}>{formatDate(payment.paidAt)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Préstamo</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Capital</Text>
            <Text style={styles.value}>{formatSoles(loan.principalCents)} al {loan.rate * 100}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Plazo</Text>
            <Text style={styles.value}>{loan.termDays} días</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Vencimiento original</Text>
            <Text style={styles.value}>{formatDate(dueDate.toISOString())}</Text>
          </View>
          <View style={styles.rowLast}>
            <Text style={styles.label}>Saldo restante</Text>
            {isPaidOff ? (
              <Text style={styles.paidBadge}>PAGADO ✓</Text>
            ) : (
              <Text style={styles.value}>{formatSoles(balanceCentsAfterPayment)}</Text>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Datos para pagar la próxima cuota:</Text>
          {business.yape && <Text>Yape/Plin: {business.yape}{business.yapeHolder?.trim() ? ` — ${business.yapeHolder.trim()}` : ""}</Text>}
          {business.bcpSoles && <Text>BCP Soles: {business.bcpSoles}{business.bcpSolesHolder?.trim() ? ` — ${business.bcpSolesHolder.trim()}` : ""}</Text>}
          {business.bcpInterbank && <Text>CCI interbancaria: {business.bcpInterbank}{business.bcpInterbankHolder?.trim() ? ` — ${business.bcpInterbankHolder.trim()}` : ""}</Text>}
          <Text>Contacto: {business.phone}</Text>
        </View>
      </Page>
    </Document>
  );
}
