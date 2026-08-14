import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { db } from "../db/database";
import { rowToClient, rowToLoan, rowToPayment, type ClientRow, type LoanRow, type PaymentRow } from "./mappers";

export interface PullResult {
  clients: number;
  loans: number;
  payments: number;
}

/** 
 * Descarga todas las filas del usuario desde Supabase y las mergea a Dexie
 * con estrategia last-write-wins por updatedAt. Ignora filas locales que ya
 * tienen updatedAt >= remoto (evita pisar cambios locales pendientes de push). 
 */
export async function pullFromSupabase(): Promise<PullResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { clients: 0, loans: 0, payments: 0 };
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { clients: 0, loans: 0, payments: 0 };
  }

  const [clientsRes, loansRes, paymentsRes] = await Promise.all([
    supabase.from("clients").select("*"),
    supabase.from("loans").select("*"),
    supabase.from("payments").select("*"),
  ]);

  if (clientsRes.error) throw new Error(clientsRes.error.message);
  if (loansRes.error) throw new Error(loansRes.error.message);
  if (paymentsRes.error) throw new Error(paymentsRes.error.message);

  let clientsCount = 0;
  let loansCount = 0;
  let paymentsCount = 0;

  await db.transaction("rw", db.clients, db.loans, db.payments, async () => {
    // Clients
    for (const r of (clientsRes.data || []) as ClientRow[]) {
      const remote = rowToClient(r);
      const local = await db.clients.get(remote.id);
      if (!local || new Date(remote.updatedAt).getTime() > new Date(local.updatedAt).getTime()) {
        await db.clients.put(remote);
        clientsCount++;
      }
    }

    // Loans
    for (const r of (loansRes.data || []) as LoanRow[]) {
      try {
        const remote = rowToLoan(r);
        const local = await db.loans.get(remote.id);
        if (!local || new Date(remote.updatedAt).getTime() > new Date(local.updatedAt).getTime()) {
          await db.loans.put(remote);
          loansCount++;
        }
      } catch (e) {
        console.warn(e);
      }
    }

    // Payments
    for (const r of (paymentsRes.data || []) as PaymentRow[]) {
      const remote = rowToPayment(r);
      const local = await db.payments.get(remote.id);
      if (!local) {
        await db.payments.put(remote);
        paymentsCount++;
      }
    }
  });

  return { clients: clientsCount, loans: loansCount, payments: paymentsCount };
}
