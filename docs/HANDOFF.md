# Handoff: Fla MpM — post primer release develop→main

## Contexto proyecto

Gestor microcréditos PWA para Fla (Perú, ~8 clientes, creciendo hacia 20+). Dev: Giancarlo.
Stack: Vite+React+TS, Dexie/IndexedDB (v7), Supabase (auth+sync+RLS), react-pdf, vite-plugin-pwa, Vercel.
Ramas: `develop` y `main` **al día entre sí** (0 commits de diferencia en cualquier sentido) — primer release real a producción de esta sesión, tras 61+ commits de atraso de `main`.
Modelo dominio: préstamo pago único, plazo 1-365 días (presets 25/28/30), montos en céntimos.

## Modo de trabajo

- Español siempre (comunicación, UI, comentarios, docs)
- **Caveman**: respuestas ultra-concisas
- **Grill-me**: una pregunta a la vez con recomendación antes de generar prompt
- **Un prompt copy-paste por respuesta** para Antigravity/Claude Code
- **Prompts en un solo bloque de código markdown** — NO anidar triple backticks dentro del bloque (causa rendering roto; usar indentación o texto descriptivo para SQL/snippets internos)
- Docs paralelos: `docs/DECISIONS.md`, `CLAUDE.md`, `GEMINI.md` — actualizar en cada sprint
- Git: agente autoriza commit/push/merge feature→develop vía `gh` CLI
- **`main` NUNCA se toca por agente** — release a prod es paso manual deliberado (el release de esta sesión lo disparó Giancarlo)

## Sesión: post-release, problemas de producción + mejoras UX

Tras el primer release develop→main, aparecieron varios problemas reales en producción (reportados por o detectados en el uso de Fla). Esta sesión los resolvió uno por uno:

### 1. Sync bloqueada en el Xiaomi de Fla

`pushOutbox()` hacía `break` en el primer registro que fallaba, bloqueando toda la cola de sincronización para siempre — no era un problema de MIUI/Xiaomi como se sospechaba en un principio, sino lógica de la cola. El error de Supabase tampoco se logueaba, así que no había forma de diagnosticar qué había fallado.

- **PR #26** — Dead-letter en outbox: `pushOutbox()` ya no hace `break`; loguea el error, incrementa `retryCount` por registro, y al llegar a 5 reintentos marca `failedAt` (dead-letter, sale de la cola activa) sin bloquear a los demás. Dexie v6 (`retryCount?`/`failedAt?` en `OutboxOp`).
- **PR #28** — `OutboxOp.lastError` (Dexie v7) guarda el mensaje del último error; nueva pantalla `SyncLogSheet` en Ajustes lista los registros con error/dead-letter (tabla, operación, `entityId`, mensaje, badge "Descartado") con reintento individual o masivo. Útil para diagnóstico remoto sin necesitar USB/`chrome://inspect`.

### 2. CHECK constraint de Supabase desincronizado con el frontend

`loans.term_days` en Supabase tenía `check (term_days in (25, 28, 30))` desde la migración `0001_init.sql` (reafirmado en `0004_revert_installments.sql`). El frontend permite plazo libre 1-365 desde el sprint 6a-4, pero la constraint de la base nunca se actualizó — cualquier préstamo con un plazo fuera de {25,28,30} fallaba al sincronizar a Supabase (aunque se guardaba bien en local).

- **Fix aplicado manualmente** en el SQL Editor de Supabase (`ALTER TABLE loans DROP CONSTRAINT ... / ADD CONSTRAINT ... check (term_days between 1 and 365)` o equivalente). Ya aplicado y confirmado funcionando.
- **⚠️ Deuda pendiente:** este fix NO quedó capturado como archivo de migración en `supabase/migrations/` — quien reconstruya la base desde cero (nuevo entorno, disaster recovery) partiría de la constraint vieja (25/28/30) otra vez. Recomendado: crear una migración `0010_loans_term_days_1_365.sql` que documente el `ALTER TABLE` ya aplicado, para que el repo y la base real vuelvan a estar en sync.

### 3. Interés 0% no se podía guardar

