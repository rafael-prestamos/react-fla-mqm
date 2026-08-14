import type { Installment, InstallmentFrequency } from "../types/domain";

/** Label en español para la frecuencia. */
export function frequencyLabel(f: InstallmentFrequency): string {
  switch (f) {
    case "weekly": return "Semanal";
    case "biweekly": return "Quincenal";
    case "monthly": return "Mensual";
    default: return "Mensual";
  }
}

/** Días entre cuotas según la frecuencia. */
export function intervalDays(f: InstallmentFrequency): number {
  switch (f) {
    case "weekly": return 7;
    case "biweekly": return 15;
    case "monthly": return 30;
    default: return 30;
  }
}

/** Ordena cuotas por index ascendente. */
export function sortByIndex(installments: Installment[]): Installment[] {
  return [...installments].sort((a, b) => a.index - b.index);
}

/** Próxima cuota pendiente (menor dueDate) o null si todas pagadas. */
export function nextPendingInstallment(installments: Installment[]): Installment | null {
  const pending = installments.filter(i => i.status !== "paid");
  if (pending.length === 0) return null;
  return pending.reduce((prev, curr) => (curr.dueDate < prev.dueDate ? curr : prev));
}
