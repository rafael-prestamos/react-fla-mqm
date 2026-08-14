import Dexie, { type Table } from "dexie";
import type { Client, Loan, Payment, Installment } from "../types/domain";

export type SyncEntity = "clients" | "loans" | "payments" | "installments";

export interface OutboxOp {
  id?: number;
  entity: SyncEntity;
  entityId: string;
  op: "put" | "delete";
  payload: unknown;
  createdAt: string;
  syncedAt?: string;
}

export class AppDatabase extends Dexie {
  clients!: Table<Client, string>;
  loans!: Table<Loan, string>;
  installments!: Table<Installment, string>;
  payments!: Table<Payment, string>;
  outbox!: Table<OutboxOp, number>;

  constructor() {
    super("fla-mpm");
    
    // v1 original
    this.version(1).stores({
      clients: "id, dni, name, updatedAt",
      loans: "id, clientId, isPaid, disbursedAt, updatedAt",
      payments: "id, loanId, paidAt",
      outbox: "++id, entity, entityId, syncedAt",
    });

    // v2 (if it existed)
    this.version(2).stores({
      clients: "id, dni, name, updatedAt",
      loans: "id, clientId, isPaid, disbursedAt, updatedAt",
      payments: "id, loanId, paidAt",
      outbox: "++id, entity, entityId, syncedAt",
    });

    // v3 adds installments, alters loans/payments schemas
    this.version(3).stores({
      clients: "id, dni, name, updatedAt",
      loans: "id, clientId, isPaid, disbursedAt, updatedAt",
      installments: "id, loanId, dueDate, status, updatedAt",
      payments: "id, loanId, paidAt",
      outbox: "++id, entity, entityId, syncedAt",
    }).upgrade(async tx => {
      // Destructive migration for loans/payments due to redesign
      // Q6=a del grill: datos actuales son solo de pruebas.
      await tx.table("loans").clear();
      await tx.table("payments").clear();
      await tx.table("installments").clear();
    });
  }
}

export const db = new AppDatabase();
