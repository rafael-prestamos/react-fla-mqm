// Patrón: Build-time constant desde package.json.
// Sprint 6a-6
import pkg from "../../package.json";

export const APP_VERSION = pkg.version;
