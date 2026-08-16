Antes de nada, si el proyecto está en pausa o cambia de agente, lee HANDOFF.md en la raíz.

# Fla MpM - Guía para IAs

**Proyecto y Estado:**
Gestor de préstamos "Fla MpM" para una prestamista (~8 clientes) que hoy lleva todo en hoja de cálculo. El objetivo es reemplazar el control manual por una PWA offline-first confiable e instalable.
Estado actual: Sprint 7a-6 completo (búsqueda en tab Préstamos) + Hotfix fix-sync-deadlock (dead-letter en outbox) + Hotfix pre-release-mora-off (mora desactivada) + Sprint sync-log (log de errores de sync en Ajustes) — 160 tests, build limpio, CI verde. Notificaciones push diarias (Sprint 5b-2) **desplegadas en producción** (migración 0009, Edge Function, secrets VAPID y `pg_cron` ya aplicados en Supabase). `develop` está lista para release a `main` — la discrepancia de mora quedó resuelta apagando el flag (ver "Regla de Mayor Riesgo" abajo). Ver `HANDOFF.md` para el detalle completo de sprints/PRs.


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
El interés por mora vive tras el flag `LATE_INTEREST_ENABLED` en `src/domain/loanRules.ts`. **El flag está en `false` desde el Hotfix pre-release-mora-off** — se desactivó explícitamente por instrucción de Giancarlo antes del release a producción, ya que la confirmación verbal de la clienta que exigía el Sprint 3 nunca quedó registrada por escrito. **No cambiar su comportamiento (ni a `true` ni a `false`) sin instrucción EXPLÍCITA de Giancarlo**; reactivar (`true`) solo con confirmación escrita de Fla.

**Reglas de Negocio (Resumen):**
- **Interés simple**: (capital × tasa), no es compuesto.
- **Plazos**: Libre entre 1 y 365 días enteros. Presets rápidos: 25, 28, 30 días (sprint 6a-4). Constantes: `LOAN_TERM_MIN`, `LOAN_TERM_MAX`, `LOAN_TERM_PRESETS` y funciones `isValidLoanTerm` / `assertValidLoanTerm` en `src/domain/loanTerm.ts`.

- **Tolerancia**: 7 días de gracia (atraso) sin penalidad.
- **Renovación**: Opción por "solo interés" (inicia un nuevo ciclo).
- **Abonos**: Abonos parciales reducen el saldo principal, cubriendo primero el interés pendiente. La renovación arranca un nuevo ciclo desde la fecha de vencimiento. Aplicar un pago es una transacción única (loan+payment+outbox).
- **Revert del modelo de cuotas**: Se intentó migrar a un modelo de "Cuotas" por confusión inicial. Se confirmó que Fla NO maneja cuotas; su modelo es siempre de pago único al final de plazos fijos. Se revirtió todo el dominio y la UI de cuotas, regresando al estado estable del Sprint 3b. Se conservaron las notificaciones Toast y mejoras en math logic.
- **Nombres de Clientes**: A partir del Sprint 6a-3, todos los nombres de cliente deben persistirse y mostrarse en UPPERCASE. Usar siempre el helper `normalizeClientName` (de `src/domain/clientName.ts`) antes de guardar o actualizar en Dexie.
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

**Reportes PDF — historial por cliente + reporte global (Sprint 6a-9):**
Dos PDFs nuevos, mismo patrón de dynamic import que arriba. `ClientHistoryPdf` (`src/pdf/ClientHistoryPdf.tsx`): historial completo por cliente (activos + pagados + anulados, con sección aparte de anulados con motivo); se descarga desde `ClientDetailSheet` junto al estado de cuenta existente (`StatementPdf` no se toca, sigue siendo lo que Fla envía al cliente). Lee directo de `db.loans`/`db.payments` (sin filtro de `cancelledAt`) porque los repos excluyen anulados por diseño. `GlobalReportPdf` (`src/pdf/GlobalReportPdf.tsx`): cartera activa, cobranza del mes por tipo, morosidad, resumen por cliente, histórico acumulado (sin anulados); se descarga desde `ProfileSheet` usando los repos tal cual. Helpers `isCurrentMonth` y `ratingLabel` en `src/pdf/formatters.ts`.

