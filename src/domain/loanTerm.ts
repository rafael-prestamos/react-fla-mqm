// Patrón: Domain Value Object con validación
// Regla de negocio: el plazo de un préstamo se expresa en días enteros entre 1 y 365
// Justificación: Fla necesita flexibilidad para plazos custom (sprint 6a-4)

export const LOAN_TERM_MIN = 1;
export const LOAN_TERM_MAX = 365;
export const LOAN_TERM_PRESETS = [25, 28, 30] as const;

export type LoanTerm = number;

export function isValidLoanTerm(value: unknown): value is LoanTerm {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= LOAN_TERM_MIN &&
    value <= LOAN_TERM_MAX
  );
}

export function assertValidLoanTerm(value: unknown): asserts value is LoanTerm {
  if (!isValidLoanTerm(value)) {
    throw new Error(
      `Plazo inválido: debe ser un entero entre ${LOAN_TERM_MIN} y ${LOAN_TERM_MAX}`
    );
  }
}
