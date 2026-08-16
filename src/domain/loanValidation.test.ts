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

  it('acepta interés 0 (sprint 7b-1) pero rechaza negativo o > 1', () => {
    const resultZero = validateLoanInput({
      clientId: "c1",
      principalCents: 100000,
      rate: 0,
      termDays: 30
    });
    expect(resultZero.ok).toBe(true);
    expect(resultZero.errors.rate).toBeUndefined();

    const resultNegative = validateLoanInput({
      clientId: "c1",
      principalCents: 100000,
      rate: -0.1,
      termDays: 30
    });
    expect(resultNegative.ok).toBe(false);
    expect(resultNegative.errors.rate).toBe("Ingresa un interés válido");

    const resultTooHigh = validateLoanInput({
      clientId: "c1",
      principalCents: 100000,
      rate: 1.5,
      termDays: 30
    });
    expect(resultTooHigh.ok).toBe(false);
    expect(resultTooHigh.errors.rate).toBe("Ingresa un interés válido");
  });

  it('acepta cualquier plazo entero en rango 1-365', () => {
    const result1 = validateLoanInput({
      clientId: "c1",
      principalCents: 100000,
      rate: 0.2,
      termDays: 60
    });
    expect(result1.ok).toBe(true);

    const result2 = validateLoanInput({
      clientId: "c1",
      principalCents: 100000,
      rate: 0.2,
      termDays: 1
    });
    expect(result2.ok).toBe(true);

    const result3 = validateLoanInput({
      clientId: "c1",
      principalCents: 100000,
      rate: 0.2,
      termDays: 365
    });
    expect(result3.ok).toBe(true);
  });

  it('rechaza plazo 0, 366 o no entero', () => {
    const result0 = validateLoanInput({
      clientId: "c1",
      principalCents: 100000,
      rate: 0.2,
      termDays: 0
    });
    expect(result0.ok).toBe(false);
    expect(result0.errors.termDays).toBe("Debe ser un número entero entre 1 y 365");

    const result366 = validateLoanInput({
      clientId: "c1",
      principalCents: 100000,
      rate: 0.2,
      termDays: 366
    });
    expect(result366.ok).toBe(false);
    expect(result366.errors.termDays).toBe("Debe ser un número entero entre 1 y 365");

    const resultFloat = validateLoanInput({
      clientId: "c1",
      principalCents: 100000,
      rate: 0.2,
      termDays: 15.5
    });
    expect(resultFloat.ok).toBe(false);
    expect(resultFloat.errors.termDays).toBe("Debe ser un número entero entre 1 y 365");
  });
});
