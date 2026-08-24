import { describe, it, expect } from "vitest";
import { pdf } from "@react-pdf/renderer";
import { ActiveLoansPdf } from "./ActiveLoansPdf";
import { buildActiveLoansReport } from "../domain/activeLoansReport";
import type { BusinessSettings, Client, Loan } from "../types/domain";

describe("ActiveLoansPdf", () => {
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
  const loan: Loan = { id: "l1", clientId: "c1", principalCents: 100000, rate: 0.2, termDays: 30, disbursedAt: "2025-01-01", paidOffCents: 0, renewalCount: 0, isPaid: false, createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z" };

  it("genera el PDF sin errores con préstamos activos", async () => {
    const report = buildActiveLoansReport([client], [loan], new Date(2025, 1, 15));
    const blob = await pdf(ActiveLoansPdf({ business, ...report })).toBlob();
    expect(blob.size).toBeGreaterThan(0);
  });

  it("genera el PDF sin errores sin préstamos activos", async () => {
    const report = buildActiveLoansReport([], [], new Date(2025, 1, 15));
    const blob = await pdf(ActiveLoansPdf({ business, ...report })).toBlob();
    expect(blob.size).toBeGreaterThan(0);
  });
});
