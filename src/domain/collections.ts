import type { Payment } from "../types/domain";

export function collectedThisMonth(payments: Payment[], now: Date = new Date()): number {
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return payments.reduce((acc, p) => {
    const d = new Date(p.paidAt);
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      return acc + p.amountCents;
    }
    return acc;
  }, 0);
}
