import { clientsRepo } from "../repositories/clientsRepo";
import { loansRepo } from "../repositories/loansRepo";
import { paymentsRepo } from "../repositories/paymentsRepo";
import { deriveLoan, classifyByMaxDaysLate } from "../domain/loanRules";

/**
 * Recalcula el rating de todos los clientes basado en sus préstamos + pagos.
 * Se llama tras eventos que puedan cambiarlo (nuevo pago, nuevo préstamo, tick de reloj).
 * Idempotente: si nada cambió, no escribe.
 */
export async function recomputeAllRatings(reference?: Date): Promise<{ updated: number }> {
  const clients = await clientsRepo.all();
  const loans = await loansRepo.all();
  const payments = await paymentsRepo.all();
  const refDate = reference ?? new Date();
  
  let updated = 0;

  for (const client of clients) {
    const clientLoans = loans.filter((l) => l.clientId === client.id);
    const clientPayments = payments.filter((p) => clientLoans.some((l) => l.id === p.loanId));

    const fromLoans = clientLoans
      .filter((l) => !l.isPaid)
      .map((l) => deriveLoan(l, refDate).daysLate);
    
    const fromHistory = clientPayments.map((p) => p.daysLate);
    
    const currentMax = Math.max(0, ...fromLoans, ...fromHistory);
    const historicalMax = Math.max(client.maxDaysLateHistorical, currentMax);
    const rating = classifyByMaxDaysLate(historicalMax);

    if (client.rating !== rating || client.maxDaysLateHistorical !== historicalMax) {
      await clientsRepo.updateRating(client.id, rating, historicalMax);
      updated++;
    }
  }

  return { updated };
}
