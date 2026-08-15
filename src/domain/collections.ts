import type { Payment } from "../types/domain";

/**
 * Suma amountCents de todos los payments cuyo paidAt cae en el mes calendario
 * de `reference` (default: hoy). Incluye todos los tipos (full/interest/partial).
 */
export function collectedThisMonth(payments: Payment[], reference?: Date): number {
  const ref = reference ?? new Date();
  const year = ref.getFullYear();
  const month = ref.getMonth();

  return payments
    .filter((p) => {
      const d = new Date(p.paidAt);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((sum, p) => sum + p.amountCents, 0);
}
