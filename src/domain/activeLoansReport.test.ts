import { describe, it, expect } from "vitest";
import { buildActiveLoansReport } from "./activeLoansReport";
import type { Client, Loan } from "../types/domain";

function client(id: string, name: string): Client {
  return { id, dni: id, name, phone: "999999999", rating: "good", maxDaysLateHistorical: 0, createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z" };
}

function loan(id: string, clientId: string, overrides: Partial<Loan> = {}): Loan {
  return {
    id, clientId, principalCents: 100000, rate: 0.2, termDays: 30, disbursedAt: "2025-01-01",
    paidOffCents: 0, renewalCount: 0, isPaid: false,
    createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildActiveLoansReport", () => {
  const reference = new Date(2025, 1, 15);

  it("excludes cancelled and fully paid loans", () => {
    const clients = [client("c1", "ANA"), client("c2", "BETO"), client("c3", "CARLOS")];
    const loans = [
      loan("active", "c1"),
      loan("cancelled", "c2", { cancelledAt: "2025-01-05T00:00:00.000Z" }),
      loan("paid", "c3", { isPaid: true }),
    ];

    const report = buildActiveLoansReport(clients, loans, reference);

    expect(report.rows.map((r) => r.loan.id)).toEqual(["active"]);
    expect(report.count).toBe(1);
  });

  it("sorts rows by client name", () => {
    const clients = [client("c1", "ZOE"), client("c2", "ANA")];
    const loans = [loan("l1", "c1"), loan("l2", "c2")];

    const report = buildActiveLoansReport(clients, loans, reference);

    expect(report.rows.map((r) => r.client.name)).toEqual(["ANA", "ZOE"]);
  });

  it("computes total principal and total balance correctly", () => {
    const clients = [client("c1", "ANA"), client("c2", "BETO")];
    const loans = [
      loan("l1", "c1", { principalCents: 100000 }),
      loan("l2", "c2", { principalCents: 50000, rate: 0.1 }),
    ];

    const report = buildActiveLoansReport(clients, loans, reference);

    expect(report.totalPrincipalCents).toBe(150000);
    // Sin abonos, saldo = capital + interés de cada uno (20% de 100000 + 10% de 50000)
    expect(report.totalBalanceCents).toBe(120000 + 55000);
  });

  it("skips loans whose client is missing", () => {
    const loans = [loan("orphan", "no-existe")];
    expect(buildActiveLoansReport([], loans, reference).rows).toHaveLength(0);
  });

  it("returns an empty report when there are no loans", () => {
    const report = buildActiveLoansReport([], [], reference);
    expect(report).toEqual({ rows: [], totalPrincipalCents: 0, totalBalanceCents: 0, count: 0 });
  });
});
