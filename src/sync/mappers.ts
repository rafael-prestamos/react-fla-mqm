import type { Client, Loan, Payment, Installment, InstallmentFrequency, InstallmentStatus, PaymentMethod } from "../types/domain";

export interface ClientRow {
  id: string;
  owner_id: string;
  dni: string;
  name: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

export interface LoanRow {
  id: string;
  owner_id: string;
  client_id: string;
  principal_cents: number;
  rate: number;
  installment_count: number;
  frequency: string;
  disbursed_at: string;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
}

export interface InstallmentRow {
  id: string;
  owner_id: string;
  loan_id: string;
  index: number;
  due_date: string;
  amount_cents: number;
  paid_cents: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: string;
  owner_id: string;
  loan_id: string;
  installment_id: string;
  amount_cents: number;
  method: string;
  days_late: number;
  paid_at: string;
}

export function clientToRow(c: Client): Omit<ClientRow, "owner_id"> {
  return {
    id: c.id,
    dni: c.dni,
    name: c.name,
    phone: c.phone,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

export function rowToClient(r: ClientRow): Client {
  return {
    id: r.id,
    dni: r.dni,
    name: r.name,
    phone: r.phone,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function loanToRow(l: Loan): Omit<LoanRow, "owner_id"> {
  return {
    id: l.id,
    client_id: l.clientId,
    principal_cents: l.principalCents,
    rate: l.rate,
    installment_count: l.installmentCount,
    frequency: l.frequency,
    disbursed_at: l.disbursedAt,
    is_paid: l.isPaid,
    created_at: l.createdAt,
    updated_at: l.updatedAt,
  };
}

export function rowToLoan(r: LoanRow): Loan {
  return {
    id: r.id,
    clientId: r.client_id,
    principalCents: r.principal_cents,
    rate: Number(r.rate),
    installmentCount: r.installment_count,
    frequency: r.frequency as InstallmentFrequency,
    disbursedAt: r.disbursed_at,
    isPaid: r.is_paid,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function installmentToRow(i: Installment): Omit<InstallmentRow, "owner_id"> {
  return {
    id: i.id,
    loan_id: i.loanId,
    index: i.index,
    due_date: i.dueDate,
    amount_cents: i.amountCents,
    paid_cents: i.paidCents,
    status: i.status,
    paid_at: i.paidAt,
    created_at: i.createdAt,
    updated_at: i.updatedAt,
  };
}

export function rowToInstallment(r: InstallmentRow): Installment {
  return {
    id: r.id,
    loanId: r.loan_id,
    index: r.index,
    dueDate: r.due_date,
    amountCents: r.amount_cents,
    paidCents: r.paid_cents,
    status: r.status as InstallmentStatus,
    paidAt: r.paid_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function paymentToRow(p: Payment): Omit<PaymentRow, "owner_id"> {
  return {
    id: p.id,
    loan_id: p.loanId,
    installment_id: p.installmentId,
    amount_cents: p.amountCents,
    method: p.method,
    days_late: p.daysLate,
    paid_at: p.paidAt,
  };
}

export function rowToPayment(r: PaymentRow): Payment {
  return {
    id: r.id,
    loanId: r.loan_id,
    installmentId: r.installment_id,
    amountCents: r.amount_cents,
    method: r.method as PaymentMethod,
    daysLate: r.days_late,
    paidAt: r.paid_at,
  };
}
