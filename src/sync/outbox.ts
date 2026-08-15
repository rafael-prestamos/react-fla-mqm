import { db, type OutboxOp, type SyncEntity } from "../db/database";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { nowIso } from "../lib/id";
import { clientToRow, loanToRow, paymentToRow, settingsToRow } from "./mappers";
import type { Client, Loan, Payment, BusinessSettings } from "../types/domain";

/** Encola una operación para sincronizar. Lo llaman los repositories. */
export async function enqueue(
  entity: SyncEntity,
  entityId: string,
  op: OutboxOp["op"],
  payload: unknown
): Promise<void> {
  const entry: OutboxOp = { entity, entityId, op, payload, createdAt: nowIso() };
  await db.outbox.add(entry);
}

/** Operaciones aún no sincronizadas, en orden de creación. */
export function pendingOps(): Promise<OutboxOp[]> {
  return db.outbox.filter((entry) => !entry.syncedAt).toArray();
}

export interface PushResult {
  synced: number;
  errors: number;
  total: number;
}

/** Empuja los pendientes a Supabase utilizando mappers camelCase -> snake_case. */
export async function pushOutbox(): Promise<PushResult> {
  if (!isSupabaseConfigured || !supabase) return { synced: 0, errors: 0, total: 0 };

  const { data } = await supabase.auth.getSession();
  if (!data.session) return { synced: 0, errors: 0, total: 0 };

  const ownerId = data.session.user.id;
  const pending = await pendingOps();
  let synced = 0;
  let errorsCount = 0;

  for (const entry of pending) {
    const table = entry.entity;
    let errorMessage: string | null = null;

    if (entry.op === "delete") {
      const { error } = await supabase.from(table).delete().eq("id", entry.entityId);
      if (error) {
        errorMessage = error.message;
      }
    } else {
      let mappedRow: Record<string, unknown> = {};
      if (table === "clients") {
        mappedRow = { ...clientToRow(entry.payload as Client), owner_id: ownerId };
      } else if (table === "loans") {
        mappedRow = { ...loanToRow(entry.payload as Loan), owner_id: ownerId };
      } else if (table === "payments") {
        mappedRow = { ...paymentToRow(entry.payload as Payment), owner_id: ownerId };
      } else if (table === "settings") {
        mappedRow = { ...settingsToRow(entry.payload as BusinessSettings), owner_id: ownerId };
      }

      const { error } = await supabase.from(table).upsert(mappedRow);
      if (error) {
        errorMessage = error.message;
      }
    }

    if (errorMessage) {
      errorsCount++;
      // Rompe el loop ante errores para conservar el orden estricto, 
      // especialmente importante para PGRST de auth/RLS.
      break;
    }
    
    if (entry.id !== undefined) {
      await db.outbox.update(entry.id, { syncedAt: nowIso() });
    }
    synced++;
  }

  return { synced, errors: errorsCount, total: pending.length };
}
