import type { Installment, InstallmentFrequency } from "../types/domain";
import { addDays } from "../lib/dates";
import { v4 as uuidv4 } from "uuid";

export function buildSchedule(input: {
  loanId: string;
  principalCents: number;
  rate: number;
  installmentCount: number;
  frequency: InstallmentFrequency;
  disbursedAt: string;
  now?: Date;
}): Installment[] {
  if (input.installmentCount < 1) {
    throw new RangeError("installmentCount debe ser >= 1");
  }
  if (input.principalCents <= 0) {
    throw new RangeError("principalCents debe ser > 0");
  }

  const totalCents = input.principalCents + Math.round(input.principalCents * input.rate);
  const baseInstallmentCents = Math.floor(totalCents / input.installmentCount);
  const lastInstallmentCents = totalCents - (baseInstallmentCents * (input.installmentCount - 1));

  const intervalDays = getIntervalDays(input.frequency);
  const nowStr = (input.now || new Date()).toISOString();

  const installments: Installment[] = [];
  let currentDueDate = input.disbursedAt;

  for (let i = 1; i <= input.installmentCount; i++) {
    currentDueDate = addDays(currentDueDate, intervalDays);
    const isLast = i === input.installmentCount;

    installments.push({
      id: uuidv4(),
      loanId: input.loanId,
      index: i,
      dueDate: currentDueDate,
      amountCents: isLast ? lastInstallmentCents : baseInstallmentCents,
      paidCents: 0,
      status: "pending",
      paidAt: null,
      createdAt: nowStr,
      updatedAt: nowStr,
    });
  }

  return installments;
}

function getIntervalDays(frequency: InstallmentFrequency): number {
  switch (frequency) {
    case "weekly": return 7;
    case "biweekly": return 15;
    case "monthly": return 30;
    default: return 30;
  }
}
