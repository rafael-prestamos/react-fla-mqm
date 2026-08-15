import { db } from "../db/database";
import { enqueue } from "../sync/outbox";
import { nowIso } from "../lib/id";
import type { BusinessSettings } from "../types/domain";

export const settingsRepo = {
  /** Devuelve la fila singleton (o undefined si aún no se sembró). */
  get(): Promise<BusinessSettings | undefined> {
    return db.settings.get("singleton");
  },

  /** Actualiza los campos editables del singleton. */
  async update(patch: Partial<Omit<BusinessSettings, "id" | "updatedAt">>): Promise<BusinessSettings> {
    const current = await db.settings.get("singleton");
    if (!current) throw new Error("Settings no inicializado; ensureSettings() no corrió");
    const next: BusinessSettings = { ...current, ...patch, updatedAt: nowIso() };
    await db.settings.put(next);
    await enqueue("settings", next.id, "put", next);
    return next;
  },
};
