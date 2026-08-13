/** Utilidades de fecha (trabajamos a nivel de día, sin horas). */

const DAY_MS = 86_400_000;

/** Fecha de hoy con la hora en cero. */
export const startOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Suma (o resta, con n negativo) días a una fecha. */
export const addDays = (date: Date, n: number): Date =>
  new Date(date.getTime() + n * DAY_MS);

/** Diferencia en días enteros entre a y b (a - b). */
export const diffDays = (a: Date, b: Date): number =>
  Math.floor((a.getTime() - b.getTime()) / DAY_MS);

/** "12 ago" en formato peruano corto. */
export const formatShort = (date: Date): string =>
  date.toLocaleDateString("es-PE", { day: "2-digit", month: "short" });

/** "jueves, 13 de agosto" en formato peruano largo. */
export const formatLong = (date: Date): string =>
  date.toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

/** Fecha ISO (solo día, YYYY-MM-DD). */
export const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);
