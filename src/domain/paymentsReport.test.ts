import { describe, it, expect } from "vitest";
import { buildPaymentReportRows, paymentsReportSubtitle } from "./paymentsReport";
import type { Client, Loan, Payment } from "../types/domain";

function client(id: string, name: string): Client {
  return { id, dni: id, name, phone: "999999999", rating: "good", maxDaysLateHistorical: 0, createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z" };
}

function loan(id: string, clientId: string): Loan {
  return { id, clientId, principalCents: 100000, rate: 0.2, termDays: 30, disbursedAt: "2025-01-01", paidOffCents: 0, renewalCount: 0, isPaid: false, createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z" };
}

function payment(id: string, loanId: string, paidAt: string, amountCents = 1000): Payment {
  return { id, loanId, type: "partial", amountCents, method: "cash", daysLate: 0, paidAt };
}

describe("buildPaymentReportRows", () => {
  const clients = [client("c1", "ANA TORRES"), client("c2", "BETO SANCHEZ")];
  const loans = [loan("l1", "c1"), loan("l2", "c2")];

  it("joins payment -> loan -> client and sorts most recent first", () => {
    const payments = [
      payment("p1", "l1", "2025-05-01T00:00:00.000"),
      payment("p2", "l2", "2025-05-10T00:00:00.000"),
    ];
    const rows = buildPaymentReportRows(clients, loans, payments, {}, "");
    expect(rows.map((r) => r.payment.id)).toEqual(["p2", "p1"]);
    expect(rows[0].client.name).toBe("BETO SANCHEZ");
  });

  it("applies the date filter", () => {
    const payments = [
      payment("p1", "l1", "2025-05-01T00:00:00.000"),
      payment("p2", "l2", "2025-06-01T00:00:00.000"),
    ];
    const rows = buildPaymentReportRows(clients, loans, payments, { month: "2025-05" }, "");
    expect(rows.map((r) => r.payment.id)).toEqual(["p1"]);
  });

  it("applies the client search filter", () => {
    const payments = [payment("p1", "l1", "2025-05-01T00:00:00.000"), payment("p2", "l2", "2025-05-01T00:00:00.000")];
    const rows = buildPaymentReportRows(clients, loans, payments, {}, "beto");
    expect(rows.map((r) => r.payment.id)).toEqual(["p2"]);
  });

  it("skips payments whose loan or client is missing", () => {
    const payments = [payment("orphan", "no-existe", "2025-05-01T00:00:00.000")];
    expect(buildPaymentReportRows(clients, loans, payments, {}, "")).toHaveLength(0);
  });
});

describe("paymentsReportSubtitle", () => {
  it("returns 'Todos los cobros' when there is no filter", () => {
    expect(paymentsReportSubtitle({}, "")).toBe("Todos los cobros");
  });

  it("formats a month filter as 'Mes Año'", () => {
    expect(paymentsReportSubtitle({ month: "2026-08" }, "")).toBe("Agosto 2026");
  });

  it("formats a full date range", () => {
    expect(paymentsReportSubtitle({ dateFrom: "2026-08-16", dateTo: "2026-08-31" }, "")).toBe("16-ago-2026 al 31-ago-2026");
  });

  it("formats an open-ended range", () => {
    expect(paymentsReportSubtitle({ dateFrom: "2026-08-16" }, "")).toBe("Desde 16-ago-2026");
    expect(paymentsReportSubtitle({ dateTo: "2026-08-16" }, "")).toBe("Hasta 16-ago-2026");
  });

  it("appends the client search in uppercase", () => {
    expect(paymentsReportSubtitle({}, "raúl hernández")).toBe("Todos los cobros · Cliente: RAÚL HERNÁNDEZ");
    expect(paymentsReportSubtitle({ month: "2026-08" }, "beto")).toBe("Agosto 2026 · Cliente: BETO");
  });
});
