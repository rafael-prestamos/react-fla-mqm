import { describe, it, expect } from "vitest";
import { isValidLoanTerm, assertValidLoanTerm } from "./loanTerm";

describe("loanTerm", () => {
  it("valida plazos dentro del rango", () => {
    expect(isValidLoanTerm(25)).toBe(true);
    expect(isValidLoanTerm(1)).toBe(true);
    expect(isValidLoanTerm(365)).toBe(true);
  });

  it("rechaza plazos fuera de rango o no enteros", () => {
    expect(isValidLoanTerm(0)).toBe(false);
    expect(isValidLoanTerm(366)).toBe(false);
    expect(isValidLoanTerm(15.5)).toBe(false);
    expect(isValidLoanTerm("30")).toBe(false);
  });

  it("lanza error si no es válido en assertValidLoanTerm", () => {
    expect(() => assertValidLoanTerm(999)).toThrowError(/Plazo inválido: debe ser un entero entre 1 y 365/);
    expect(() => assertValidLoanTerm(25)).not.toThrow();
  });
});