**Re-descargar comprobante de pago (Sprint 7a-4):**
Cada fila del historial de pagos en `ClientDetailSheet` (préstamos activos o pagados) tiene un ícono `FileDown` que regenera el mismo `PaymentReceiptPdf` que se genera al registrar el cobro — mismo componente, sin duplicar lógica. Como el saldo-después-de-ese-pago no se guarda por pago, `src/domain/loanBalanceHistory.ts` (`balanceCentsAfterPayment`, con tests) lo reconstruye reproduciendo la secuencia de pagos activos del préstamo desde su primer ciclo con `applyPayment`/`deriveLoan` tal cual existen — no se tocó ninguna regla de interés/mora/renovación.

**Saldo + botón "Cobrar" en card de préstamo (Sprint 7a-5):**
Cada card de préstamo en `ClientDetailSheet` muestra "Saldo: S/ X" (navy) / "Pagado" (verde) / "Anulado" (gris) según estado, vía `deriveLoan`. Botón "Cobrar" (solo en préstamos activos) llama a la nueva prop `onPayLoan(loanId)`, que `App.tsx` conecta directo a `setPayingId` — abre el mismo `PaymentSheet` que usan Hoy/Préstamos, sin duplicar el flujo de pago. Como ambos overlays comparten `z-index:50` (`.ovl`), se reordenó el JSX en `App.tsx` para que `PaymentSheet` se renderice después de `ClientDetailSheet` y no quede tapado al abrirse desde ahí.

**Búsqueda en tab Préstamos (Sprint 7a-6):**
Mismo patrón que la búsqueda ya existente en el tab Clientes: input `.inp` con estado `loanSearch`, filtrando por nombre de cliente vía `clientNameMatches` (case/acento-insensitive, ya usado en Clientes). `filteredActiveRows`/`filteredPaidRows` se derivan de `activeRows`/`paidRows` junto a los demás derivados de `rows`. Mensaje vacío dedicado ("No se encontraron préstamos...") cuando la búsqueda no da resultados, distinto del vacío de "aún no tienes préstamos". Solo presentación — no toca `loanRules.ts` ni ningún repo.

**Notificaciones push diarias (Sprint 5b-2):**
Web Push con VAPID (sin FCM). Tabla `push_subscriptions` (RLS por `owner_id`, migración `0009_push_subscriptions.sql`). `src/push/pushSubscription.ts` (`subscribeToPush`, `isPushSubscribed`) — no-op seguro sin Supabase/VAPID/soporte del browser. `public/sw-push.js` se importa desde el SW autogenerado vía `workbox.importScripts` en `vite.config.ts` (no reemplaza el SW de Workbox, se le agrega). Opt-in: `PushPermissionModal` al primer login (una vez, flag en `localStorage`) + toggle en `SettingsSheet`. Edge Function `supabase/functions/daily-push/index.ts` (Deno, invocada por `pg_cron` a las 7am hora Perú) calcula cobros del día por owner y envía el push; limpia suscripciones vencidas (410). La lógica del mensaje está duplicada a propósito entre esta Edge Function y `src/domain/dailyBrief.ts` (runtimes distintos, sin código compartido). **Deploy completado** (migración 0009, Edge Function, secrets VAPID y `pg_cron` aplicados en Supabase) — checklist de referencia en `docs/DEPLOY_PUSH.md`.

**Assets y Branding (Sprint 6a-1 + Sprint 7a-3 + Sprint 7a-3b):**
El logo principal se renderiza a través del componente `<BrandLogo />` (`src/components/brand/BrandLogo.tsx`). Los assets crudos viven en `src/assets/branding` y los derivados (favicons, PWA icons, etc.) en `public/` y `src/assets/logo.png`. Para los PDFs (`@react-pdf/renderer`), se usa `src/assets/logo-pdf.png` (también en `public/logo-pdf.png`): versión procesada con borde blanco siguiendo el contorno del alpha (3px, MaxFilter dilation) y drop-shadow sutil (offset 0,2px / blur 4px / opacity 28%). Generado por `scripts/process-logo.py` (Python 3 + Pillow). Los 4 PDF components (`PaymentReceiptPdf`, `StatementPdf`, `ClientHistoryPdf`, `GlobalReportPdf`) usan `import logoPdfUrl from "../assets/logo-pdf.png"` a 64×64px sin `View` wrapper crema.

