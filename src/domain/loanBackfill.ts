import type { InstallmentFrequency, Loan, Installment, Payment } from "../types/domain";
import { buildSchedule } from "./installmentSchedule";
import { v4 as uuidv4 } from "uuid";

export interface LoanBackfillInput {
  clientId: string;
  principalCents: number;
  rate: number;
  installmentCount: number;
  frequency: InstallmentFrequency;
  disbursedAt: string;
  installments: Array<{
    index: number;
    paidCents: number;
    paidAt: string | null;
  }>;
  reference?: Date;
}

export type LoanBackfillErrors = Partial<Record<keyof LoanBackfillInput, string>>;

export function validateLoanBackfillInput(input: LoanBackfillInput): { ok: boolean; errors: LoanBackfillErrors } {
  const errors: LoanBackfillErrors = {};

  if (!input.clientId || input.clientId.trim() === "") {
    errors.clientId = "El cliente es obligatorio.";
  }
  if (!Number.isInteger(input.principalCents) || input.principalCents <= 0) {
    errors.principalCents = "El monto debe ser mayor a 0.";
  }
  if (input.rate <= 0 || input.rate > 1) {
    errors.rate = "La tasa debe ser válida (>0 y <=1).";
  }
  if (!Number.isInteger(input.installmentCount) || input.installmentCount < 1 || input.installmentCount > 60) {
    errors.installmentCount = "Número de cuotas inválido (1-60).";
  }
  if (!input.disbursedAt) {
    errors.disbursedAt = "La fecha de entrega es obligatoria.";
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

export function buildLoanBackfill(input: LoanBackfillInput, now?: Date): {
  loan: Loan;
  installments: Installment[];
  syntheticPayments: Payment[];
} {
  const reference = now || new Date();
  const nowStr = reference.toISOString();
  const loanId = uuidv4();

  const loan: Loan = {
    id: loanId,
    clientId: input.clientId,
    principalCents: input.principalCents,
    rate: input.rate,
    installmentCount: input.installmentCount,
    frequency: input.frequency,
    disbursedAt: input.disbursedAt,
    isPaid: false,
    createdAt: nowStr,
    updatedAt: nowStr
  };

  const schedule = buildSchedule({ ...input, loanId, now: reference });
  const syntheticPayments: Payment[] = [];

  for (const inst of schedule) {
    const inputInst = input.installments.find(i => i.index === inst.index);
    if (inputInst && inputInst.paidCents > 0) {
      if (inputInst.paidCents > inst.amountCents) {
        throw new RangeError(`Abono a cuota ${inst.index} excede su monto base.`);
      }

      inst.paidCents = inputInst.paidCents;
      if (inst.paidCents >= inst.amountCents) {
        inst.status = "paid";
        inst.paidAt = inputInst.paidAt || nowStr;
      }
      
      syntheticPayments.push({
        id: uuidv4(),
        loanId,
        installmentId: inst.id,
        amountCents: inputInst.paidCents,
        method: "cash",
        daysLate: 0,
        paidAt: inputInst.paidAt || nowStr
      });
    }
  }

  loan.isPaid = schedule.every(i => i.status === "paid");

  return { loan, installments: schedule, syntheticPayments };
}
