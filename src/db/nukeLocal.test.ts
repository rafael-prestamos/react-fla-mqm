import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./database";
import { nukeLocalData } from "./nukeLocal";

describe("nukeLocalData", () => {
  beforeEach(async () => {
    await db.clients.clear();
    await db.loans.clear();
    await db.payments.clear();
    await db.outbox.clear();
  });

  it("should clear all tables when called", async () => {
    // Seed database
    await db.clients.put({ 
      id: "c1", 
      name: "Test", 
      dni: "1", 
      phone: "1", 
      rating: "good", 
      maxDaysLateHistorical: 0, 
      createdAt: "2024", 
      updatedAt: "2024" 
    });
    await db.loans.put({ id: "l1", clientId: "c1", principalCents: 1000, rate: 0.2, termDays: 30, disbursedAt: "", paidOffCents: 0, renewalCount: 0, isPaid: false, createdAt: "", updatedAt: "" });
    await db.payments.put({ id: "p1", loanId: "l1", type: "full", amountCents: 1000, method: "cash", daysLate: 0, paidAt: "" });
    await db.outbox.put({ entity: "clients", entityId: "c1", op: "put", payload: {}, createdAt: "" });

    // Verify seeded data exists
    expect(await db.clients.count()).toBe(1);
    expect(await db.loans.count()).toBe(1);
    expect(await db.payments.count()).toBe(1);
    expect(await db.outbox.count()).toBe(1);

    // Call nuke
    await nukeLocalData();

    // Verify everything is cleared
    expect(await db.clients.count()).toBe(0);
    expect(await db.loans.count()).toBe(0);
    expect(await db.payments.count()).toBe(0);
    expect(await db.outbox.count()).toBe(0);
  });
});
