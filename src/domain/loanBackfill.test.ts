import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateLoanBackfillInput, buildLoanBackfill, type LoanBackfillInput } from './loanBackfill';

describe('loanBackfill', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('buildLoanBackfill', () => {
    it('1. Sin renovaciones, sin abonos previos, al día', () => {
      const refDate = new Date("2025-02-05T00:00:00Z");
      const input: LoanBackfillInput = {
        clientId: "c1",
        principalCents: 100000,
        rate: 0.2,
        termDays: 30,
        lastCycleStart: "2025-01-20",
        renewalCount: 0,
        outstandingBalanceCents: 120000,
        reference: refDate
      };
      
      const { loan, syntheticPayment } = buildLoanBackfill(input, refDate);
      expect(loan.paidOffCents).toBe(0);
      expect(loan.renewalCount).toBe(0);
      expect(loan.disbursedAt).toBe("2025-01-20");
      expect(syntheticPayment).toBeNull();
    });

    it('2. Sin renovaciones, con abonos previos', () => {
      const refDate = new Date("2025-02-05T00:00:00Z");
      const input: LoanBackfillInput = {
        clientId: "c1",
        principalCents: 100000,
        rate: 0.2,
        termDays: 30,
        lastCycleStart: "2025-01-20",
        renewalCount: 0,
        outstandingBalanceCents: 90000,
        reference: refDate
      };
      
      const { loan, syntheticPayment } = buildLoanBackfill(input, refDate);
      expect(loan.paidOffCents).toBe(30000);
      expect(syntheticPayment?.amountCents).toBe(30000);
      expect(syntheticPayment?.type).toBe("partial");
    });

    it('3. Con 2 renovaciones', () => {
      const refDate = new Date("2025-02-05T00:00:00Z");
      const input: LoanBackfillInput = {
        clientId: "c1",
        principalCents: 100000,
        rate: 0.2,
        termDays: 30,
        lastCycleStart: "2025-01-20",
        renewalCount: 2,
        outstandingBalanceCents: 120000,
        reference: refDate
      };
      
      const { loan } = buildLoanBackfill(input, refDate);
      expect(loan.renewalCount).toBe(2);
      expect(loan.disbursedAt).toBe("2025-01-20");
    });

    it('4. Atraso 10 días (LATE_INTEREST_ENABLED=false: sin recargo de mora)', () => {
      const refDate = new Date("2025-02-05T00:00:00Z");
      // termDays: 30. dueDate = lastCycleStart + 30.
      // diffDays(refDate, dueDate) = 10.
      // refDate is Feb 5, 2025. 10 days before is Jan 26, 2025 (dueDate).
      // lastCycleStart = Jan 26 - 30 days = Dec 27, 2024.
      const input: LoanBackfillInput = {
        clientId: "c1",
        principalCents: 100000,
        rate: 0.2,
        termDays: 30,
        lastCycleStart: "2024-12-27",
        renewalCount: 0,
        // debt = 100000 + 20000 (interest) = 120000 (mora desactivada pre-release,
        // sería +20000 de mora extra = 140000 si LATE_INTEREST_ENABLED volviera a true).
        outstandingBalanceCents: 120000,
        reference: refDate
      };

      const { loan, syntheticPayment } = buildLoanBackfill(input, refDate);
      expect(loan.paidOffCents).toBe(0);
      expect(syntheticPayment).toBeNull();

      const inputPartial: LoanBackfillInput = { ...input, outstandingBalanceCents: 80000 };
      const resPartial = buildLoanBackfill(inputPartial, refDate);
      expect(resPartial.loan.paidOffCents).toBe(40000);
      expect(resPartial.syntheticPayment?.amountCents).toBe(40000);
    });
  });

  describe('validateLoanBackfillInput', () => {
    it('5. Validación — outstanding excede deuda', () => {
      const refDate = new Date("2025-02-05T00:00:00Z");
      const input: LoanBackfillInput = {
        clientId: "c1",
        principalCents: 100000,
        rate: 0.2,
        termDays: 30,
        lastCycleStart: "2025-01-20",
        renewalCount: 0,
        outstandingBalanceCents: 200000, // deuda es 120000
        reference: refDate
      };
      
      const { ok, errors } = validateLoanBackfillInput(input);
      expect(ok).toBe(false);
      expect(errors.outstandingBalance).toBe("El saldo pendiente excede la deuda calculada");
    });

    it('5b. Acepta interés 0 (sprint 7b-1)', () => {
      const refDate = new Date("2025-02-05T00:00:00Z");
      const input: LoanBackfillInput = {
        clientId: "c1",
        principalCents: 100000,
        rate: 0,
        termDays: 30,
        lastCycleStart: "2025-01-20",
        renewalCount: 0,
        outstandingBalanceCents: 100000, // deuda sin interés = capital
        reference: refDate
      };

      const { ok, errors } = validateLoanBackfillInput(input);
      expect(ok).toBe(true);
      expect(errors.rate).toBeUndefined();
    });

    it('6. Validación — fecha futura', () => {
      const refDate = new Date("2025-02-05T00:00:00Z");
      const input: LoanBackfillInput = {
        clientId: "c1",
        principalCents: 100000,
        rate: 0.2,
        termDays: 30,
        lastCycleStart: "2025-12-31",
        renewalCount: 0,
        outstandingBalanceCents: 120000,
        reference: refDate
      };
      
      const { ok, errors } = validateLoanBackfillInput(input);
      expect(ok).toBe(false);
      expect(errors.lastCycleStart).toBe("La fecha no puede ser futura");
    });

    it('7. Validación — inputs inválidos triviales', () => {
      const refDate = new Date("2025-02-05T00:00:00Z");
      const input: LoanBackfillInput = {
        clientId: "",
        principalCents: 0,
        rate: 1.5,
        termDays: 400 as any,

        lastCycleStart: "2025-01-20",
        renewalCount: -1,
        outstandingBalanceCents: 0,
        reference: refDate
      };
      
      const { ok, errors } = validateLoanBackfillInput(input);
      expect(ok).toBe(false);
      expect(errors.clientId).toBe("Selecciona un cliente");
      expect(errors.principal).toBe("Ingresa un capital válido");
      expect(errors.rate).toBe("Ingresa un interés válido");
      expect(errors.termDays).toBe("Debe ser un número entero entre 1 y 365");

      expect(errors.renewalCount).toBe("Número de renovaciones inválido");
      expect(errors.outstandingBalance).toBe("Saldo pendiente inválido");
    });
  });
});
