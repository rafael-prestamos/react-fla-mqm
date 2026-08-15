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
  { id: "c1", dni: "00000001", name: "Ana Martínez", phone: "987654321", rating: "good", maxDaysLateHistorical: 0 },
  { id: "c2", dni: "00000002", name: "Beto Sánchez", phone: "987654322", rating: "good", maxDaysLateHistorical: 0 },
  { id: "c3", dni: "00000003", name: "Carlos López", phone: "987654323", rating: "good", maxDaysLateHistorical: 0 },
  { id: "c4", dni: "00000004", name: "Diana Gómez", phone: "987654324", rating: "good", maxDaysLateHistorical: 0 },
  { id: "c5", dni: "00000005", name: "Elena Rojas", phone: "987654325", rating: "good", maxDaysLateHistorical: 0 },
  { id: "c6", dni: "00000006", name: "Fernando Díaz", phone: "987654326", rating: "good", maxDaysLateHistorical: 0 },
  { id: "c7", dni: "00000007", name: "Gabriela Ruiz", phone: "987654327", rating: "good", maxDaysLateHistorical: 0 },
  { id: "c8", dni: "00000008", name: "Hugo Vargas", phone: "987654328", rating: "good", maxDaysLateHistorical: 0 },
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
