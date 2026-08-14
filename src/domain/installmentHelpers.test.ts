import { describe, it, expect } from "vitest";
import { frequencyLabel, intervalDays, sortByIndex, nextPendingInstallment } from "./installmentHelpers";
import type { Installment } from "../types/domain";

describe("installmentHelpers", () => {
  it("frequencyLabel maps correctly", () => {
    expect(frequencyLabel("weekly")).toBe("Semanal");
    expect(frequencyLabel("biweekly")).toBe("Quincenal");
    expect(frequencyLabel("monthly")).toBe("Mensual");
  });

  it("intervalDays maps correctly", () => {
    expect(intervalDays("weekly")).toBe(7);
    expect(intervalDays("biweekly")).toBe(15);
    expect(intervalDays("monthly")).toBe(30);
  });

  it("sortByIndex sorts installments by index", () => {
    const insts = [
      { index: 3 } as Installment,
      { index: 1 } as Installment,
      { index: 2 } as Installment,
    ];
    const sorted = sortByIndex(insts);
    expect(sorted[0].index).toBe(1);
    expect(sorted[1].index).toBe(2);
    expect(sorted[2].index).toBe(3);
  });

  it("nextPendingInstallment returns null if all paid", () => {
    const insts = [
      { status: "paid" } as Installment,
      { status: "paid" } as Installment,
    ];
    expect(nextPendingInstallment(insts)).toBeNull();
  });

  it("nextPendingInstallment returns the pending one with earliest dueDate", () => {
    const insts = [
      { status: "paid", dueDate: "2024-01-01" } as Installment,
      { status: "pending", dueDate: "2024-02-01" } as Installment,
      { status: "pending", dueDate: "2024-01-15" } as Installment,
    ];
    expect(nextPendingInstallment(insts)?.dueDate).toBe("2024-01-15");
  });
});
