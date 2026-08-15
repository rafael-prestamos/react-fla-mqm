import type { BusinessSettings } from "../types/domain";
import { nowIso } from "../lib/id";

/** Datos por defecto de Fla (memoria del proyecto). El usuario puede editarlos
    en Ajustes; si nunca los edita, los PDFs usan estos. */
export const DEFAULT_BUSINESS: Omit<BusinessSettings, "updatedAt"> = {
  id: "singleton",
  businessName: "Fla",
  phone: "961655740",
  yape: "961655740",
  bcpSoles: "48018243654096",
  bcpInterbank: "00248011824365409622",
};

/** Fábrica que devuelve un objeto listo para persistir. */
export function makeDefaultSettings(): BusinessSettings {
  return { ...DEFAULT_BUSINESS, updatedAt: nowIso() };
}
