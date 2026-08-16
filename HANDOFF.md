# Handoff: Fla MpM — post hotfix pre-release-mora-off, pre-release develop→main

## Contexto proyecto

Gestor microcréditos PWA para Fla (Perú, ~8 clientes, creciendo hacia 20+). Dev: Giancarlo.
Stack: Vite+React+TS, Dexie/IndexedDB (v5), Supabase (auth+sync+RLS), react-pdf, vite-plugin-pwa, Vercel.
Ramas: `develop` (integración, incluye hasta PR #24), `main` (producción, en `a531441` = solo sprint 6a-1 — 61 commits detrás de `develop`).
Modelo dominio: préstamo pago único, plazo 1-365 días (presets 25/28/30), montos en céntimos.

## Modo de trabajo

- Español siempre (comunicación, UI, comentarios, docs)
- **Caveman**: respuestas ultra-concisas
- **Grill-me**: una pregunta a la vez con recomendación antes de generar prompt
- **Un prompt copy-paste por respuesta** para Antigravity/Claude Code
- **Prompts en un solo bloque de código markdown** — NO anidar triple backticks dentro del bloque (causa rendering roto; usar indentación o texto descriptivo para SQL/snippets internos)
- Docs paralelos: `docs/DECISIONS.md`, `CLAUDE.md`, `GEMINI.md` — actualizar en cada sprint
- Git: agente autoriza commit/push/merge feature→develop vía `gh` CLI
- **`main` NUNCA se toca por agente** — release a prod es paso manual deliberado

## Sprints cerrados (rama develop)

| Sprint | PR  | Alcance                                                                                                                                          |
| ------ | --- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 6a-1   | —   | Rebrand logo dálmata navy (mergeado a main por error, sin daño)                                                                                  |
| 6a-2   | #2  | Colores semáforo (bad rojo, slow ámbar, good navy)                                                                                               |
| 6a-3   | #3  | Nombres UPPERCASE normalizeClientName                                                                                                            |
| 6a-4   | #4  | Plazo libre 1-365 con presets                                                                                                                    |
| 6a-5   | #5  | WhatsApp en ClientDetailSheet + tab Préstamos                                                                                                    |
| 6a-6   | #6  | ProfileSheet desde avatar header                                                                                                                 |
| 6a-7   | #7  | Fix teclado móvil: hook useKeyboardAwareInput + visualViewport                                                                                   |
| 6a-8   | #8  | CRUD editable + soft delete + cascada + Dexie v5 + migración 0008                                                                                |
| 6a-8b  | #9  | Restringir edición/anulación pagos: solo método, solo último pago, recalcula préstamo                                                            |
| 6a-8c  | #10 | Bloqueo edición préstamo con pagos, editar desde tab Préstamos, input interés en soles, fallback teclado MIUI focusin                            |
| 6a-9   | #11 | PDFs: ClientHistoryPdf + GlobalReportPdf, botones en ClientDetailSheet y ProfileSheet                                                            |
| 5b-2   | #12 | Push notifications 7am: VAPID, push_subscriptions (migración 0009), sw-push.js, Edge Function daily-push, PushPermissionModal, toggle en Ajustes |
| 7a-1   | #13 | Header Hoy: logo 18px→64px, quitar saludo "Buen día · fecha · hora"                                                                              |
| 7a-2   | #14 | Rediseño LoginScreen: fondo crema, logo 120px, botón caramelo                                                                                    |
| 7a-2b  | #15 | Login: card unificado, fondo blanco, sin scroll en 375×667                                                                                       |
| 7a-3   | #16 | Logo procesado para PDFs (`logo-pdf.png`): contorno blanco + drop-shadow, 64px, sin fondo doble                                                  |
| 7a-1b  | #17 | Fix: restaurar etiqueta "Debes cobrar hoy" en header Hoy (se había quitado de más en 7a-1)                                                       |
| 7a-3b  | #18 | Reducir borde (9px→3px) y sombra del logo PDF                                                                                                    |
| docs   | #19 | Sync Sprint 7a-3b en DECISIONS.md + fix de desfase CLAUDE.md/GEMINI.md                                                                           |
| 7a-4   | #20 | Descargar comprobante de pago desde el historial de `ClientDetailSheet` (nuevo `loanBalanceHistory.ts`, reconstruye saldo histórico sin duplicar reglas) |
| 7a-5   | #21 | Saldo visible + botón "Cobrar" en card de préstamo de `ClientDetailSheet`                                                                        |
| hotfix | #22 | Loguear errores reales (`console.error`) en los 3 handlers de descarga de PDF — investigación del bug de Historial de ELVIA PÉREZ                |
| hotfix | #23 | **Causa raíz confirmada y arreglada**: `fontStyle:"italic"` inválido en badge "(editado)" de `ClientHistoryPdf` (combinaba mal con `fontFamily:"Helvetica-Bold"` heredado) — rompía la descarga solo para préstamos editados-y-anulados |
| 7a-6   | #24 | Búsqueda por cliente en tab Préstamos (mismo patrón que Clientes)                                                                                |
| hotfix | #26 | Dead-letter en outbox: `pushOutbox()` ya no bloquea toda la cola ante un registro con error; logueo + reintentos acotados (5) antes de marcar `failedAt` |
| hotfix | —   | **Mora desactivada explícitamente pre-release**: `LATE_INTEREST_ENABLED = false` por instrucción directa de Giancarlo (ver sección MORA abajo, ahora resuelta) |

Tests: **156/156**. Build limpio. CI verde en todos los PRs mergeados.

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

Todas las migraciones del repo están aplicadas. No hay migraciones pendientes.

## Deploy push notifications — COMPLETADO

Confirmado por Giancarlo. Checklist ejecutado (referencia completa en `docs/DEPLOY_PUSH.md`):

1. ✅ VAPID public key en variable de entorno Vercel (`VITE_VAPID_PUBLIC_KEY`)
2. ✅ VAPID private key como secret de la Edge Function en Supabase (`VAPID_PRIVATE_KEY`) — nunca en el repo
3. ✅ Migración 0009 aplicada en Supabase
4. ✅ `daily-push` Edge Function desplegada (`supabase functions deploy daily-push`)
5. ✅ Extensiones `pg_cron` + `pg_net` habilitadas en Supabase
6. ✅ Cron `0 12 * * *` UTC (= 7am hora Perú) programado

No queda ningún paso manual pendiente para este sprint.

## ⚠️ MORA (LATE_INTEREST_ENABLED) — discrepancia RESUELTA (desactivada)

Flag en `src/domain/loanRules.ts`, ahora **`false`** en código (sin mora: sin importar el atraso, `computeLatePeriods()` retorna siempre 0 — no corre interés extra sobre el capital).

**Resuelta el 2026-08-16 con instrucción EXPLÍCITA de Giancarlo** (hotfix `pre-release-mora-off`): como nunca quedó registrada una confirmación verbal real de Fla sobre la mora, se optó por apagar el flag antes del release en vez de dejarlo en `true` sin respaldo. `docs/DECISIONS.md`/`CLAUDE.md`/`GEMINI.md` ya reflejan el estado actual (`false`).

**NO ACTIVAR (`true`) sin confirmación escrita de Fla** — si Fla confirma la mora en el futuro, reactivar el flag es un cambio de negocio deliberado, no un hotfix; requiere instrucción EXPLÍCITA de Giancarlo y dejar constancia de la confirmación.

## Backlog priorizado

| #   | Tarea                                  | Estado                                                                 |
| --- | --------------------------------------- | ----------------------------------------------------------------------- |
| 1   | Resolver discrepancia de mora           | ✅ Resuelta 2026-08-16 — flag apagado (`false`) por instrucción de Giancarlo |
| 2   | Release `develop`→`main`                | Código y deploy de push notifs listos; sin bloqueantes conocidos — pendiente solo de que Giancarlo dispare el release manual |
| 3   | Observación cosmética (línea tachada)   | Baja prioridad, ver abajo                                                |

## Observación cosmética abierta

Fechas "12-jul. → 11-ago." con `line-through` en detalle préstamo. Puede ser indicador "En tolerancia" o CSS heredado. No investigada en este handoff.

## Suggested skills

- **caveman** — modo de comunicación activo
- **grill-me** — para definir alcance de features nuevos
- **handoff** — para generar handoffs al pausar
- **tdd** — para lógica de dominio nueva (ej: reglas de mora)
- **diagnose** — si aparecen bugs en producción
