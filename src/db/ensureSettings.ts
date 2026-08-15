import { db } from "./database";
import { makeDefaultSettings } from "../config/business";
import { enqueue } from "../sync/outbox";

/** Garantiza que exista la fila singleton de settings.
    Si Dexie está vacío, siembra los defaults y encola en outbox para sync.
    Si ya existe, no hace nada (idempotente). */
export async function ensureSettings(): Promise<void> {
  const existing = await db.settings.get("singleton");
  if (existing) return;
  const settings = makeDefaultSettings();
  await db.settings.put(settings);
  await enqueue("settings", settings.id, "put", settings);
}
