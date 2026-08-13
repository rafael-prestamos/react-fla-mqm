export interface LoanInput {
  clientId: string;
  principalCents: number;
  rate: number;
  termDays: number;
}

export type LoanErrors = Partial<Record<"clientId" | "principal" | "rate" | "termDays", string>>;

export function validateLoanInput(input: LoanInput): { ok: boolean; errors: LoanErrors } {
  const errors: LoanErrors = {};

  if (!input.clientId || input.clientId.trim() === "") {
    errors.clientId = "Selecciona un cliente";
  }

  if (!Number.isInteger(input.principalCents) || input.principalCents <= 0) {
    errors.principal = "Ingresa un capital válido";
  }

  if (input.rate <= 0 || input.rate > 1) {
    errors.rate = "Ingresa un interés válido";
  }

  if (![25, 28, 30].includes(input.termDays)) {
    errors.termDays = "Plazo inválido";
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
}
