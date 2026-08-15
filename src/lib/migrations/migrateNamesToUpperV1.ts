// Patrón: Migration script idempotente + backup pre-migración
// Ejecuta una sola vez por dispositivo (bandera en Settings)
// Migra Dexie local + upsert a Supabase (si online)

import { db } from "../../db/database";
import { settingsRepo } from "../../repositories/settingsRepo";
import { supabase } from "../supabase";
import { normalizeClientName } from "../../domain/clientName";

const MIGRATION_KEY = "namesMigratedToUpperV1";
const BACKUP_STORAGE_KEY = "fla-mpm:backup:clients-pre-uppercase-v1";

export async function migrateNamesToUpperV1(): Promise<{
  skipped: boolean;
  migratedCount: number;
  syncedToCloud: boolean;
}> {
  const settings = await settingsRepo.get();
  // Si no hay settings o ya se migró, saltamos
  if (!settings || settings[MIGRATION_KEY]) {
    return { skipped: true, migratedCount: 0, syncedToCloud: false };
  }

  const clients = await db.clients.toArray();
  
  // Backup completo a localStorage antes de tocar nada
  localStorage.setItem(
    BACKUP_STORAGE_KEY,
    JSON.stringify({ timestamp: new Date().toISOString(), clients })
  );

  const toUpdate = clients.filter(c => c.name !== normalizeClientName(c.name));
  
  // Actualizar Dexie local
  for (const client of toUpdate) {
    const normalized = normalizeClientName(client.name);
    await db.clients.update(client.id, { name: normalized });
  }

  // Intentar sync a Supabase (best-effort, si falla queda para próximo sync)
  let syncedToCloud = false;
  try {
    if (navigator.onLine && toUpdate.length > 0 && supabase) {
      const promises = toUpdate.map(c => 
        supabase!
          .from("clients")
          .update({ name: normalizeClientName(c.name) })
          .eq("id", c.id)
      );
      const results = await Promise.all(promises);
      const hasError = results.some(r => r.error);
      if (!hasError) syncedToCloud = true;
    }
  } catch (err) {
    // Silencioso: Outbox pattern eventualmente sincroniza si es necesario
    console.error("Error migrating to cloud:", err);
  }

  await settingsRepo.update({ [MIGRATION_KEY]: true });
  return { skipped: false, migratedCount: toUpdate.length, syncedToCloud };
}
