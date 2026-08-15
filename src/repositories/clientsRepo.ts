/**
 * Repository de clientes.
 * Patrón: Repository — aísla a la UI de Dexie y encola cada cambio en el outbox
 * para que el motor de sync lo empuje a Supabase cuando haya conexión.
 */

import { db } from "../db/database";
import { enqueue } from "../sync/outbox";
import { newId, nowIso } from "../lib/id";
import type { Client } from "../types/domain";
import { normalizeClientName } from "../domain/clientName";

export const clientsRepo = {
  /** Lista todos los clientes ordenados por nombre. */
  all(): Promise<Client[]> {
    return db.clients.orderBy("name").toArray();
  },

  get(id: string): Promise<Client | undefined> {
    return db.clients.get(id);
  },

  findByDni(dni: string): Promise<Client | undefined> {
    return db.clients.where("dni").equals(dni.trim()).first();
  },

  /** Crea un cliente nuevo y lo encola para sync. */
  async create(input: Pick<Client, "dni" | "name" | "phone">): Promise<Client> {
    const timestamp = nowIso();
    const client: Client = {
      id: newId(),
      dni: input.dni.trim(),
      name: normalizeClientName(input.name),
      phone: input.phone.trim(),
      rating: "good",
      maxDaysLateHistorical: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.clients.put(client);
    await enqueue("clients", client.id, "put", client);
    return client;
  },

  /** Actualiza campos de un cliente existente. */
  async update(id: string, patch: Partial<Omit<Client, "id" | "createdAt">>): Promise<void> {
    const current = await db.clients.get(id);
    if (!current) return;
    
    if (patch.name) {
      patch.name = normalizeClientName(patch.name);
    }
    
    const updated: Client = { ...current, ...patch, updatedAt: nowIso() };
    await db.clients.put(updated);
    await enqueue("clients", id, "put", updated);
  },

  /** Actualiza el rating de un cliente. maxDaysLate solo se actualiza si es mayor. */
  async updateRating(id: string, rating: Client["rating"], maxDaysLate: number): Promise<void> {
    const current = await db.clients.get(id);
    if (!current) return;
    const updatedMax = Math.max(current.maxDaysLateHistorical, maxDaysLate);
    
    // Si no cambió ni el rating ni el histórico, no hacemos nada (idempotente parcial en repo)
    if (current.rating === rating && current.maxDaysLateHistorical === updatedMax) return;

    const updated: Client = { 
      ...current, 
      rating, 
      maxDaysLateHistorical: updatedMax, 
      updatedAt: nowIso() 
    };
    await db.clients.put(updated);
    await enqueue("clients", id, "put", updated);
  },
};
