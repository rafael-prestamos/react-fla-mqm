import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { pushOutbox, pendingOps, retryDeadLetter, retryAllDeadLetters } from "./outbox";
import { db } from "../db/database";
import { supabase } from "../lib/supabase";

vi.mock("../lib/supabase", () => {
  return {
    supabase: {
      auth: { getSession: vi.fn() },
      from: vi.fn(),
    },
    isSupabaseConfigured: true,
  };
});

describe("outbox dead-letter", () => {
  beforeEach(async () => {
    await db.clients.clear();
    await db.outbox.clear();
    vi.resetAllMocks();
    vi.mocked(supabase!.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
      error: null,
    } as any);
  });

  it("marca failedAt cuando retryCount llega a 5 tras un nuevo fallo", async () => {
    await db.outbox.add({
      entity: "clients",
      entityId: "c1",
      op: "put",
      payload: { id: "c1", dni: "1", name: "A", phone: "1", rating: "good", maxDaysLateHistorical: 0, createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
      createdAt: "2024-01-01T00:00:00Z",
      retryCount: 4,
    });

    vi.mocked(supabase!.from).mockImplementation(() => ({
      upsert: vi.fn().mockResolvedValue({ error: { message: "boom" } }),
    }) as any);

    const result = await pushOutbox();

    expect(result.deadLettered).toBe(1);
    expect(result.errors).toBe(1);
    expect(result.synced).toBe(0);

    const entries = await db.outbox.toArray();
    expect(entries[0].retryCount).toBe(5);
    expect(entries[0].failedAt).toBeDefined();
  });

  it("solo incrementa retryCount sin marcar failedAt si no llega al umbral", async () => {
    await db.outbox.add({
      entity: "clients",
      entityId: "c1",
      op: "put",
      payload: { id: "c1", dni: "1", name: "A", phone: "1", rating: "good", maxDaysLateHistorical: 0, createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
      createdAt: "2024-01-01T00:00:00Z",
      retryCount: 2,
    });

    vi.mocked(supabase!.from).mockImplementation(() => ({
      upsert: vi.fn().mockResolvedValue({ error: { message: "boom" } }),
    }) as any);

    const result = await pushOutbox();

    expect(result.deadLettered).toBe(0);
    expect(result.errors).toBe(1);

    const entries = await db.outbox.toArray();
    expect(entries[0].retryCount).toBe(3);
    expect(entries[0].failedAt).toBeUndefined();
  });

  it("un registro que falla no bloquea al siguiente (sin break)", async () => {
    await db.outbox.add({
      entity: "clients",
      entityId: "bad",
      op: "put",
      payload: { id: "bad", dni: "1", name: "A", phone: "1", rating: "good", maxDaysLateHistorical: 0, createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
      createdAt: "2024-01-01T00:00:00Z",
    });
    await db.outbox.add({
      entity: "clients",
      entityId: "good",
      op: "put",
      payload: { id: "good", dni: "2", name: "B", phone: "2", rating: "good", maxDaysLateHistorical: 0, createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
      createdAt: "2024-01-01T00:00:01Z",
    });

    vi.mocked(supabase!.from).mockImplementation(() => ({
      upsert: vi.fn().mockImplementation((row: any) => {
        if (row.id === "bad") return Promise.resolve({ error: { message: "boom" } });
        return Promise.resolve({ error: null });
      }),
    }) as any);

    const result = await pushOutbox();

    expect(result.errors).toBe(1);
    expect(result.synced).toBe(1);

    const entries = await db.outbox.toArray();
    const goodEntry = entries.find((e) => e.entityId === "good");
    expect(goodEntry?.syncedAt).toBeDefined();
  });

  it("pendingOps excluye entries con failedAt", async () => {
    await db.outbox.add({
      entity: "clients",
      entityId: "dead",
      op: "put",
      payload: {},
      createdAt: "2024-01-01T00:00:00Z",
      failedAt: "2024-01-02T00:00:00Z",
    });
    await db.outbox.add({
      entity: "clients",
      entityId: "alive",
      op: "put",
      payload: {},
      createdAt: "2024-01-01T00:00:01Z",
    });

    const pending = await pendingOps();

    expect(pending).toHaveLength(1);
    expect(pending[0].entityId).toBe("alive");
  });

  it("guarda lastError con el mensaje cuando un registro falla", async () => {
    await db.outbox.add({
      entity: "clients",
      entityId: "c1",
      op: "put",
      payload: { id: "c1", dni: "1", name: "A", phone: "1", rating: "good", maxDaysLateHistorical: 0, createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
      createdAt: "2024-01-01T00:00:00Z",
    });

    vi.mocked(supabase!.from).mockImplementation(() => ({
      upsert: vi.fn().mockResolvedValue({ error: { message: "RLS violation" } }),
    }) as any);

    await pushOutbox();

    const entries = await db.outbox.toArray();
    expect(entries[0].lastError).toBe("RLS violation");
  });

  it("limpia lastError cuando un registro se sincroniza bien", async () => {
    await db.outbox.add({
      entity: "clients",
      entityId: "c1",
      op: "put",
      payload: { id: "c1", dni: "1", name: "A", phone: "1", rating: "good", maxDaysLateHistorical: 0, createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
      createdAt: "2024-01-01T00:00:00Z",
      retryCount: 2,
      lastError: "boom anterior",
    });

    vi.mocked(supabase!.from).mockImplementation(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }) as any);

    await pushOutbox();

    const entries = await db.outbox.toArray();
    expect(entries[0].lastError).toBeUndefined();
    expect(entries[0].syncedAt).toBeDefined();
  });

  it("retryDeadLetter resetea retryCount, failedAt y lastError de un registro", async () => {
    const id = await db.outbox.add({
      entity: "clients",
      entityId: "c1",
      op: "put",
      payload: {},
      createdAt: "2024-01-01T00:00:00Z",
      retryCount: 5,
      failedAt: "2024-01-02T00:00:00Z",
      lastError: "boom",
    });

    await retryDeadLetter(id);

    const entry = await db.outbox.get(id);
    expect(entry?.retryCount).toBe(0);
    expect(entry?.failedAt).toBeUndefined();
    expect(entry?.lastError).toBeUndefined();
  });

  it("retryAllDeadLetters resetea todos los dead-letter sin tocar los demás", async () => {
    const deadId = await db.outbox.add({
      entity: "clients",
      entityId: "dead",
      op: "put",
      payload: {},
      createdAt: "2024-01-01T00:00:00Z",
      retryCount: 5,
      failedAt: "2024-01-02T00:00:00Z",
      lastError: "boom",
    });
    const aliveId = await db.outbox.add({
      entity: "clients",
      entityId: "alive",
      op: "put",
      payload: {},
      createdAt: "2024-01-01T00:00:01Z",
      retryCount: 2,
      lastError: "boom parcial",
    });

    await retryAllDeadLetters();

    const dead = await db.outbox.get(deadId);
    const alive = await db.outbox.get(aliveId);
    expect(dead?.retryCount).toBe(0);
    expect(dead?.failedAt).toBeUndefined();
    expect(alive?.retryCount).toBe(2);
    expect(alive?.lastError).toBe("boom parcial");
  });
});
