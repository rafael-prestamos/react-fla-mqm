/**
 * Datos semilla (los mismos del prototipo, ahora con el modelo en inglés).
 * Sprint 0: la UI corre sobre estos datos en memoria. En Sprint 1 se reemplazan
 * por los repositories (Dexie + useLiveQuery) sin tocar la vista.
 */

import type { Client, Loan } from "./types/domain";
import { addDays, startOfToday, toIsoDate } from "./lib/dates";

type ClientSeed = Omit<Client, "createdAt" | "updatedAt">;
type LoanSeed = Omit<Loan, "createdAt" | "updatedAt">;

const baseClients: ClientSeed[] = [
  { id: "c1", dni: "41234567", name: "Shica Ramos", phone: "987654321" },
  { id: "c2", dni: "42345678", name: "Elvia Quispe", phone: "986543210" },
  { id: "c3", dni: "43456789", name: "Silvia Gutiérrez", phone: "985432109" },
  { id: "c4", dni: "44567890", name: "Sharon Valderrama", phone: "984321098" },
  { id: "c5", dni: "45678901", name: "Eli Gutiérrez", phone: "983210987" },
  { id: "c6", dni: "46789012", name: "Jack Torres", phone: "982109876" },
  { id: "c7", dni: "47890123", name: "Erickson Díaz", phone: "981098765" },
  { id: "c8", dni: "48901234", name: "Danie Pinedo", phone: "980987654" },
];

/** Helper: fecha de entrega `daysAgo` días atrás desde hoy. */
const disbursed = (daysAgo: number): string => toIsoDate(addDays(startOfToday(), -daysAgo));

const baseLoans: LoanSeed[] = [
  { id: "l1", clientId: "c1", principalCents: 1_500_000, rate: 0.2, termDays: 30, disbursedAt: disbursed(30), paidOffCents: 0, renewalCount: 0, isPaid: false },
  { id: "l2", clientId: "c2", principalCents: 100_000, rate: 0.2, termDays: 30, disbursedAt: disbursed(33), paidOffCents: 0, renewalCount: 1, isPaid: false },
  { id: "l3", clientId: "c3", principalCents: 50_000, rate: 0.2, termDays: 28, disbursedAt: disbursed(20), paidOffCents: 0, renewalCount: 0, isPaid: false },
  { id: "l4", clientId: "c4", principalCents: 100_000, rate: 0.2, termDays: 25, disbursedAt: disbursed(12), paidOffCents: 0, renewalCount: 0, isPaid: false },
  { id: "l5", clientId: "c5", principalCents: 20_000, rate: 0.2, termDays: 30, disbursedAt: disbursed(40), paidOffCents: 0, renewalCount: 0, isPaid: false },
  { id: "l6", clientId: "c6", principalCents: 90_000, rate: 0.2, termDays: 30, disbursedAt: disbursed(65), paidOffCents: 0, renewalCount: 0, isPaid: false },
  { id: "l7", clientId: "c7", principalCents: 80_000, rate: 0.2, termDays: 30, disbursedAt: disbursed(50), paidOffCents: 0, renewalCount: 0, isPaid: false },
  { id: "l8", clientId: "c8", principalCents: 200_000, rate: 0.2, termDays: 30, disbursedAt: disbursed(5), paidOffCents: 0, renewalCount: 0, isPaid: false },
];

const EPOCH = "2025-01-01T00:00:00.000Z";

export const seedClients: Client[] = baseClients.map((c) => ({ ...c, createdAt: EPOCH, updatedAt: EPOCH }));
export const seedLoans: Loan[] = baseLoans.map((l) => ({ ...l, createdAt: EPOCH, updatedAt: EPOCH }));
