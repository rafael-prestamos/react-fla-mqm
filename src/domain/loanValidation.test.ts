import { describe, it, expect } from 'vitest';
import { validateLoanInput } from './loanValidation';

describe('validateLoanInput', () => {
  it('should return ok for a valid input', () => {
    const result = validateLoanInput({
      clientId: "c1",
      principalCents: 100000,
      rate: 0.2,
      termDays: 30
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should return error if clientId is empty', () => {
    const result = validateLoanInput({
      clientId: "",
      principalCents: 100000,
      rate: 0.2,
      termDays: 30
    });
    expect(result.ok).toBe(false);
    expect(result.errors.clientId).toBe("Selecciona un cliente");
  });

  it('should return error if principalCents is 0 or negative', () => {
    const resultZero = validateLoanInput({
      clientId: "c1",
      principalCents: 0,
      rate: 0.2,
      termDays: 30
    });
    expect(resultZero.ok).toBe(false);
    expect(resultZero.errors.principal).toBe("Ingresa un capital válido");

    const resultNegative = validateLoanInput({
      clientId: "c1",
      principalCents: -100,
      rate: 0.2,
      termDays: 30
    });
    expect(resultNegative.ok).toBe(false);
    expect(resultNegative.errors.principal).toBe("Ingresa un capital válido");
  });

  it('should return error if rate is 0 or > 1', () => {
    const resultZero = validateLoanInput({
      clientId: "c1",
      principalCents: 100000,
      rate: 0,
      termDays: 30
    });
    expect(resultZero.ok).toBe(false);
    expect(resultZero.errors.rate).toBe("Ingresa un interés válido");

    const resultTooHigh = validateLoanInput({
      clientId: "c1",
      principalCents: 100000,
      rate: 1.5,
      termDays: 30
    });
    expect(resultTooHigh.ok).toBe(false);
    expect(resultTooHigh.errors.rate).toBe("Ingresa un interés válido");
  });

  it('should return error if termDays is not 25, 28, or 30', () => {
    const result = validateLoanInput({
      clientId: "c1",
      principalCents: 100000,
      rate: 0.2,
      termDays: 20
    });
    expect(result.ok).toBe(false);
    expect(result.errors.termDays).toBe("Plazo inválido");
  });
});
