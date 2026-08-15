/** Convierte un texto libre (ej. nombre de cliente) en un fragmento seguro para
    nombres de archivo: sin acentos, minúsculas, espacios convertidos a guiones. */
export function sanitizeFilename(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