Reportado: con interés 0 en "Nuevo préstamo", el botón no hacía nada, sin error visible. Había **3 copias distintas** de la misma validación de interés, y el primer fix solo corrigió 2:

- **PR #29** (sprint 7b-1) — `validateLoanInput`/`validateLoanBackfillInput` (`rate <= 0` → `rate < 0`) y el gate de guardado de `EditLoanSheet` (`interestCents <= 0` → `< 0`). También: `formatRatePercent` en `src/lib/money.ts` reemplaza los usos sueltos de `loan.rate * 100` (mostraban decimales largos sin redondear) por `(rate*100).toFixed(2)+"%"` en ~10 sitios (`App.tsx`, `EditLoanSheet`, `ClientDetailSheet`, `CancelLoanModal`, 3 PDFs).
- **PR #31** — la tercera copia se escapó: el `disabled` del botón "Registrar préstamo" en `NewLoanSheet` (`App.tsx`, dentro del componente inline) seguía en `interestCents <= 0`. Con el botón deshabilitado, el `onClick` nunca corría — por eso no había ningún error visible, `validateLoanInput` ni se llegaba a ejecutar. Fix: mismo cambio, `< 0`.
- **Aprendizaje:** al tocar una regla de validación, hacer grep amplio para encontrar TODAS sus copias — dominio (`validateLoanInput`), gates de guardado en sheets de edición, y `disabled` en botones de creación son 3 lugares distintos que pueden desincronizarse.

### 4. Bug de timezone en fechas de préstamo

`disbursedAt`/`lastCycleStart` son date-only (`"YYYY-MM-DD"`), pero se parseaban con `new Date(str)`, que JS interpreta como medianoche **UTC**. Mostrado luego con `formatShort`/`toLocaleDateString` (zona local del navegador, Perú UTC-5), la fecha corría un día hacia atrás. Esta era también la causa real del bug cosmético "12-jul. → 11-ago." (línea tachada) que un handoff anterior había dejado sin investigar.

- **PR #30** — Nuevo `parseLocalDate` (`src/lib/dates.ts`): parsea `YYYY-MM-DD` como medianoche local; tolera timestamps completos legados (toma los primeros 10 chars — necesario porque préstamos renovados guardaban `disbursedAt` como timestamp completo antes de este fix). Fix central en `deriveLoan` (`loanRules.ts`); todo lo que consume `d.disbursedDate`/`d.dueDate` queda corregido en cascada. Escrituras de `disbursedAt` (renovación, reconstrucción de recibos, préstamo nuevo, seed) pasan de `toIsoDate`/`.toISOString()` a `toLocalIsoDate`. **Siempre usar `parseLocalDate`, nunca `new Date()`, para parsear `disbursedAt`/`lastCycleStart`.**

### 5. Mora (LATE_INTEREST_ENABLED)

- **PR #27** (`fix/mora-off`) — `LATE_INTEREST_ENABLED = false` por instrucción explícita de Giancarlo antes del release: la confirmación verbal de Fla que el Sprint 3 exigía nunca quedó registrada por escrito. **No activar (`true`) sin confirmación escrita de Fla y nueva instrucción explícita de Giancarlo.**

## Estado actual

- **`main` actualizado** con todos los PRs hasta el #31 — primer release real a producción de este proyecto.
- **Tests:** 166/166. Build limpio. `tsc --noEmit` limpio.
- **Dexie:** versión 7 (`OutboxOp` con `retryCount`/`failedAt`/`lastError`, sprint fix-sync-deadlock + sync-log).
- **Deploy:** Vercel activo, Fla ya tiene la versión actualizada.
- **Sin PRs abiertos ni bloqueantes conocidos** al cierre de esta sesión.

## Estado de migraciones SQL

| Migración                     | Aplicada en Supabase |
| ------------------------------ | -------------------- |
| 0001_init                     | ✅                   |
| 0004_revert_installments      | ✅                   |
| 0005_client_rating            | ✅                   |
| 0006_settings                 | ✅                   |
| 0007_settings_account_holders | ✅                   |
| 0008_soft_delete_and_edit     | ✅                   |
| 0009_push_subscriptions       | ✅                   |

