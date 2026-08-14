import { describe, it, expect } from "vitest";
import { validateLoanInput, type LoanInput } from "./loanValidation";

describe("validateLoanInput", () => {
  const valid: LoanInput = {
    clientId: "c1",
    principalCents: 10000,
    rate: 0.2,
    installmentCount: 4,
    frequency: "weekly"
  };

  it("accepts valid input", () => {
    const res = validateLoanInput(valid);
    expect(res.ok).toBe(true);
    expect(res.errors).toEqual({});
  });

  it("rejects empty client", () => {
    const res = validateLoanInput({ ...valid, clientId: "" });
    expect(res.ok).toBe(false);
    expect(res.errors.clientId).toBeDefined();
  });

  it("rejects zero or negative principal", () => {
    let res = validateLoanInput({ ...valid, principalCents: 0 });
    expect(res.ok).toBe(false);
    expect(res.errors.principal).toBeDefined();

    res = validateLoanInput({ ...valid, principalCents: -100 });
    expect(res.ok).toBe(false);
  });

  it("rejects invalid rate", () => {
    let res = validateLoanInput({ ...valid, rate: 0 });
    expect(res.ok).toBe(false);
    res = validateLoanInput({ ...valid, rate: 1.1 });
    expect(res.ok).toBe(false);
  });

  it("rejects invalid installmentCount", () => {
    let res = validateLoanInput({ ...valid, installmentCount: 0 });
    expect(res.ok).toBe(false);
    expect(res.errors.installmentCount).toBe("Ingresa un número de cuotas válido (1-60).");

    res = validateLoanInput({ ...valid, installmentCount: 61 });
    expect(res.ok).toBe(false);

    res = validateLoanInput({ ...valid, installmentCount: 1.5 }); // not integer
    expect(res.ok).toBe(false);
  });

  it("rejects invalid frequency", () => {
    // @ts-ignore
    const res = validateLoanInput({ ...valid, frequency: "yearly" });
    expect(res.ok).toBe(false);
    expect(res.errors.frequency).toBeDefined();
  });
});
