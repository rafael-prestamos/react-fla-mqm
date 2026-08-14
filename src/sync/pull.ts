import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { db } from "../db/database";
import { 
  rowToClient, rowToLoan, rowToInstallment, rowToPayment, 
  type ClientRow, type LoanRow, type InstallmentRow, type PaymentRow 
} from "./mappers";

export interface PullResult {
  clients: number;
  loans: number;
  installments: number;
  payments: number;
}

export async function pullFromSupabase(): Promise<PullResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { clients: 0, loans: 0, installments: 0, payments: 0 };
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { clients: 0, loans: 0, installments: 0, payments: 0 };
  }

  const { data: clientsData, error: ce } = await supabase.from("clients").select("*");
  const { data: loansData, error: le } = await supabase.from("loans").select("*");
  const { data: installmentsData, error: ie } = await supabase.from("installments").select("*");
  const { data: paymentsData, error: pe } = await supabase.from("payments").select("*");

  if (ce || le || ie || pe) {
    console.error("Error en pull", { ce, le, ie, pe });
    return { clients: 0, loans: 0, installments: 0, payments: 0 };
  }

  let clientsSynced = 0;
  let loansSynced = 0;
  let installmentsSynced = 0;
  let paymentsSynced = 0;

  await db.transaction("rw", db.clients, db.loans, db.installments, db.payments, async () => {
    // Clients
    if (clientsData && clientsData.length > 0) {
      for (const row of clientsData as ClientRow[]) {
        const local = await db.clients.get(row.id);
        if (!local || new Date(row.updated_at) > new Date(local.updatedAt)) {
          await db.clients.put(rowToClient(row));
          clientsSynced++;
        }
      }
    }

    // Loans
    if (loansData && loansData.length > 0) {
      for (const row of loansData as LoanRow[]) {
        const local = await db.loans.get(row.id);
        if (!local || new Date(row.updated_at) > new Date(local.updatedAt)) {
          await db.loans.put(rowToLoan(row));
          loansSynced++;
        }
      }
    }

    // Installments
    if (installmentsData && installmentsData.length > 0) {
      for (const row of installmentsData as InstallmentRow[]) {
        const local = await db.installments.get(row.id);
        if (!local || new Date(row.updated_at) > new Date(local.updatedAt)) {
          await db.installments.put(rowToInstallment(row));
          installmentsSynced++;
        }
      }
    }

    // Payments
    if (paymentsData && paymentsData.length > 0) {
      for (const row of paymentsData as PaymentRow[]) {
        const local = await db.payments.get(row.id);
        if (!local || new Date(row.paid_at) > new Date(local.paidAt)) {
          await db.payments.put(rowToPayment(row));
          paymentsSynced++;
        }
      }
    }
  });

  return { 
    clients: clientsSynced, 
    loans: loansSynced, 
    installments: installmentsSynced, 
    payments: paymentsSynced 
  };
}
