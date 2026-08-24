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
      editedAt: null,
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
    
    const timestamp = nowIso();
    const updated: Client = { ...current, ...patch, updatedAt: timestamp, editedAt: timestamp };
    await db.clients.put(updated);
    await enqueue("clients", id, "put", updated);
  },

  /**
   * Elimina un cliente por completo (hard delete), junto con todo su historial de
   * préstamos y pagos (activos, pagados o anulados). Sprint 7c-1.
   * A diferencia de `loansRepo.cancel`/`paymentsRepo.cancel` (soft delete), esto borra
   * los registros de verdad — Fla quiere poder re-agregar el mismo cliente después.
   * Bloqueado si el cliente tiene préstamos activos (no pagados, no anulados).
   */
  async remove(id: string): Promise<void> {
    const activeLoans = await db.loans
      .where("clientId").equals(id)
      .filter((loan) => !loan.isPaid && !loan.cancelledAt)
      .count();
    if (activeLoans > 0) throw new Error("No se puede eliminar un cliente con préstamos activos");

    const loans = await db.loans.where("clientId").equals(id).toArray();
    const loanIds = loans.map((loan) => loan.id);
    const payments = loanIds.length > 0
      ? await db.payments.where("loanId").anyOf(loanIds).toArray()
      : [];

    await db.transaction("rw", db.clients, db.loans, db.payments, db.outbox, async () => {
      for (const payment of payments) {
        await db.payments.delete(payment.id);
        await enqueue("payments", payment.id, "delete", null);
      }
      for (const loan of loans) {
        await db.loans.delete(loan.id);
        await enqueue("loans", loan.id, "delete", null);
      }
      await db.clients.delete(id);
      await enqueue("clients", id, "delete", null);
    });
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
