import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../db/database";
import { clientsRepo } from "./clientsRepo";
import { loansRepo } from "./loansRepo";
import { paymentsRepo } from "./paymentsRepo";
import { toIsoDate, addDays } from "../lib/dates";

describe("Repositories", () => {
  beforeEach(async () => {
    await db.clients.clear();
    await db.loans.clear();
    await db.payments.clear();
    await db.outbox.clear();
  });

  it("clientsRepo.findByDni finds client by DNI and handles missing ones", async () => {
    await clientsRepo.create({ dni: "12345678", name: "Ana", phone: "987654321" });
    const found = await clientsRepo.findByDni("12345678");
    expect(found).toBeDefined();
    expect(found?.dni).toBe("12345678");

    const notFound = await clientsRepo.findByDni("00000000");
    expect(notFound).toBeUndefined();
  });

  it("clientsRepo.create persists client and enqueues put operation", async () => {
    const client = await clientsRepo.create({ dni: "123", name: "Test", phone: "123" });
    const c = await db.clients.get(client.id);
    expect(c).toBeDefined();
    const ops = await db.outbox.toArray();
    expect(ops).toHaveLength(1);
    expect(ops[0].entity).toBe("clients");
    expect(ops[0].op).toBe("put");
    expect(ops[0].syncedAt).toBeUndefined();
  });

  it("loansRepo.create persists loan and enqueues put operation", async () => {
    const loan = await loansRepo.create({ clientId: "c1", principalCents: 1000, rate: 0.2, termDays: 30 });
    const l = await db.loans.get(loan.id);
    expect(l).toBeDefined();
    const ops = await db.outbox.toArray();
    expect(ops).toHaveLength(1);
    expect(ops[0].entity).toBe("loans");
    expect(ops[0].op).toBe("put");
  });

  it("loansRepo.addPartial increments paidOffCents and enqueues op", async () => {
    const loan = await loansRepo.create({ clientId: "c1", principalCents: 1000, rate: 0.2, termDays: 30 });
    await db.outbox.clear();
    await loansRepo.addPartial(loan.id, 5000);
    const updated = await db.loans.get(loan.id);
    expect(updated?.paidOffCents).toBe(5000);
    const ops = await db.outbox.toArray();
    expect(ops).toHaveLength(1);
    expect(ops[0].entity).toBe("loans");
  });

  it("loansRepo.renew advances disbursedAt by termDays, resets paidOffCents, increments renewalCount", async () => {
    const loan = await loansRepo.create({ clientId: "c1", principalCents: 1000, rate: 0.2, termDays: 30 });
    await loansRepo.addPartial(loan.id, 500);
    await db.outbox.clear();
    
    await loansRepo.renew(loan.id);
    const updated = await db.loans.get(loan.id);
    const expectedDisbursed = toIsoDate(addDays(new Date(loan.disbursedAt), 30));
    expect(updated?.renewalCount).toBe(1);
    expect(updated?.paidOffCents).toBe(0);
    expect(updated?.disbursedAt).toBe(expectedDisbursed);
    expect(await db.outbox.count()).toBe(1);
  });

  it("loansRepo.markPaid sets isPaid to true", async () => {
    const loan = await loansRepo.create({ clientId: "c1", principalCents: 1000, rate: 0.2, termDays: 30 });
    await db.outbox.clear();
    await loansRepo.markPaid(loan.id);
    const updated = await db.loans.get(loan.id);
    expect(updated?.isPaid).toBe(true);
    expect(await db.outbox.count()).toBe(1);
  });

  it("paymentsRepo.create persists payment and enqueues op", async () => {
    const payment = await paymentsRepo.create({ loanId: "l1", type: "full", amountCents: 100, method: "cash", daysLate: 0 });
    const p = await db.payments.get(payment.id);
    expect(p).toBeDefined();
    const ops = await db.outbox.toArray();
    expect(ops).toHaveLength(1);
    expect(ops[0].entity).toBe("payments");
    expect(ops[0].op).toBe("put");
  });
});
