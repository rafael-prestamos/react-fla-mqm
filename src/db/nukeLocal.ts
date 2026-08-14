import { db } from "./database";

/** Borra todas las tablas locales (incluyendo el outbox). Usar SOLO en cambio de propietario o logout. */
export async function nukeLocalData(): Promise<void> {
  await db.transaction("rw", db.clients, db.loans, db.payments, db.outbox, async () => {
    await Promise.all([
      db.clients.clear(),
      db.loans.clear(),
      db.payments.clear(),
      db.outbox.clear(),
    ]);
  });
}
