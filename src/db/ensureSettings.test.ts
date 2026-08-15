import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./database";
import { ensureSettings } from "./ensureSettings";
import { DEFAULT_BUSINESS } from "../config/business";

describe("ensureSettings", () => {
  beforeEach(async () => {
    await db.settings.clear();
    await db.outbox.clear();
  });

  it("seeds defaults and enqueues a put when Dexie is empty", async () => {
    await ensureSettings();

    const settings = await db.settings.get("singleton");
    expect(settings).toBeDefined();
    expect(settings?.businessName).toBe(DEFAULT_BUSINESS.businessName);
    expect(settings?.phone).toBe(DEFAULT_BUSINESS.phone);

    expect(await db.settings.count()).toBe(1);
    const ops = await db.outbox.toArray();
    expect(ops).toHaveLength(1);
    expect(ops[0].entity).toBe("settings");
    expect(ops[0].entityId).toBe("singleton");
    expect(ops[0].op).toBe("put");
  });

  it("is idempotent when a row already exists with all holders", async () => {
    await ensureSettings();
    await db.outbox.clear();

    await ensureSettings();

    expect(await db.settings.count()).toBe(1);
    expect(await db.outbox.count()).toBe(0);
  });

  it("backfills missing holders and enqueues put for legacy rows", async () => {
    // Fila legacy (como vendría de un pull de versión antigua de la BD)
    await db.settings.put({
      id: "singleton",
      businessName: "Test",
      phone: "123",
      yape: "123",
      yapeHolder: "", // o undefined
      bcpSoles: "123",
      bcpSolesHolder: "", // missing
      bcpInterbank: "123",
      bcpInterbankHolder: "",
      updatedAt: "2023-01-01T00:00:00.000Z",
    });
    await db.outbox.clear();

    await ensureSettings();

    const patched = await db.settings.get("singleton");
    expect(patched?.yapeHolder).toBe(DEFAULT_BUSINESS.yapeHolder);
    expect(patched?.bcpSolesHolder).toBe(DEFAULT_BUSINESS.bcpSolesHolder);
    expect(patched?.bcpInterbankHolder).toBe(DEFAULT_BUSINESS.bcpInterbankHolder);
    expect(patched?.updatedAt).not.toBe("2023-01-01T00:00:00.000Z");

    const ops = await db.outbox.toArray();
    expect(ops).toHaveLength(1);
    expect(ops[0].entity).toBe("settings");
    expect(ops[0].op).toBe("put");
  });
});
