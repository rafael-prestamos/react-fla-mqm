Antes de nada, si el proyecto está en pausa o cambia de agente, lee HANDOFF.md en la raíz.

# Fla MpM - Guía para IAs

**Proyecto y Estado:**
Gestor de préstamos "Fla MpM" para una prestamista (~8 clientes) que hoy lleva todo en hoja de cálculo. El objetivo es reemplazar el control manual por una PWA offline-first confiable e instalable.
Estado actual: Sprint 6a-5 completo (WhatsApp ubicuo: Hoy + Detalle Cliente + tab Préstamos). El siguiente paso es notificaciones push (Sprint 5b-2).


**Stack y Arquitectura:**
- **Frontend**: React 18 + Vite (no Next.js) + TypeScript. PWA mediante vite-plugin-pwa.
- **Datos locales**: Dexie/IndexedDB, funciona como la fuente de verdad local.
- **Backend/Sync**: Supabase (Postgres) free tier. Autenticación via Email+Password + RLS.
- **Testing**: Vitest para tests de caracterización sobre lógica pura. A partir del Sprint 1, usar TDD (red-green-refactor) para nuevo código de dominio.
- **Patrones de Diseño**:
  - **Repository**: Por entidad para interactuar con Dexie.
  - **Outbox**: Para la sincronización (sync) a Supabase (last-write-wins).
  - **Design Tokens**: Para colores de estado (`src/config/theme.ts` y `--color-status-*` en CSS).
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
- **Plazos**: Libre entre 1 y 365 días enteros. Presets rápidos: 25, 28, 30 días (sprint 6a-4). Validación via `isValidLoanTerm` / `assertValidLoanTerm` en `src/domain/loanTerm.ts`.

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
- `src/config`: Defaults de configuración (ej. datos del negocio para PDFs).
- `src/domain`: Lógica pura de negocio y reglas.
- `src/db`: Configuración de Dexie y base de datos local.
- `src/repositories`: Patrón repository para el acceso a datos.
- `src/sync`: Lógica de sincronización Outbox.
- `src/auth`: Autenticación y sesión.
- `src/pdf`: Componentes de PDF (`@react-pdf/renderer`) y sus formatters — siempre importados dinámicamente desde el punto de uso.
- **Fuente de Verdad principal**: `docs/DECISIONS.md`.
- **Historias de Usuario e Invariantes**: `docs/REQUIREMENTS.md`.
- **Arquitectura y Diagramas**: `docs/ARCHITECTURE.md`.
- **Diccionario de Datos**: `docs/DATA_MODEL.md`.

**Settings del negocio (Sprint 4c-2a):**
Modelo singleton (`BusinessSettings`, `id: "singleton"`) en Dexie v3 (tabla `settings`) y Supabase (`supabase/migrations/0006_settings.sql`, RLS por `owner_id`). Defaults reales de Fla en `src/config/business.ts`. Bootstrap en `SessionContext`: **pull primero, `ensureSettings()` después** — así no se pisan settings ya sincronizados desde otro dispositivo. Editable en pantalla de Ajustes (`SettingsSheet`, accesible desde la pestaña Clientes). Ver detalle en `docs/DECISIONS.md`.

**PDFs de comprobantes y estado de cuenta (Sprint 4c-2b):**
`@react-pdf/renderer` **siempre** vía dynamic `import()` en el momento de la descarga (nunca import estático top-level fuera de `src/pdf/*`) — evita engordar el bundle inicial (~1.26MB queda en un chunk lazy aparte). Comprobante de pago (`PaymentReceiptPdf`) se descarga desde el estado "pago-registrado" de `PaymentSheet`; estado de cuenta (`StatementPdf`) desde `ClientDetailSheet`. Ambos usan `settingsRepo.get()` para los datos del negocio. Ver detalle en `docs/DECISIONS.md`.

**Assets y Branding (Sprint 6a-1):**
El logo principal se renderiza a través del componente `<BrandLogo />` (`src/components/brand/BrandLogo.tsx`). Los assets crudos viven en `src/assets/branding` y los derivados (favicons, PWA icons, etc.) en `public/` y `src/assets/logo.png`.

**WhatsApp ubicuo (Sprint 6a-5):**
Botón WhatsApp disponible en 3 lugares: pestaña Hoy (`LoanRowItem`), pestaña Préstamos (`LoanCard`, solo activos) y `ClientDetailSheet` (por cada `!loan.isPaid`). Componente reutilizable: `WhatsappButton` (`src/components/WhatsappButton.tsx`). Lógica de mensaje en `src/domain/whatsappReminder.ts` (`buildWhatsappUrl`, `buildReminderMessage`). Verde `#25D366` es excepción cromática documentada (brand WhatsApp). Filtro: `!loan.isPaid`.


**CRUD editable y anulación (Sprint 6a-8):**
`clientsRepo`, `loansRepo` y `paymentsRepo` ofrecen `update`; Loan y Payment también ofrecen `cancel`. La anulación de préstamo es una cascada a pagos activos. Dexie v5 y `supabase/migrations/0008_soft_delete_and_edit.sql` agregan los campos de auditoría/soft delete. La UI vive en `ClientDetailSheet` con `Edit*Sheet` y `Cancel*Modal`.

**Teclado móvil (Sprint 6a-7):**
`useKeyboardAwareInput` (`src/ui/useKeyboardAwareInput.ts`) escucha `visualViewport.resize` y centra el input/textarea/select enfocado dentro de su contenedor scrollable cuando se abre el teclado virtual. Se usa en NewLoanSheet, NewClientSheet, PaymentSheet, SettingsSheet y LoginScreen.

**Perfil (Sprint 6a-6):**
El avatar del header abre `ProfileSheet` desde cualquier pestaña. Consolida nombre del negocio, `APP_VERSION`, estado de sync (`useSync`), Ajustes y cierre de sesión confirmado (`useSession`). El flujo Ajustes cierra Perfil y abre el `SettingsSheet` existente; ya no hay acciones de Ajustes ni Cerrar sesión al final de Clientes.

**Nota de Flujo de Trabajo:**
Los cambios llegan al proyecto en forma de prompts. Tras cada cambio relevante en arquitectura, reglas de negocio o producto, hay que **mantener actualizados** `docs/DECISIONS.md`, `CLAUDE.md` y `GEMINI.md`. Estos archivos Markdown sirven además como handoff (documento de traspaso) para el próximo agente que interactúe con el código.
