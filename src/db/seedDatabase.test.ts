import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./database";

describe("seedDatabase", () => {
  beforeEach(async () => {
    await db.clients.clear();
    await db.loans.clear();
    await db.installments.clear();
    await db.payments.clear();
    await db.outbox.clear();
  });

  it.skip("TODO 4b: reactivar tras rediseño de UI y seedDatabase", () => {
    // skipped until seedDatabase is updated for 4b
  });
});
