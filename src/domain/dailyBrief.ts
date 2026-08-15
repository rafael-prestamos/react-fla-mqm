import { formatSoles } from "../lib/money";

export interface DailyBriefInput {
  dueTodayCount: number;
  overdueCount: number;
  totalOwedCents: number;
}

/**
 * Extract the numeric part of the formatted money amount, assuming the prefix 'S/ '
 * @param formattedString - For example: "S/ 1,200.00"
 * @returns The numeric string, e.g. "1,200.00"
 */
function extractNumericPart(formattedString: string): string {
  return formattedString.replace("S/ ", "");
}

/** Compone el mensaje del brief para el toast. Devuelve null si no hay nada que reportar. */
export function buildDailyBriefMessage(input: DailyBriefInput): string | null {
  const { dueTodayCount, overdueCount, totalOwedCents } = input;
  
  if (dueTodayCount === 0 && overdueCount === 0) {
    return null;
  }

  const amountStr = extractNumericPart(formatSoles(totalOwedCents));

  if (dueTodayCount > 0 && overdueCount === 0) {
    if (dueTodayCount === 1) {
      return `Hoy vence 1 préstamo por S/${amountStr}.`;
    }
    return `Hoy vencen ${dueTodayCount} préstamos por S/${amountStr}.`;
  }

  if (dueTodayCount === 0 && overdueCount > 0) {
    if (overdueCount === 1) {
      return `Tienes 1 préstamo atrasado por S/${amountStr}.`;
    }
    return `Tienes ${overdueCount} préstamos atrasados por S/${amountStr}.`;
  }

  // Ambos > 0
  const overdueNoun = overdueCount === 1 ? "atrasado" : "atrasados";
  return `Hoy: ${dueTodayCount} por cobrar y ${overdueCount} ${overdueNoun} — total S/${amountStr}.`;
}
