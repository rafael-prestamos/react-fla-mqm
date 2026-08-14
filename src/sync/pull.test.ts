import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { pullFromSupabase } from "./pull";
import { db } from "../db/database";
import { supabase } from "../lib/supabase";
import type { ClientRow, LoanRow, InstallmentRow, PaymentRow } from "./mappers";

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
    await db.installments.clear();
    await db.payments.clear();
    vi.resetAllMocks();
  });

  it("returns zeros if no session", async () => {
    vi.mocked(supabase!.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as any);
    const res = await pullFromSupabase();
    expect(res).toEqual({ clients: 0, loans: 0, installments: 0, payments: 0 });
    expect(supabase!.from).not.toHaveBeenCalled();
  });

  it("pulls with empty local db", async () => {
    vi.mocked(supabase!.auth.getSession).mockResolvedValue({ data: { session: { user: { id: "u1" } } }, error: null } as any);
    
    const mockClients: ClientRow[] = [
      { id: "c1", owner_id: "u1", dni: "1", name: "A", phone: "1", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }
    ];
    const mockInstallments: InstallmentRow[] = [
      { id: "i1", owner_id: "u1", loan_id: "l1", index: 1, due_date: "2024-01-31", amount_cents: 1000, paid_cents: 0, status: "pending", paid_at: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }
    ];

    vi.mocked(supabase!.from).mockImplementation((table) => {
      if (table === "clients") return { select: vi.fn().mockResolvedValue({ data: mockClients, error: null }) } as any;
      if (table === "installments") return { select: vi.fn().mockResolvedValue({ data: mockInstallments, error: null }) } as any;
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) } as any;
    });

    const res = await pullFromSupabase();
    expect(res).toEqual({ clients: 1, loans: 0, installments: 1, payments: 0 });

    const localClient = await db.clients.get("c1");
    expect(localClient?.name).toBe("A");
    
    const localInst = await db.installments.get("i1");
    expect(localInst?.amountCents).toBe(1000);
  });
});
