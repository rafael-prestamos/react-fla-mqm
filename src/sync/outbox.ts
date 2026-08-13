/**
 * Motor de sincronización — patrón Outbox.
 *
 * Cada cambio local se encola en db.outbox. Cuando hay conexión y sesión,
 * pushOutbox() empuja los pendientes a Supabase (upsert/delete) y los marca
 * como sincronizados. Estrategia de conflictos: last-write-wins por updatedAt.
 *
 * Nota de mapeo: el dominio usa camelCase; Postgres usa snake_case. El mapeo
 * concreto por entidad se implementa en Sprint 4 (junto al backup automático).
 */

import { db, type OutboxOp, type SyncEntity } from "../db/database";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { nowIso } from "../lib/id";

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

/** Empuja los pendientes a Supabase. Devuelve cuántas operaciones se sincronizaron. */
export async function pushOutbox(): Promise<number> {
  if (!isSupabaseConfigured || !supabase) return 0;

  const { data } = await supabase.auth.getSession();
  if (!data.session) return 0; // sin sesión no sincronizamos (Auth + RLS)

  const pending = await pendingOps();
  let synced = 0;

  for (const entry of pending) {
    const table = entry.entity;
    let errorMessage: string | null = null;

    if (entry.op === "delete") {
      const { error } = await supabase.from(table).delete().eq("id", entry.entityId);
      errorMessage = error?.message ?? null;
    } else {
      const { error } = await supabase.from(table).upsert(entry.payload as Record<string, unknown>);
      errorMessage = error?.message ?? null;
    }

    if (errorMessage) break; // reintenta en la próxima pasada; conservamos el orden
    if (entry.id !== undefined) {
      await db.outbox.update(entry.id, { syncedAt: nowIso() });
    }
    synced += 1;
  }

  return synced;
}
