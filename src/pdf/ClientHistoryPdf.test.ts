import { describe, it, expect } from "vitest";
import { pdf } from "@react-pdf/renderer";
import { ClientHistoryPdf } from "./ClientHistoryPdf";
import type { BusinessSettings, Client, Loan, Payment } from "../types/domain";

describe("ClientHistoryPdf", () => {
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

  const client: Client = {
    id: "c1",
    dni: "12345678",
    name: "ELVIA PÉREZ",
    phone: "999999999",
    rating: "good",
    maxDaysLateHistorical: 0,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  };

  it("genera el PDF sin errores para un préstamo editado y luego anulado (con pago anulado en cascada)", async () => {
    // Regresión: el badge "(editado)" combinaba fontStyle:"italic" con el
    // fontFamily:"Helvetica-Bold" heredado del título del préstamo — react-pdf
    // no resuelve esa combinación ("Could not resolve font for Helvetica-Bold,
    // fontWeight 400, fontStyle italic") y la generación del PDF fallaba.
    const loan: Loan = {
      id: "l1",
      clientId: "c1",
      principalCents: 100000,
      rate: 0.2,
      termDays: 30,
      disbursedAt: "2025-01-01T00:00:00.000Z",
      paidOffCents: 0,
      renewalCount: 0,
      isPaid: false,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-05T00:00:00.000Z",
      cancelledAt: "2025-01-05T00:00:00.000Z",
      cancelReason: "Error de registro",
      editedAt: "2025-01-04T00:00:00.000Z",
    };
    const payment: Payment = {
      id: "p1",
      loanId: "l1",
      type: "partial",
      amountCents: 20000,
      method: "cash",
      daysLate: 0,
      paidAt: "2025-01-03T00:00:00.000Z",
      cancelledAt: "2025-01-05T00:00:00.000Z",
      cancelReason: "Préstamo anulado",
    };

    const blob = await pdf(
      ClientHistoryPdf({ business, client, loans: [loan], payments: [payment] })
    ).toBlob();

    expect(blob.size).toBeGreaterThan(0);
  });

  it("genera el PDF sin errores para un cliente sin préstamos", async () => {
    const blob = await pdf(ClientHistoryPdf({ business, client, loans: [], payments: [] })).toBlob();
    expect(blob.size).toBeGreaterThan(0);
  });
});
