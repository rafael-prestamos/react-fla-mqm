/**
 * Modelo de dominio de Fla MpM.
 * Convención: identificadores en inglés (camelCase); la UI y los comentarios en español.
 * Los montos SIEMPRE se guardan como enteros en céntimos (evita errores de coma flotante).
 */

export type InstallmentFrequency = "weekly" | "biweekly" | "monthly";
export type PaymentMethod = "cash" | "digital";
export type ClientRating = "good" | "slow" | "bad";
export type InstallmentStatus = "pending" | "paid";

export interface Client {
  id: string;
  dni: string;
  name: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

export interface Loan {
  id: string;
  clientId: string;
  principalCents: number;         // capital prestado
  rate: number;                   // 0.20 = 20%; interés total sobre capital, distribuido en cuotas
  installmentCount: number;       // N cuotas, entero >= 1
  frequency: InstallmentFrequency;
  disbursedAt: string;            // ISO date (YYYY-MM-DD)
  isPaid: boolean;                // true cuando TODAS las cuotas están pagadas
  createdAt: string;
  updatedAt: string;
}

export interface Installment {
  id: string;
  loanId: string;
  index: number;                  // 1..installmentCount
  dueDate: string;                // ISO date
  amountCents: number;            // monto de la cuota (montos iguales; última absorbe redondeo)
  paidCents: number;              // acumulado abonado a esta cuota (para abonos parciales a cuota)
  status: InstallmentStatus;
  paidAt: string | null;          // ISO; se setea cuando status pasa a "paid"
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  loanId: string;
  installmentId: string;          // a qué cuota se aplicó
  amountCents: number;
  method: PaymentMethod;
  daysLate: number;               // atraso de la cuota al momento del pago
  paidAt: string;                 // ISO datetime
}