**Header Hoy (Sprint 7a-1 + fix 7a-1b):**
Cambio solo de presentación en el header navy de la pestaña Hoy (`App.tsx`): `<BrandLogo size={64} />` (antes 18px) y se eliminó el saludo ("Buen día · fecha · hora"). El texto "Debes cobrar hoy" (`.pf-cobranza-label`, 12px, 70% opacity) fue restaurado en 7a-1b — aparece justo encima del monto grande de cobro del día (`.pf-cobranza`). No toca el toast del brief diario ni los mini-cards "Vencen hoy"/"Atrasados".

**Login Screen (Sprint 7a-2 + fix 7a-2b):**
Rediseño visual completo de `src/auth/LoginScreen.tsx`. Fondo blanco `#ffffff`. Contenedor único `.login-card` (borde `rgba(31,64,106,0.18)`, `box-shadow: 0 2px 8px rgba(0,0,0,0.08)`, `border-radius: 12px`, `padding: 24px`) engloba logo + título + formulario. Logo `<img>` a 88px con drop-shadow en `.login-header` dentro del card; texto "Fla MpM" en navy debajo. `min-height: 100dvh` (sin `100vh` fallback) garantiza que no hay scroll en 375×667. Inputs: fondo blanco, borde navy sutil, focus ring navy, `border-radius: 8px`. Botón submit: `var(--accent)` caramelo `#D49A5D`, hover `#bf8748`, micro-animación active. `LoadingScreen`: mascota y texto en navy. Sin cambios en lógica de auth ni en persistencia de sesión Supabase.

**WhatsApp ubicuo (Sprint 6a-5):**
Botón WhatsApp disponible en 3 lugares: pestaña Hoy (`LoanRowItem`), pestaña Préstamos (`LoanCard`, solo activos) y `ClientDetailSheet` (por cada `!loan.isPaid`). Componente reutilizable: `WhatsappButton` (`src/components/WhatsappButton.tsx`). Lógica en `src/domain/whatsappReminder.ts` (`buildWhatsappUrl`, `buildReminderMessage`). Verde `#25D366` = excepción cromática documentada. Filtro: `!loan.isPaid`.


**CRUD editable y anulación (Sprint 6a-8):**
`clientsRepo`, `loansRepo` y `paymentsRepo` ofrecen `update`; Loan y Payment también ofrecen `cancel`. La anulación de préstamo es una cascada a pagos activos. Dexie v5 y `supabase/migrations/0008_soft_delete_and_edit.sql` agregan los campos de auditoría/soft delete. La UI vive en `ClientDetailSheet` con `Edit*Sheet` y `Cancel*Modal`.

**Restricciones de pagos (Hotfix 6a-8b):**
`paymentsRepo.update` solo acepta `method`; el monto se corrige anulando y re-registrando. `paymentsRepo.cancel` solo permite el último pago activo y reconstruye el estado del préstamo. La UI muestra Anular únicamente para ese último pago.

**Hotfix 6a-8c — Observaciones del cliente:**
1. **Editar préstamo con pagos:** `loansRepo.update()` lanza error si hay pagos activos. UI: botón Editar `disabled` con opacity 0.4 + tooltip. Handler en try/catch con `toast.error`.
2. **Editar desde tab Préstamos:** `LoanCard` tiene prop `onEdit` y botón Pencil (solo `!loan.isPaid`). Estado `editingLoanFromTab` en `App`. Tab Hoy (`LoanRowItem`) sin botón Editar.
3. **Interés en soles:** `NewLoanSheet` y `EditLoanSheet` piden "Interés (S/)" en vez de "%". `rate = interésCents / principalCents`. Hint de porcentaje debajo del input. `rate` sigue siendo decimal internamente.
4. **Fallback teclado MIUI:** `useKeyboardAwareInput` tiene estrategia dual — `visualViewport.resize` (primaria) + `focusin` con delay 300ms (fallback). Check usa `tagName` en vez de `instanceof Element`.

