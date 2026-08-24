import { describe, it, expect } from "vitest";
import { pdf } from "@react-pdf/renderer";
import { CobrosPdf } from "./CobrosPdf";
import { buildPaymentReportRows, paymentsReportSubtitle } from "../domain/paymentsReport";
import { sumPaymentsCents } from "../domain/paymentsFilter";
import type { BusinessSettings, Client, Loan, Payment } from "../types/domain";

describe("CobrosPdf", () => {
  const business: BusinessSettings = {
    id: "singleton",
    businessName: "Fla",
    phone: "961655740",
    yape: "961655740",
    yapeHolder: "Rafael Rojas",
    bcpSoles: "",
    bcpSolesHolder: "",
    bcpInterbank: "",
    bcpInterbankHolder: "",
    updatedAt: "2025-01-01T00:00:00.000Z",
  };
  const client: Client = { id: "c1", dni: "12345678", name: "ANA TORRES", phone: "999999999", rating: "good", maxDaysLateHistorical: 0, createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z" };
  const loan: Loan = { id: "l1", clientId: "c1", principalCents: 100000, rate: 0.2, termDays: 30, disbursedAt: "2025-01-01", paidOffCents: 20000, renewalCount: 0, isPaid: false, createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z" };
  const payment: Payment = { id: "p1", loanId: "l1", type: "partial", amountCents: 20000, method: "cash", daysLate: 0, paidAt: "2025-01-15T00:00:00.000Z" };

  it("genera el PDF sin errores con filas y total", async () => {
    const rows = buildPaymentReportRows([client], [loan], [payment], {}, "");
    const subtitle = paymentsReportSubtitle({}, "");
    const totalCents = sumPaymentsCents(rows.map((r) => r.payment));

    const blob = await pdf(CobrosPdf({ business, rows, subtitle, totalCents })).toBlob();
    expect(blob.size).toBeGreaterThan(0);
  });

  it("genera el PDF sin errores cuando el filtro no deja ninguna fila", async () => {
    const blob = await pdf(CobrosPdf({ business, rows: [], subtitle: "Todos los cobros", totalCents: 0 })).toBlob();
    expect(blob.size).toBeGreaterThan(0);
  });
});
