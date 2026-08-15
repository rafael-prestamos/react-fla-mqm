/** Formateo de textos en español para los PDFs (comprobantes y estados de cuenta). */

import type { PaymentMethod, PaymentType } from "../types/domain";

export const paymentTypeLabel = (t: PaymentType): string => {
  switch (t) {
    case "full":
      return "Pago total";
    case "interest":
      return "Solo interés (renovación)";
    case "partial":
      return "Abono parcial";
  }
};

export const paymentMethodLabel = (m: PaymentMethod): string =>
  m === "cash" ? "Efectivo" : "Yape/Plin";

/** "14 de agosto de 2026" */
export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" });

/** "14 de agosto de 2026, 3:45 p.m." */
export const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  const timePart = date
    .toLocaleTimeString("es-PE", { hour: "numeric", minute: "2-digit", hour12: true })
    .replace(/([ap])\.?\s?m\.?/i, (_m, letter: string) => `${letter.toLowerCase()}.m.`);
  return `${formatDate(iso)}, ${timePart}`;
};
