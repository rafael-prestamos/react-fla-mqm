/** Utilidades de dinero. Regla del proyecto: todo monto vive como entero en céntimos. */

/** Convierte soles (número con decimales) a céntimos enteros. */
export const toCents = (soles: number): number => Math.round(soles * 100);

/** Convierte céntimos a soles (número). */
export const fromCents = (cents: number): number => cents / 100;

/** Formatea céntimos como "S/ 1,500.00" en formato peruano. */
export const formatSoles = (cents: number): string =>
  "S/ " +
  (cents / 100).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