**Teclado móvil (Sprint 6a-7):**
`useKeyboardAwareInput` (`src/ui/useKeyboardAwareInput.ts`) escucha `visualViewport.resize` y centra el input/textarea/select enfocado dentro de su contenedor scrollable cuando se abre el teclado virtual. Se usa en NewLoanSheet, NewClientSheet, PaymentSheet, SettingsSheet y LoginScreen.

**Perfil (Sprint 6a-6):**
El avatar del header abre `ProfileSheet` desde cualquier pestaña. Consolida nombre del negocio, `APP_VERSION`, estado de sync (`useSync`), Ajustes y cierre de sesión confirmado (`useSession`). El flujo Ajustes cierra Perfil y abre el `SettingsSheet` existente; ya no hay acciones de Ajustes ni Cerrar sesión al final de Clientes.

**Dead-letter en outbox (Hotfix fix-sync-deadlock):**
`pushOutbox()` (`src/sync/outbox.ts`) ya no hace `break` ante el primer registro que falla — un registro con error quedaba bloqueando toda la cola para siempre. Cada fallo se loguea con `console.error("[SYNC ERROR]", {...})`, incrementa `retryCount` en el `OutboxOp` (Dexie v6, campos `retryCount?`/`failedAt?` en `src/db/database.ts`) y sigue con el siguiente registro. Al llegar a 5 reintentos, el registro se marca `failedAt` (dead-letter, sale de la cola activa vía `pendingOps()`) pero no se borra. `pushOutbox()` retorna `{ synced, errors, deadLettered, total }`; `SyncEngine.tsx` muestra un toast diferenciado cuando hay `deadLettered > 0`. No toca mappers ni `pull.ts`.

**Mora desactivada pre-release (Hotfix pre-release-mora-off):**
`LATE_INTEREST_ENABLED` en `src/domain/loanRules.ts` pasa de `true` a `false` por instrucción explícita de Giancarlo, para poder liberar `develop`→`main` sin depender de una confirmación de mora que nunca quedó registrada por escrito (ver "Regla de Mayor Riesgo" arriba). `computeLatePeriods()` ahora retorna siempre 0 — ningún préstamo acumula interés extra por atraso; el resto de las reglas (interés simple, tolerancia de 7 días, clasificación de cliente) no cambia. Se actualizaron las expectativas de `loanRules.test.ts`, `loanPayment.test.ts` y `loanBackfill.test.ts` que asumían el flag en `true`, dejando comentado el valor esperado si se reactiva a futuro.

**Log de sincronización en Ajustes (Sprint sync-log):**
`OutboxOp.lastError` (Dexie v7) guarda el mensaje del último error de Supabase; `pushOutbox()` lo escribe en cada fallo y lo limpia en cada éxito, sin tocar el resto de la lógica de push/pull. Nuevo `SyncLogSheet` (`src/components/settings/SyncLogSheet.tsx`, mismo patrón visual que `SettingsSheet`) lista los entries con `retryCount > 0` o `failedAt` (tabla, operación, `entityId` truncado, `lastError`, badge rojo "Descartado" si es dead-letter) con botones "Reintentar" individual y "Reintentar todos" — ambos usan `retryDeadLetter`/`retryAllDeadLetters` (nuevas en `outbox.ts`, solo resetean `retryCount`/`failedAt`/`lastError`) y disparan `forcePush()` de `useSync()` para reintentar de inmediato. Accesible desde `SettingsSheet` → botón "Log de sincronización" (deshabilitado + "Sin errores" si no hay entries con error; badge rojo con la cantidad si hay). `App.tsx` sigue el patrón cierra-actual-abre-siguiente ya usado entre Perfil/Ajustes.

**Nota de Flujo de Trabajo:**
Los cambios llegan al proyecto en forma de prompts. Tras cada cambio relevante en arquitectura, reglas de negocio o producto, hay que **mantener actualizados** `docs/DECISIONS.md`, `CLAUDE.md` y `GEMINI.md`. Estos archivos Markdown sirven además como handoff (documento de traspaso) para el próximo agente que interactúe con el código.
