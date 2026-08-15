import { db } from "./database";
import { seedClients, seedLoans } from "../seed";

export async function seedIfEmpty(): Promise<void> {
  const count = await db.clients.count();
  if (count === 0) {
    await db.clients.bulkPut(seedClients);
    await db.loans.bulkPut(seedLoans);
  }
}
