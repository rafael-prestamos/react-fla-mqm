/**
 * Modelo de dominio de Fla MpM.
 * Convención: identificadores en inglés (camelCase); la UI y los comentarios en español.
 * Los montos SIEMPRE se guardan como enteros en céntimos (evita errores de coma flotante).
 */

/** Plazos permitidos del préstamo (en días). */
export type LoanTerm = 25 | 28 | 30;

/** Cómo pagó el cliente. */
export type PaymentMethod = "cash" | "digital"; // efectivo / virtual (Yape/Plin)

/** Qué tipo de pago registró. */
export type PaymentType = "full" | "interest" | "partial"; // total / solo interés (renovación) / abono

/** Clasificación automática del cliente según su mayor atraso. */
export type ClientRating = "good" | "slow" | "bad"; // buen pagador / se demora / mal pagador

export interface Client {
  id: string;
  dni: string;
  name: string;
  phone: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface Loan {
  id: string;
  clientId: string;
  principalCents: number; // capital prestado, en céntimos
  rate: number; // tasa por período (0.20 = 20%)
  termDays: LoanTerm;
  disbursedAt: string; // fecha de entrega (ISO, solo fecha)
  paidOffCents: number; // abonos acumulados, en céntimos
  renewalCount: number; // veces que renovó pagando solo interés
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  loanId: string;
  type: PaymentType;
  amountCents: number;
  method: PaymentMethod;
  daysLate: number; // atraso al momento del pago (para historial/clasificación)
  paidAt: string; // ISO
}