Todas las migraciones **del repo** están aplicadas. **Excepción no capturada como migración:** el `ALTER TABLE` de `loans_term_days_check` (ver punto 2 arriba) — aplicado directo en producción, pendiente de formalizar como `0010_...sql`.

## Deploy push notifications — COMPLETADO

Confirmado por Giancarlo. Checklist ejecutado (referencia completa en `docs/DEPLOY_PUSH.md`):

1. ✅ VAPID public key en variable de entorno Vercel (`VITE_VAPID_PUBLIC_KEY`)
2. ✅ VAPID private key como secret de la Edge Function en Supabase (`VAPID_PRIVATE_KEY`) — nunca en el repo
3. ✅ Migración 0009 aplicada en Supabase
4. ✅ `daily-push` Edge Function desplegada (`supabase functions deploy daily-push`)
5. ✅ Extensiones `pg_cron` + `pg_net` habilitadas en Supabase
6. ✅ Cron `0 12 * * *` UTC (= 7am hora Perú) programado

No queda ningún paso manual pendiente para este sprint.

## ⚠️ MORA (LATE_INTEREST_ENABLED) — desactivada, pendiente de confirmación

Flag en `src/domain/loanRules.ts`, **`false`** en código (sin mora: `computeLatePeriods()` retorna siempre 0, no corre interés extra sobre el capital).

Desactivada explícitamente antes del release por instrucción de Giancarlo (PR #27, `fix/mora-off`) — nunca quedó registrada una confirmación verbal real de Fla sobre la mora.

**NO ACTIVAR (`true`) sin confirmación escrita de Fla** — si Fla confirma la mora en el futuro, reactivar el flag es un cambio de negocio deliberado, no un hotfix; requiere instrucción EXPLÍCITA de Giancarlo y dejar constancia de la confirmación.

## Backlog priorizado

| #   | Tarea                                       | Estado                                                                                       |
| --- | -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Confirmar mora con Fla                       | Pendiente — `LATE_INTEREST_ENABLED=false`, no activar sin confirmación explícita de Fla + Giancarlo |
| 2   | Formalizar migración `loans_term_days_check` | Pendiente — el fix ya está aplicado en producción, falta el archivo `0010_...sql` en el repo   |
| 3   | Logo foto-fiel del perrito real              | Pendiente, solicitud explícita de Giancarlo cuando la traiga                                  |

## Learnings de esta sesión

- MIUI/Xiaomi no era el problema de sync — era lógica de `break` en el loop del outbox. No asumir que un bug "solo pasa en tal dispositivo" es necesariamente de plataforma; puede ser una cola que se traba con cualquier error.
- Los CHECK constraints de Supabase pueden quedar desincronizados si se amplía una validación en el frontend sin actualizar la base — y si el fix se aplica a mano en el SQL Editor, hay que formalizarlo como migración después o se pierde en el próximo `db reset`.
- `new Date("YYYY-MM-DD")` es UTC, no local — siempre usar `parseLocalDate()` (`src/lib/dates.ts`) para fechas date-only como `disbursedAt`/`lastCycleStart`.
- Cuando hay múltiples copias de una misma validación (dominio, form de edición, form de creación), hacer grep amplio para encontrar TODAS antes de dar el fix por cerrado — un `disabled` de botón puede esconder una copia que ni el dominio ni los tests tocan.
- La pantalla de "Log de sincronización" en Ajustes es útil para diagnóstico remoto de problemas de sync sin necesitar acceso físico al celular de Fla (USB/`chrome://inspect`).

## Docs de referencia

- `docs/DECISIONS.md` — historial de decisiones y detalle técnico de cada sprint/hotfix
- `CLAUDE.md` / `GEMINI.md` — contexto para agentes (leer antes de tocar código)
- `docs/DEPLOY_PUSH.md` — checklist de push notifications
- `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/REQUIREMENTS.md` — arquitectura, diccionario de datos, historias de usuario

## Suggested skills

- **caveman** — modo de comunicación activo
- **grill-me** — para definir alcance de features nuevos
- **handoff** — para generar handoffs al pausar
- **tdd** — para lógica de dominio nueva
- **diagnose** — si aparecen bugs en producción
