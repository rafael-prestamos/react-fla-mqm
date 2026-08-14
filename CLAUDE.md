# Fla MpM - Guía para IAs

**Proyecto y Estado:**
Gestor de préstamos "Fla MpM" para una prestamista (~8 clientes) que hoy lleva todo en hoja de cálculo. El objetivo es reemplazar el control manual por una PWA offline-first confiable e instalable.
Estado actual: Sprint 3b completo (sync bidireccional con Supabase usando last-write-wins y Sync UI). El siguiente paso es activar el interés por mora (Sprint 3c) o avanzar al Sprint 4 (Panel resumen, Sentry, backups).

**Stack y Arquitectura:**
- **Frontend**: React 18 + Vite (no Next.js) + TypeScript. PWA mediante vite-plugin-pwa.
- **Datos locales**: Dexie/IndexedDB, funciona como la fuente de verdad local.
- **Backend/Sync**: Supabase (Postgres) free tier. Autenticación via Email+Password + RLS.
- **Testing**: Vitest para tests de caracterización sobre lógica pura. A partir del Sprint 1, usar TDD (red-green-refactor) para nuevo código de dominio.
- **Patrones de Diseño**:
  - **Repository**: Por entidad para interactuar con Dexie.
  - **Outbox**: Para la sincronización (sync) a Supabase (last-write-wins).
  - Provider/Context y Domain/Pure Functions.

**Convenciones Obligatorias:**
- **TypeScript estricto** en todo el proyecto.
- **camelCase** para todas las variables, propiedades y funciones.
- **Inglés** para los nombres de identificadores (variables, funciones, archivos).
- **Español** para los comentarios, explicaciones y la Interfaz de Usuario (UI).
- Siempre nombrar los patrones de diseño usados en los comentarios o explicaciones.
- **Git**: Todo incremento nuevo empieza creando y cambiando a una rama `feature/sprint-...` desde `develop`. Commits mediante Conventional Commits en inglés.

**Invariantes Críticos (NO ROMPER):**
1. **Montos monetarios**: SIEMPRE se guardan y operan como enteros en céntimos (ej. $10.00 = 1000).
2. **Offline-first**: Ningún cambio debe romper el modo sin conexión.
3. **Modo solo-local**: La aplicación debe poder seguir corriendo 100% sin Supabase si es necesario.

**⚠️ Regla de Mayor Riesgo:**
El interés por mora vive tras el flag `LATE_INTEREST_ENABLED` en `src/domain/loanRules.ts`. Está **PENDIENTE** de confirmación verbal con la clienta antes de activarse en firme en el Sprint 3. **No cambiar su comportamiento** sin esa confirmación explícita.

**Reglas de Negocio (Resumen):**
- **Interés simple**: (capital × tasa), no es compuesto.
- **Plazos**: 25, 28 o 30 días.
- **Tolerancia**: 7 días de gracia (atraso) sin penalidad.
- **Renovación**: Opción por "solo interés" (inicia un nuevo ciclo).
- **Abonos**: Abonos parciales reducen el saldo principal, cubriendo primero el interés pendiente. La renovación arranca un nuevo ciclo desde la fecha de vencimiento. Aplicar un pago es una transacción única (loan+payment+outbox).
- **Revert del modelo de cuotas**: Se intentó migrar a un modelo de "Cuotas" por confusión inicial. Se confirmó que Fla NO maneja cuotas; su modelo es siempre de pago único al final de plazos fijos. Se revirtió todo el dominio y la UI de cuotas, regresando al estado estable del Sprint 3b. Se conservaron las notificaciones Toast y mejoras en math logic.
- **Clasificación del cliente**:
  - *Bueno*: al día.
  - *Se demora*: > 7 días de atraso.
  - *Mal pagador*: > 30 días de atraso (es **solo una advertencia**, no bloquea realizar nuevos préstamos).

**Mapa de Carpetas Principal:**
- `src/types`: Definiciones de tipos.
- `src/lib`: Utilidades y configuraciones (ej. supabase).
- `src/domain`: Lógica pura de negocio y reglas.
- `src/db`: Configuración de Dexie y base de datos local.
- `src/repositories`: Patrón repository para el acceso a datos.
- `src/sync`: Lógica de sincronización Outbox.
- `src/auth`: Autenticación y sesión.
- **Fuente de Verdad**: `docs/DECISIONS.md` es la documentación canónica del proyecto.

**Nota de Flujo de Trabajo:**
Los cambios llegan al proyecto en forma de prompts. Tras cada cambio relevante en arquitectura, reglas de negocio o producto, hay que **mantener actualizados** `docs/DECISIONS.md`, `CLAUDE.md` y `GEMINI.md`. Estos archivos Markdown sirven además como handoff (documento de traspaso) para el próximo agente que interactúe con el código.
