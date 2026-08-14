import type { Client, Loan, Payment, LoanTerm } from "../types/domain";

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
  term_days: number;
  disbursed_at: string;
  paid_off_cents: number;
  renewal_count: number;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: string;
  owner_id: string;
  loan_id: string;
  type: "full" | "interest" | "partial";
  amount_cents: number;
  method: "cash" | "digital";
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
    term_days: l.termDays,
    disbursed_at: l.disbursedAt,
    paid_off_cents: l.paidOffCents,
    renewal_count: l.renewalCount,
    is_paid: l.isPaid,
    created_at: l.createdAt,
    updated_at: l.updatedAt,
  };
}

export function rowToLoan(r: LoanRow): Loan {
  if (r.term_days !== 25 && r.term_days !== 28 && r.term_days !== 30) {
    throw new Error("term_days inválido en fila: " + r.id);
  }
  return {
    id: r.id,
    clientId: r.client_id,
    principalCents: r.principal_cents,
    rate: Number(r.rate),
    termDays: r.term_days as LoanTerm,
    disbursedAt: r.disbursed_at,
    paidOffCents: r.paid_off_cents,
    renewalCount: r.renewal_count,
    isPaid: r.is_paid,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function paymentToRow(p: Payment): Omit<PaymentRow, "owner_id"> {
  return {
    id: p.id,
    loan_id: p.loanId,
    type: p.type,
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
    type: r.type,
    amountCents: r.amount_cents,
    method: r.method,
    daysLate: r.days_late,
    paidAt: r.paid_at,
  };
}
