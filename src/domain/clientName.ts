// Patrón: Domain Value Object helpers
// Regla de negocio: nombres de cliente se persisten y muestran en UPPERCASE
// Justificación: coherencia visual entre UI, PDFs y WhatsApp (feedback Fla, sprint 6a-3)

/**
 * Normaliza un nombre a la forma canónica (UPPERCASE, sin espacios extras).
 * - Colapsa espacios múltiples a uno
 * - Trim
 * - toUpperCase (locale-aware para acentos ES)
 */
export function normalizeClientName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleUpperCase('es-PE');
}

/**
 * Compara dos nombres de cliente ignorando caps y acentos.
 * Útil para búsqueda case-insensitive.
 */
export function clientNameMatches(name: string, query: string): boolean {
  const strip = (s: string) =>
    s
      .toLocaleUpperCase('es-PE')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // quita diacríticos
  return strip(name).includes(strip(query));
}
