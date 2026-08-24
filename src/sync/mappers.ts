import type { Client, Loan, Payment, LoanTerm, BusinessSettings } from "../types/domain";
import { isValidLoanTerm } from "../domain/loanTerm";

export interface ClientRow {
  id: string;
  owner_id: string;
  dni: string;
  name: string;
  phone: string;
  rating: "good" | "slow" | "bad";
  max_days_late_historical: number;
  created_at: string;
  updated_at: string;
  edited_at?: string | null;
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
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  edited_at?: string | null;
  renewed_from_loan_id?: string | null; // Sprint 7d-1
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
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  edited_at?: string | null;
}

export function clientToRow(c: Client): Omit<ClientRow, "owner_id"> {
  return {
    id: c.id,
    dni: c.dni,
    name: c.name,
    phone: c.phone,
    rating: c.rating,
    max_days_late_historical: c.maxDaysLateHistorical,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    edited_at: c.editedAt ?? null,
  };
}

export function rowToClient(r: ClientRow): Client {
  return {
    id: r.id,
    dni: r.dni,
    name: r.name,
    phone: r.phone,
    rating: r.rating,
    maxDaysLateHistorical: r.max_days_late_historical,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    editedAt: r.edited_at ?? null,
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
    cancelled_at: l.cancelledAt ?? null,
    cancel_reason: l.cancelReason ?? null,
    edited_at: l.editedAt ?? null,
    renewed_from_loan_id: l.renewedFromLoanId ?? null,
  };
}

export function rowToLoan(r: LoanRow): Loan {
  if (!isValidLoanTerm(r.term_days)) {
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
    cancelledAt: r.cancelled_at ?? null,
    cancelReason: r.cancel_reason ?? null,
    editedAt: r.edited_at ?? null,
    renewedFromLoanId: r.renewed_from_loan_id ?? null,
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
    cancelled_at: p.cancelledAt ?? null,
    cancel_reason: p.cancelReason ?? null,
    edited_at: p.editedAt ?? null,
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
    cancelledAt: r.cancelled_at ?? null,
    cancelReason: r.cancel_reason ?? null,
    editedAt: r.edited_at ?? null,
  };
}

export interface SettingsRow {
  id: string;
  owner_id: string;
  business_name: string;
  phone: string;
  yape: string;
  yape_holder: string;
  bcp_soles: string;
  bcp_soles_holder: string;
  bcp_interbank: string;
  bcp_interbank_holder: string;
  updated_at: string;
}

export function settingsToRow(s: BusinessSettings): Omit<SettingsRow, "owner_id"> {
  return {
    id: s.id,
    business_name: s.businessName,
    phone: s.phone,
    yape: s.yape,
    yape_holder: s.yapeHolder,
    bcp_soles: s.bcpSoles,
    bcp_soles_holder: s.bcpSolesHolder,
    bcp_interbank: s.bcpInterbank,
    bcp_interbank_holder: s.bcpInterbankHolder,
    updated_at: s.updatedAt,
  };
}

export function rowToSettings(r: SettingsRow): BusinessSettings {
  return {
    id: r.id,
    businessName: r.business_name,
    phone: r.phone,
    yape: r.yape,
    yapeHolder: r.yape_holder,
    bcpSoles: r.bcp_soles,
    bcpSolesHolder: r.bcp_soles_holder,
    bcpInterbank: r.bcp_interbank,
    bcpInterbankHolder: r.bcp_interbank_holder,
    updatedAt: r.updated_at,
  };
}
