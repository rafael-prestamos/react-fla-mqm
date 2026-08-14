import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./database";
import { clientsRepo } from "../repositories/clientsRepo";
import { loansRepo } from "../repositories/loansRepo";
import { startOfToday, addDays, toIsoDate } from "../lib/dates";

describe("seedDatabase", () => {
  beforeEach(async () => {
    await db.clients.clear();
    await db.loans.clear();
    await db.installments.clear();
    await db.payments.clear();
    await db.outbox.clear();
  });

  it("can seed realistic data using the new domain model", async () => {
    // 1. Crear un cliente
    const client = await clientsRepo.create({
      name: "Juan Perez",
      dni: "12345678",
      phone: "987654321",
    });
    
    // 2. Crear un préstamo con cuotas
    await loansRepo.create({
      clientId: client.id,
      principalCents: 1000_00,
      rate: 0.20, // 20%
      installmentCount: 4,
      frequency: "weekly",
      disbursedAt: toIsoDate(startOfToday()),
    });
    
    // 3. Crear otro histórico mediante backfill
    await loansRepo.backfill({
      clientId: client.id,
      principalCents: 500_00,
      rate: 0.10,
      installmentCount: 1,
      frequency: "monthly",
      disbursedAt: toIsoDate(addDays(startOfToday(), -40)),
      installments: [
        {
          index: 1,
          paidCents: 550_00,
          paidAt: toIsoDate(addDays(startOfToday(), -10)),
        }
      ]
    });

    const loansCount = await db.loans.count();
    const instCount = await db.installments.count();
    
    expect(loansCount).toBe(2);
    expect(instCount).toBe(5); // 4 + 1
  });
});
