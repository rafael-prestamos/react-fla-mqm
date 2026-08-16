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
  retryCount?: number; // intentos fallidos consecutivos
  failedAt?: string; // ISO cuando se marcó dead-letter (retryCount >= 5)
  lastError?: string; // mensaje del último error de Supabase (se limpia al sincronizar bien)
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

    // v4: Se agregan titulares de las cuentas en settings.
    this.version(4).stores({
      settings: "id, updatedAt",
    }).upgrade(tx => {
      return tx.table("settings").toCollection().modify(s => {
        s.yapeHolder = s.yapeHolder ?? "Rafael Rojas";
        s.bcpSolesHolder = s.bcpSolesHolder ?? "Rafael Rojas";
        s.bcpInterbankHolder = s.bcpInterbankHolder ?? "Rafael Rojas";
      });
    });

    // v5: Campos de anulación y edición (sprint 6a-8).
    this.version(5).stores({}).upgrade(tx => Promise.all([
      tx.table("loans").toCollection().modify(loan => {
        if (loan.cancelledAt === undefined) loan.cancelledAt = null;
        if (loan.cancelReason === undefined) loan.cancelReason = null;
        if (loan.editedAt === undefined) loan.editedAt = null;
      }),
      tx.table("payments").toCollection().modify(payment => {
        if (payment.cancelledAt === undefined) payment.cancelledAt = null;
        if (payment.cancelReason === undefined) payment.cancelReason = null;
        if (payment.editedAt === undefined) payment.editedAt = null;
      }),
      tx.table("clients").toCollection().modify(client => {
        if (client.editedAt === undefined) client.editedAt = null;
      }),
    ]));

    // v6: Dead-letter en outbox (retryCount/failedAt) — no requiere upgrade handler,
    // Dexie trata los campos nuevos como undefined en registros existentes.
    this.version(6).stores({});

    // v7: Guardar el mensaje del último error de sync (lastError) para el log de Ajustes.
    this.version(7).stores({});
  }
}

export const db = new AppDatabase();
