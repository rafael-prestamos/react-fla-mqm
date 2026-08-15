import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "../db/database";
import { clientsRepo } from "./clientsRepo";
import { loansRepo } from "./loansRepo";
import { paymentsRepo } from "./paymentsRepo";
import { settingsRepo } from "./settingsRepo";
import { ensureSettings } from "../db/ensureSettings";


describe("Repositories", () => {
  beforeEach(async () => {
    await db.clients.clear();
    await db.loans.clear();
    await db.payments.clear();
    await db.settings.clear();
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
    expect(c?.rating).toBe("good");
    expect(c?.maxDaysLateHistorical).toBe(0);
    const ops = await db.outbox.toArray();
    expect(ops).toHaveLength(1);
    expect(ops[0].entity).toBe("clients");
    expect(ops[0].op).toBe("put");
    expect(ops[0].syncedAt).toBeUndefined();
  });

  it("clientsRepo.updateRating updates rating and maxDaysLate monotonically", async () => {
    const client = await clientsRepo.create({ dni: "123", name: "Test", phone: "123" });
    await db.outbox.clear();
    
    // 1. Sube el rating y maxDaysLate
    await clientsRepo.updateRating(client.id, "slow", 10);
    let c = await db.clients.get(client.id);
    expect(c?.rating).toBe("slow");
    expect(c?.maxDaysLateHistorical).toBe(10);
    let ops = await db.outbox.toArray();
    expect(ops).toHaveLength(1);

    await db.outbox.clear();
    // 2. Mantiene maxDaysLate si el nuevo es menor, pero actualiza rating (aunque en la regla de negocio rating nunca baja si maxDaysLate es alto, el repo solo guarda lo que le dicen)
    await clientsRepo.updateRating(client.id, "good", 5);
    c = await db.clients.get(client.id);
    expect(c?.rating).toBe("good");
    expect(c?.maxDaysLateHistorical).toBe(10);
    ops = await db.outbox.toArray();
    expect(ops).toHaveLength(1);

    await db.outbox.clear();
    // 3. Idempotencia: sin cambios no encola
    await clientsRepo.updateRating(client.id, "good", 5);
    c = await db.clients.get(client.id);
    ops = await db.outbox.toArray();
    expect(ops).toHaveLength(0);
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

  it("edits a loan and excludes cancelled loans from queries", async () => {
    const loan = await loansRepo.create({ clientId: "c1", principalCents: 1000, rate: 0.2, termDays: 30 });
    await db.outbox.clear();
    await loansRepo.update(loan.id, { principalCents: 2000, termDays: 15 });
    expect((await db.loans.get(loan.id))?.editedAt).toBeTruthy();
    expect((await db.outbox.toArray())[0].entity).toBe("loans");

    await loansRepo.cancel(loan.id, "error");
    expect((await db.loans.get(loan.id))?.cancelledAt).toBeTruthy();
    expect(await loansRepo.all()).toHaveLength(0);
    expect(await loansRepo.active()).toHaveLength(0);
    expect(await loansRepo.byClient("c1")).toHaveLength(0);
    await expect(loansRepo.update(loan.id, { rate: 0.3 })).rejects.toThrow("anulado");
    await expect(loansRepo.cancel(loan.id)).rejects.toThrow("ya anulado");
  });

  it("cancels a loan and cascades its active payments", async () => {
    const loan = await loansRepo.create({ clientId: "c1", principalCents: 1000, rate: 0.2, termDays: 30 });
    const payment = await paymentsRepo.create({ loanId: loan.id, type: "partial", amountCents: 100, method: "cash", daysLate: 0 });
    await db.outbox.clear();
    const result = await loansRepo.cancel(loan.id);
    expect(result.cancelledPaymentIds).toEqual([payment.id]);
    expect((await db.payments.get(payment.id))?.cancelledAt).toBeTruthy();
    expect((await db.outbox.toArray()).map((op) => op.entity).sort()).toEqual(["loans", "payments"]);
  });

  it("edits and cancels a payment while queries hide it", async () => {
    const payment = await paymentsRepo.create({ loanId: "l1", type: "full", amountCents: 100, method: "cash", daysLate: 0 });
    await db.outbox.clear();
    await paymentsRepo.update(payment.id, { amountCents: 200, method: "digital" });
    expect((await db.payments.get(payment.id))?.editedAt).toBeTruthy();
    await paymentsRepo.cancel(payment.id, "duplicado");
    expect((await db.payments.get(payment.id))?.cancelledAt).toBeTruthy();
    expect(await paymentsRepo.all()).toHaveLength(0);
    expect(await paymentsRepo.byLoan("l1")).toHaveLength(0);
  });

  it("loansRepo.applyPayment with missing id throws", async () => {
    const fakeLoan = { id: "no-existe" } as any;
    await expect(loansRepo.applyPayment({ loan: fakeLoan, type: "partial", amountCents: 5000, method: "cash" })).rejects.toThrow("Préstamo no encontrado");
  });

  it("loansRepo.applyPayment applies partial payment transactionally", async () => {
    const loan = await loansRepo.create({ clientId: "c1", principalCents: 100000, rate: 0.2, termDays: 30 });
    await db.outbox.clear();
    
    const result = await loansRepo.applyPayment({
      loan,
      type: "partial",
      amountCents: 5000,
      method: "cash",
      reference: new Date("2025-01-15T00:00:00Z")
    });

    expect(result.payment.type).toBe("partial");
    expect(result.payment.amountCents).toBe(5000);
    expect(result.payment.loanId).toBe(loan.id);
    expect(result.payment.id).toBeTruthy();

    const l = await db.loans.get(loan.id);
    expect(l?.paidOffCents).toBe(5000);

    const payments = await db.payments.toArray();
    expect(payments).toHaveLength(1);
    expect(payments[0].type).toBe("partial");
    expect(payments[0].amountCents).toBe(5000);
    expect(payments[0].id).toBe(result.payment.id);

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

  describe("loansRepo.backfill", () => {
    it("Backfill sin abonos previos", async () => {
      const input = {
        clientId: "c1",
        principalCents: 100000,
        rate: 0.2,
        termDays: 30 as const,
        lastCycleStart: "2025-01-01",
        renewalCount: 0,
        outstandingBalanceCents: 120000,
        reference: new Date("2025-01-15T00:00:00Z"),
      };
      const result = await loansRepo.backfill(input);
      
      expect(result.loan.paidOffCents).toBe(0);
      expect(result.payment).toBeNull();

      const l = await db.loans.get(result.loan.id);
      expect(l).toBeDefined();
      expect(await db.payments.count()).toBe(0);

      const ops = await db.outbox.toArray();
      expect(ops).toHaveLength(1);
      expect(ops[0].entity).toBe("loans");
    });

    it("Backfill con abonos previos", async () => {
      const input = {
        clientId: "c1",
        principalCents: 100000,
        rate: 0.2,
        termDays: 30 as const,
        lastCycleStart: "2025-01-01",
        renewalCount: 0,
        outstandingBalanceCents: 100000,
        reference: new Date("2025-01-15T00:00:00Z"),
      };
      const result = await loansRepo.backfill(input);
      
      expect(result.loan.paidOffCents).toBe(20000);
      expect(result.payment).toBeDefined();
      expect(result.payment?.amountCents).toBe(20000);

      const p = await db.payments.get(result.payment!.id);
      expect(p).toBeDefined();

      const ops = await db.outbox.toArray();
      expect(ops).toHaveLength(2);
      expect(ops.map(o => o.entity).sort()).toEqual(["loans", "payments"]);
    });

    it("Validación falla", async () => {
      const input = {
        clientId: "",
        principalCents: 100000,
        rate: 0.2,
        termDays: 30 as const,
        lastCycleStart: "2025-01-01",
        renewalCount: 0,
        outstandingBalanceCents: 100000,
      };
      
      await expect(loansRepo.backfill(input)).rejects.toThrow();

      expect(await db.loans.count()).toBe(0);
      expect(await db.payments.count()).toBe(0);
      expect(await db.outbox.count()).toBe(0);
    });
  });

  describe("settingsRepo", () => {
    it("get() returns undefined when there is no data", async () => {
      const settings = await settingsRepo.get();
      expect(settings).toBeUndefined();
    });

    it("update() after ensureSettings() applies the patch and bumps updatedAt", async () => {
      await ensureSettings();
      const before = await settingsRepo.get();

      const updated = await settingsRepo.update({ phone: "999888777" });
      expect(updated.phone).toBe("999888777");
      expect(updated.updatedAt).not.toBe(before?.updatedAt);

      const fetched = await settingsRepo.get();
      expect(fetched?.phone).toBe("999888777");
      expect(fetched?.updatedAt).toBe(updated.updatedAt);
    });

    it("update() without prior seeding throws", async () => {
      await expect(settingsRepo.update({ phone: "1" })).rejects.toThrow(
        "Settings no inicializado; ensureSettings() no corrió"
      );
    });
  });
});

