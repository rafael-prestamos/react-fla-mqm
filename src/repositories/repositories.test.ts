import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "../db/database";
import { clientsRepo } from "./clientsRepo";
import { loansRepo } from "./loansRepo";
import { paymentsRepo } from "./paymentsRepo";


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



  it("paymentsRepo.create persists payment and enqueues op", async () => {
    const payment = await paymentsRepo.create({ loanId: "l1", type: "full", amountCents: 100, method: "cash", daysLate: 0 });
    const p = await db.payments.get(payment.id);
    expect(p).toBeDefined();
    const ops = await db.outbox.toArray();
    expect(ops).toHaveLength(1);
    expect(ops[0].entity).toBe("payments");
    expect(ops[0].op).toBe("put");
  });

  it("loansRepo.applyPayment with missing id throws", async () => {
    const fakeLoan = { id: "no-existe" } as any;
    await expect(loansRepo.applyPayment({ loan: fakeLoan, type: "partial", amountCents: 5000, method: "cash" })).rejects.toThrow("Préstamo no encontrado");
  });

  it("loansRepo.applyPayment applies partial payment transactionally", async () => {
    const loan = await loansRepo.create({ clientId: "c1", principalCents: 100000, rate: 0.2, termDays: 30 });
    await db.outbox.clear();
    
    await loansRepo.applyPayment({
      loan,
      type: "partial",
      amountCents: 5000,
      method: "cash",
      reference: new Date("2025-01-15T00:00:00Z")
    });

    const l = await db.loans.get(loan.id);
    expect(l?.paidOffCents).toBe(5000);
    
    const payments = await db.payments.toArray();
    expect(payments).toHaveLength(1);
    expect(payments[0].type).toBe("partial");
    expect(payments[0].amountCents).toBe(5000);

    const ops = await db.outbox.toArray();
    expect(ops).toHaveLength(2);
    expect(ops.map(o => o.entity).sort()).toEqual(["loans", "payments"]);
    expect(ops.every(o => o.syncedAt === undefined)).toBe(true);
  });

  it("loansRepo.applyPayment rolls back if paymentsRepo.create fails", async () => {
    const loan = await loansRepo.create({ clientId: "c1", principalCents: 100000, rate: 0.2, termDays: 30 });
    await db.outbox.clear();

    const spy = vi.spyOn(paymentsRepo, "create").mockRejectedValueOnce(new Error("Simulated failure"));
    
    await expect(loansRepo.applyPayment({
      loan,
      type: "partial",
      amountCents: 5000,
      method: "cash",
      reference: new Date("2025-01-15T00:00:00Z")
    })).rejects.toThrow("Simulated failure");

    // Because it's a Dexie transaction, the loan modification should be rolled back!
    const l = await db.loans.get(loan.id);
    expect(l?.paidOffCents).toBe(0); // Rollback successful
    expect(await db.payments.count()).toBe(0);
    expect(await db.outbox.count()).toBe(0);

    spy.mockRestore();
  });
});
