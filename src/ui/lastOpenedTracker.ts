import { toLocalIsoDate } from "../lib/dates";

const KEY = "fla-mpm:lastOpenedDate";

/** Retorna la fecha ISO date (YYYY-MM-DD) de la última apertura registrada, o null. */
export function getLastOpenedDate(): string | null {
  return localStorage.getItem(KEY);
}

/** Guarda la fecha ISO date de hoy (en zona horaria local) como última apertura. */
export function markOpenedToday(reference: Date = new Date()): void {
  localStorage.setItem(KEY, toLocalIsoDate(reference));
}

/** true si es la primera apertura del día calendario actual local (o si nunca se abrió). */
export function isFirstOpenOfDay(reference: Date = new Date()): boolean {
  const lastOpened = getLastOpenedDate();
  const todayStr = toLocalIsoDate(reference);
  return lastOpened !== todayStr;
}
