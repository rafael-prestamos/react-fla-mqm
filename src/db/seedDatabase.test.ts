import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./database";
import { seedIfEmpty } from "./seedDatabase";

describe("seedDatabase", () => {
  beforeEach(async () => {
    await db.clients.clear();
    await db.loans.clear();
    await db.outbox.clear();
  });

  it("seeds the database with 8 clients and 8 loans if empty, and outbox remains empty", async () => {
    await seedIfEmpty();
    expect(await db.clients.count()).toBe(8);
    expect(await db.loans.count()).toBe(8);
    expect(await db.outbox.count()).toBe(0);
  });

  it("does not duplicate data if called twice", async () => {
    await seedIfEmpty();
    await seedIfEmpty();
    expect(await db.clients.count()).toBe(8);
    expect(await db.loans.count()).toBe(8);
  });
});
