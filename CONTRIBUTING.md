# Contribuyendo a Fla MpM

**Flujo de ramas (Git):**
- `main`: Rama de producción. Solo recibe merges, y cada merge a `main` dispara el despliegue automático (deploy) a Vercel.
- `develop`: Rama de integración principal. Pasa por integración continua (CI) mediante Vitest, pero no despliega a producción.
- `feature/sprint-<n><letra>-<slug>`: Toda nueva característica o incremento empieza creando una rama desde `develop` con esta nomenclatura (ej. `feature/sprint-1b-creacion-prestamos`).
  - Al completar la característica, se abre un Pull Request (PR) hacia `develop`.
  - Debe ser revisada y el CI debe pasar en verde para ser integrada (merged) en `develop`.
  - Al final del sprint, se hace merge de `develop` hacia `main` (Release).

**Convenciones de Commits:**
- Usamos **Conventional Commits**: `tipo: mensaje corto en imperativo`.
- Tipos comunes: `feat` (nueva característica), `fix` (corrección de error), `chore` (mantenimiento/configuración), `test` (pruebas), `ci` (configuración de integraciones), `docs` (documentación).
- El mensaje del commit va siempre en inglés.
- Ejemplo: `feat: implement loan derivation pure functions`
