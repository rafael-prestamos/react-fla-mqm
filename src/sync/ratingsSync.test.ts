import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../db/database";
import { clientsRepo } from "../repositories/clientsRepo";
import { loansRepo } from "../repositories/loansRepo";
import { paymentsRepo } from "../repositories/paymentsRepo";
import { recomputeAllRatings } from "./ratingsSync";

describe("recomputeAllRatings", () => {
  beforeEach(async () => {
    await db.clients.clear();
    await db.loans.clear();
    await db.payments.clear();
    await db.outbox.clear();
  });

  it("updates rating to slow for 10 days late loan", async () => {
    const client = await clientsRepo.create({ dni: "1", name: "Ana", phone: "1" });
    await loansRepo.create({ clientId: client.id, principalCents: 1000, rate: 0.2, termDays: 30 });
    
    // Simulate being 40 days after disbursed (10 days late)
    const refDate = new Date();
    refDate.setDate(refDate.getDate() + 40);
    
    const res = await recomputeAllRatings(refDate);
    expect(res.updated).toBe(1);

    const c = await db.clients.get(client.id);
    expect(c?.rating).toBe("slow");
    expect(c?.maxDaysLateHistorical).toBeGreaterThanOrEqual(10);
  });

  it("updates rating to bad for 35 days late history", async () => {
    const client = await clientsRepo.create({ dni: "2", name: "Beto", phone: "2" });
    const loan = await loansRepo.create({ clientId: client.id, principalCents: 1000, rate: 0.2, termDays: 30 });
    
    // Historical payment 35 days late
    await paymentsRepo.create({ loanId: loan.id, type: "full", amountCents: 1000, method: "cash", daysLate: 35 });
    
    const res = await recomputeAllRatings(new Date());
    expect(res.updated).toBe(1);

    const c = await db.clients.get(client.id);
    expect(c?.rating).toBe("bad");
    expect(c?.maxDaysLateHistorical).toBe(35);
  });

  it("is idempotent if no changes", async () => {
    const client = await clientsRepo.create({ dni: "3", name: "Ceci", phone: "3" });
    const res1 = await recomputeAllRatings(new Date());
    expect(res1.updated).toBe(0); // rating is already good, maxDays is 0

    const loan = await loansRepo.create({ clientId: client.id, principalCents: 1000, rate: 0.2, termDays: 30 });
    const refDate = new Date();
    refDate.setDate(refDate.getDate() + 40); // 10 days late

    const res2 = await recomputeAllRatings(refDate);
    expect(res2.updated).toBe(1);
    
    const res3 = await recomputeAllRatings(refDate);
    expect(res3.updated).toBe(0); // already updated
  });

  it("never lowers maxDaysLateHistorical or rating", async () => {
    const client = await clientsRepo.create({ dni: "4", name: "Dani", phone: "4" });
    await clientsRepo.updateRating(client.id, "bad", 35);
    
    // Client has no loans or payments, so current maxDaysLate is 0
    const res = await recomputeAllRatings(new Date());
    expect(res.updated).toBe(0);

    const c = await db.clients.get(client.id);
    expect(c?.rating).toBe("bad");
    expect(c?.maxDaysLateHistorical).toBe(35);
  });
});
