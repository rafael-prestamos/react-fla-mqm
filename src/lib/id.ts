import { v4 as uuidv4 } from "uuid";

/** Genera un id único (UUID v4) para entidades locales. */
export const newId = (): string => uuidv4();

/** Marca de tiempo ISO actual. */
export const nowIso = (): string => new Date().toISOString();
