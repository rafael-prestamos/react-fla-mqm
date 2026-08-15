import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { pullFromSupabase } from "./pull";
import { db } from "../db/database";
import { supabase } from "../lib/supabase";
import type { ClientRow } from "./mappers";

vi.mock("../lib/supabase", () => {
  return {
    supabase: {
      auth: { getSession: vi.fn() },
      from: vi.fn(),
    },
    isSupabaseConfigured: true,
  };
});

describe("pullFromSupabase", () => {
  beforeEach(async () => {
    await db.clients.clear();
    await db.loans.clear();
    await db.payments.clear();
    vi.resetAllMocks();
  });

  it("returns zeros if no session", async () => {
    vi.mocked(supabase!.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as any);
    const res = await pullFromSupabase();
    expect(res).toEqual({ clients: 0, loans: 0, payments: 0 });
    expect(supabase!.from).not.toHaveBeenCalled();
  });

  it("pulls with empty local db", async () => {
    vi.mocked(supabase!.auth.getSession).mockResolvedValue({ data: { session: { user: { id: "u1" } } }, error: null } as any);
    
    const mockClients: ClientRow[] = [
      { id: "c1", owner_id: "u1", dni: "1", name: "A", phone: "1", rating: "good", max_days_late_historical: 0, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }
    ];

    vi.mocked(supabase!.from).mockImplementation((table) => {
      if (table === "clients") return { select: vi.fn().mockResolvedValue({ data: mockClients, error: null }) } as any;
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) } as any;
    });

    const res = await pullFromSupabase();
    expect(res).toEqual({ clients: 1, loans: 0, payments: 0 });

    const localClient = await db.clients.get("c1");
    expect(localClient?.name).toBe("A");
  });

  it("does not overwrite local if local is newer", async () => {
    vi.mocked(supabase!.auth.getSession).mockResolvedValue({ data: { session: { user: { id: "u1" } } }, error: null } as any);
    
    // Local newer
    await db.clients.put({
      id: "c1",
      dni: "1",
      name: "Local Name",
      phone: "1",
      rating: "good",
      maxDaysLateHistorical: 0,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-02-01T00:00:00Z"
    });

    const mockClients: ClientRow[] = [
      { id: "c1", owner_id: "u1", dni: "1", name: "Remote Name", phone: "1", rating: "good", max_days_late_historical: 0, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }
    ];

    vi.mocked(supabase!.from).mockImplementation((table) => {
      if (table === "clients") return { select: vi.fn().mockResolvedValue({ data: mockClients, error: null }) } as any;
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) } as any;
    });

    const res = await pullFromSupabase();
    expect(res).toEqual({ clients: 0, loans: 0, payments: 0 });

    const localClient = await db.clients.get("c1");
    expect(localClient?.name).toBe("Local Name");
  });

  it("overwrites local if remote is newer", async () => {
    vi.mocked(supabase!.auth.getSession).mockResolvedValue({ data: { session: { user: { id: "u1" } } }, error: null } as any);
    
    // Local older
    await db.clients.put({
      id: "c1",
      dni: "1",
      name: "Local Name",
      phone: "1",
      rating: "good",
      maxDaysLateHistorical: 0,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z"
    });

    const mockClients: ClientRow[] = [
      { id: "c1", owner_id: "u1", dni: "1", name: "Remote Name", phone: "1", rating: "bad", max_days_late_historical: 35, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-02-01T00:00:00Z" }
    ];

    vi.mocked(supabase!.from).mockImplementation((table) => {
      if (table === "clients") return { select: vi.fn().mockResolvedValue({ data: mockClients, error: null }) } as any;
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) } as any;
    });

    const res = await pullFromSupabase();
    expect(res).toEqual({ clients: 1, loans: 0, payments: 0 });

    const localClient = await db.clients.get("c1");
    expect(localClient?.name).toBe("Remote Name");
    expect(localClient?.rating).toBe("bad");
    expect(localClient?.maxDaysLateHistorical).toBe(35);
  });
});
