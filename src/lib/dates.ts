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

/** Fecha ISO (solo día, YYYY-MM-DD). Usa UTC. Para persistencia. */
export const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * Parsea un string "YYYY-MM-DD" (solo fecha, sin hora) como medianoche en zona LOCAL,
 * no UTC. `new Date("YYYY-MM-DD")` interpreta el string como UTC, lo que corre la fecha
 * un día hacia atrás al mostrarla en zonas horarias detrás de UTC (ej. Perú, UTC-5).
 * Usar siempre que se parsee un campo date-only como disbursedAt/lastCycleStart.
 * Tolera timestamps completos (toma solo los primeros 10 chars, "YYYY-MM-DD") por si
 * llega un disbursedAt legado guardado como ISO completo antes de este fix.
 */
export const parseLocalDate = (iso: string): Date => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** 
 * Fecha ISO en zona horaria local (YYYY-MM-DD). 
 * Usar para UI y lógicas de "día actual local" (ej. recordatorios). 
 */
export const toLocalIsoDate = (date: Date): string => {
  const yr = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const dy = String(date.getDate()).padStart(2, "0");
  return `${yr}-${mo}-${dy}`;
};
