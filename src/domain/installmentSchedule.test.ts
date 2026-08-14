import { describe, it, expect } from "vitest";
import { buildSchedule } from "./installmentSchedule";

describe("buildSchedule", () => {
  it("generates 4 weekly installments of exactly equal amounts (1000 at 20% = 1200 / 4 = 300)", () => {
    const installments = buildSchedule({
      loanId: "l1",
      principalCents: 100000, // 1000
      rate: 0.20,
      installmentCount: 4,
      frequency: "weekly",
      disbursedAt: "2024-01-01"
    });

    expect(installments.length).toBe(4);
    expect(installments[0].amountCents).toBe(30000);
    expect(installments[3].amountCents).toBe(30000);
    expect(installments[0].dueDate).toBe("2024-01-08"); // +7
    expect(installments[1].dueDate).toBe("2024-01-15"); // +14
    expect(installments[2].dueDate).toBe("2024-01-22"); // +21
    expect(installments[3].dueDate).toBe("2024-01-29"); // +28
  });

  it("generates 3 monthly installments, last absorbs remainder (500 at 15% = 575 / 3 = 191.666...)", () => {
    const installments = buildSchedule({
      loanId: "l1",
      principalCents: 50000,
      rate: 0.15,
      installmentCount: 3,
      frequency: "monthly",
      disbursedAt: "2024-01-01"
    });

    expect(installments.length).toBe(3);
    // Total cents = 50000 + 7500 = 57500
    // Base = floor(57500 / 3) = 19166
    expect(installments[0].amountCents).toBe(19166);
    expect(installments[1].amountCents).toBe(19166);
    expect(installments[2].amountCents).toBe(19168);
    expect(installments[0].dueDate).toBe("2024-01-31"); // +30 days
  });

  it("generates 1 monthly installment (pago único migrado)", () => {
    const installments = buildSchedule({
      loanId: "l1",
      principalCents: 100000,
      rate: 0.20,
      installmentCount: 1,
      frequency: "monthly",
      disbursedAt: "2024-01-01"
    });

    expect(installments.length).toBe(1);
    expect(installments[0].amountCents).toBe(120000);
    expect(installments[0].dueDate).toBe("2024-01-31");
  });

  it("uses biweekly frequency correctly (+15 days)", () => {
    const installments = buildSchedule({
      loanId: "l1",
      principalCents: 100000,
      rate: 0.20,
      installmentCount: 2,
      frequency: "biweekly",
      disbursedAt: "2024-01-01"
    });

    expect(installments[0].dueDate).toBe("2024-01-16");
    expect(installments[1].dueDate).toBe("2024-01-31");
  });

  it("throws RangeError if installmentCount is 0", () => {
    expect(() => buildSchedule({
      loanId: "l1",
      principalCents: 100000,
      rate: 0.20,
      installmentCount: 0,
      frequency: "monthly",
      disbursedAt: "2024-01-01"
    })).toThrowError(RangeError);
  });

  it("throws RangeError if installmentCount is negative", () => {
    expect(() => buildSchedule({
      loanId: "l1",
      principalCents: 100000,
      rate: 0.20,
      installmentCount: -1,
      frequency: "monthly",
      disbursedAt: "2024-01-01"
    })).toThrowError(RangeError);
  });

  it("throws RangeError if principalCents is 0", () => {
    expect(() => buildSchedule({
      loanId: "l1",
      principalCents: 0,
      rate: 0.20,
      installmentCount: 1,
      frequency: "monthly",
      disbursedAt: "2024-01-01"
    })).toThrowError(RangeError);
  });

  it("throws RangeError if principalCents is negative", () => {
    expect(() => buildSchedule({
      loanId: "l1",
      principalCents: -100,
      rate: 0.20,
      installmentCount: 1,
      frequency: "monthly",
      disbursedAt: "2024-01-01"
    })).toThrowError(RangeError);
  });

  it("initializes properties correctly", () => {
    const now = new Date("2024-02-01T12:00:00Z");
    const installments = buildSchedule({
      loanId: "l-uuid",
      principalCents: 10000,
      rate: 0.1,
      installmentCount: 1,
      frequency: "weekly",
      disbursedAt: "2024-01-01",
      now
    });

    const i = installments[0];
    expect(i.loanId).toBe("l-uuid");
    expect(i.index).toBe(1);
    expect(i.paidCents).toBe(0);
    expect(i.status).toBe("pending");
    expect(i.paidAt).toBeNull();
    expect(i.createdAt).toBe("2024-02-01T12:00:00.000Z");
    expect(i.updatedAt).toBe("2024-02-01T12:00:00.000Z");
    expect(typeof i.id).toBe("string");
  });
});
