/** Utilidades de dinero. Regla del proyecto: todo monto vive como entero en céntimos. */

/** Convierte soles (número con decimales) a céntimos enteros. */
export const toCents = (soles: number): number => {
  if (!Number.isFinite(soles)) return 0;
  return Math.round(soles * 100);
};

/** Convierte céntimos a soles (número). */
export const fromCents = (cents: number): number => cents / 100;

/** Formatea céntimos como "S/ 1,500.00" en formato peruano. */
export const formatSoles = (cents: number): string =>
  "S/ " +
  (cents / 100).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Formatea una tasa decimal (0.20 = 20%) como "20.00%", a 2 decimales. */
export const formatRatePercent = (rate: number): string => (rate * 100).toFixed(2) + "%";
