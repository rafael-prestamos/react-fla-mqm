import { db } from "./database";
import { makeDefaultSettings, DEFAULT_BUSINESS } from "../config/business";
import { enqueue } from "../sync/outbox";
import { nowIso } from "../lib/id";
import type { BusinessSettings } from "../types/domain";

/** Garantiza que exista la fila singleton de settings.
    Si Dexie está vacío, siembra los defaults y encola en outbox para sync.
    Si ya existe, completa campos vacíos de titulares (backfill). */
export async function ensureSettings(): Promise<void> {
  const existing = await db.settings.get("singleton");
  if (existing) {
    const patched: BusinessSettings = {
      ...existing,
      yapeHolder: existing.yapeHolder || DEFAULT_BUSINESS.yapeHolder,
      bcpSolesHolder: existing.bcpSolesHolder || DEFAULT_BUSINESS.bcpSolesHolder,
      bcpInterbankHolder: existing.bcpInterbankHolder || DEFAULT_BUSINESS.bcpInterbankHolder,
    };
    const changed = patched.yapeHolder !== existing.yapeHolder
                 || patched.bcpSolesHolder !== existing.bcpSolesHolder
                 || patched.bcpInterbankHolder !== existing.bcpInterbankHolder;
    if (changed) {
      patched.updatedAt = nowIso();
      await db.settings.put(patched);
      await enqueue("settings", patched.id, "put", patched);
    }
    return;
  }
  
  const settings = makeDefaultSettings();
  await db.settings.put(settings);
  await enqueue("settings", settings.id, "put", settings);
}
