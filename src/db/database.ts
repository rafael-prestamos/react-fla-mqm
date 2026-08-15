/**
 * Base de datos local (offline-first) sobre IndexedDB usando Dexie.
 * Dexie es la FUENTE DE VERDAD local; Supabase es respaldo/sync.
 * Patrón: Unit of Work + Outbox (los cambios se encolan para empujarlos a la nube).
 */

import Dexie, { type Table } from "dexie";
import type { Client, Loan, Payment, BusinessSettings } from "../types/domain";

/** Nombre de tabla replicable en Supabase. */
export type SyncEntity = "clients" | "loans" | "payments" | "settings";

/** Operación pendiente de sincronizar hacia Supabase. */
export interface OutboxOp {
  id?: number; // autoincremental local
  entity: SyncEntity;
  entityId: string;
  op: "put" | "delete";
  payload: unknown;
  createdAt: string; // ISO
  syncedAt?: string; // ISO cuando ya se empujó
}

export class AppDatabase extends Dexie {
  clients!: Table<Client, string>;
  loans!: Table<Loan, string>;
  payments!: Table<Payment, string>;
  settings!: Table<BusinessSettings, string>;
  outbox!: Table<OutboxOp, number>;

  constructor() {
    super("fla-mpm");
    // Solo se indexan las columnas por las que consultamos/filtramos.
    this.version(1).stores({
      clients: "id, dni, name, updatedAt",
      loans: "id, clientId, isPaid, disbursedAt, updatedAt",
      payments: "id, loanId, paidAt",
      outbox: "++id, entity, entityId, syncedAt",
    });

    // v2: Cache de rating y maxDaysLateHistorical para los clientes
    this.version(2).stores({
      clients: "id, dni, name, updatedAt, rating, maxDaysLateHistorical",
    }).upgrade(tx => {
      return tx.table("clients").toCollection().modify(client => {
        if (client.rating === undefined) client.rating = "good";
        if (client.maxDaysLateHistorical === undefined) client.maxDaysLateHistorical = 0;
      });
    });

    // v3: Tabla singleton de settings de negocio (para PDFs de recibos).
    // No se siembra aquí; el sembrado lo hace ensureSettings() explícitamente.
    this.version(3).stores({
      settings: "id, updatedAt",
    });
  }
}

export const db = new AppDatabase();
