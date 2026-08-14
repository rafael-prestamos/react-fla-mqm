import type { InstallmentFrequency } from "../types/domain";

export interface LoanInput {
  clientId: string;
  principalCents: number;
  rate: number;
  installmentCount: number;
  frequency: InstallmentFrequency;
}

export type LoanErrors = Partial<Record<"clientId" | "principal" | "rate" | "installmentCount" | "frequency", string>>;

export function validateLoanInput(input: LoanInput): { ok: boolean; errors: LoanErrors } {
  const errors: LoanErrors = {};

  if (!input.clientId || input.clientId.trim() === "") {
    errors.clientId = "El cliente es obligatorio.";
  }

  if (!Number.isInteger(input.principalCents) || input.principalCents <= 0) {
    errors.principal = "El monto debe ser mayor a 0.";
  }

  if (input.rate <= 0 || input.rate > 1) {
    errors.rate = "La tasa debe ser mayor a 0 y menor o igual a 100%.";
  }

  if (!Number.isInteger(input.installmentCount) || input.installmentCount < 1 || input.installmentCount > 60) {
    errors.installmentCount = "Ingresa un número de cuotas válido (1-60).";
  }

  if (!["weekly", "biweekly", "monthly"].includes(input.frequency)) {
    errors.frequency = "Frecuencia inválida.";
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
}
