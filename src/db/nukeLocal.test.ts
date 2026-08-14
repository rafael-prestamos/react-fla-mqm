import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./database";
import { nukeLocalData } from "./nukeLocal";

describe("nukeLocalData", () => {
  beforeEach(async () => {
    await db.clients.clear();
    await db.loans.clear();
    await db.installments.clear();
    await db.payments.clear();
    await db.outbox.clear();
  });

  it("should clear all tables when called", async () => {
    // Seed database
    await db.clients.add({ id: "1" } as any);
    await db.loans.add({ id: "1" } as any);
    await db.installments.add({ id: "1" } as any);
    await db.payments.add({ id: "1" } as any);
    await db.outbox.add({ id: 1 } as any);

    // Verify seeded data exists
    expect(await db.clients.count()).toBe(1);
    expect(await db.loans.count()).toBe(1);
    expect(await db.installments.count()).toBe(1);
    expect(await db.payments.count()).toBe(1);
    expect(await db.outbox.count()).toBe(1);

    await nukeLocalData();

    // Verify data is deleted
    expect(await db.clients.count()).toBe(0);
    expect(await db.loans.count()).toBe(0);
    expect(await db.installments.count()).toBe(0);
    expect(await db.payments.count()).toBe(0);
    expect(await db.outbox.count()).toBe(0);
  });
});
