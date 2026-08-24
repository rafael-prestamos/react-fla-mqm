# Handoff: Fla MpM — post sprint 7d-1

## Contexto proyecto

Gestor microcréditos PWA para Fla (Perú, ~8 clientes, creciendo hacia 20+). Dev: Giancarlo.
Stack: Vite+React+TS, Dexie/IndexedDB (v7), Supabase (auth+sync+RLS), react-pdf, vite-plugin-pwa, Vercel.
Ramas: `develop` y `main` **al día entre sí** (Giancarlo mergeó `develop`→`main` manualmente tras el PR #37).
Modelo dominio: préstamo pago único, plazo 1-365 días (presets 25/28/30), montos en céntimos.
Tests: **212/212**.

## Modo de trabajo

- Español siempre (comunicación, UI, comentarios, docs)
- **Caveman**: respuestas ultra-concisas
- **Grill-me**: una pregunta a la vez con recomendación antes de generar prompt
- **Un prompt copy-paste por respuesta** para Antigravity/Claude Code
- **Prompts en un solo bloque de código markdown** — NO anidar triple backticks dentro del bloque (causa rendering roto; usar indentación o texto descriptivo para SQL/snippets internos)
- Docs paralelos: `docs/DECISIONS.md`, `CLAUDE.md`, `GEMINI.md` — actualizar en cada sprint
- Git: agente autoriza commit/push/merge feature→develop vía `gh` CLI
- **`main` NUNCA se toca por agente** — release a prod es paso manual deliberado

## Sesión anterior (ya en main): fixes de producción

Tras el primer release develop→main, aparecieron varios problemas reales en producción. Resueltos uno por uno:

- **PR #26** — Dead-letter en outbox: `pushOutbox()` ya no hace `break` en el primer error; `retryCount` hasta 5, luego `failedAt` (dead-letter, sale de la cola sin bloquear a los demás).
- **PR #28** — `lastError` guardado en outbox + pantalla "Log de sincronización" en Ajustes (diagnóstico remoto sin USB).
- **PR #29 + #31** — Interés 0 permitido; había 3 copias de la validación, la tercera estaba en el `disabled` del botón en `App.tsx`.
- **PR #30** — Fix timezone: `parseLocalDate()` en `src/lib/dates.ts`; `new Date("YYYY-MM-DD")` parseaba como UTC y mostraba 1 día atrás en Perú. Resolvió también el bug cosmético de línea tachada que estaba abierto.
- **fix/mora-off** — `LATE_INTEREST_ENABLED = false` antes del release.
- **ALTER TABLE manual en Supabase** — `loans_term_days_check` ahora acepta 1-365 (antes solo 25/28/30, desincronizado desde sprint 6a-4).

## Sesión 7c: sprints 7c-1 a 7c-4 (lista de observaciones de Fla)

- **PR #33 (7c-1)** — Eliminar cliente (hard delete, bloqueado si tiene préstamos activos, cascada al historial) + anular préstamo desde tab Préstamos + eliminada la sección "Atrasados" de Hoy.
- **PR #34 (7c-2)** — Nueva tab "Cobros": lista de pagos (fecha, cliente, monto, préstamo, método), filtros de mes / rango / búsqueda por cliente, card de Total cobrado. Lógica pura en `src/domain/paymentsFilter.ts`.
- **PR #35** — Refactor: filtros de fecha movidos a `PaymentsFilterModal`, abierto con botón al lado del título "Cobros", con indicador cuando hay filtro activo.
- **PR #36 (7c-3)** — PDFs de Cobros (respeta filtro activo) y de Préstamos activos. Dominio puro en `paymentsReport.ts` y `activeLoansReport.ts`; `CobrosTab` reusa `buildPaymentReportRows` para que el PDF no derive de lo mostrado. Nuevo helper `formatShortDash`.
- **PR #37 (7c-4)** — Cards del header Hoy: "Cobrado" ahora es total histórico; navegación al tocar (Interés y Préstamos activos → tab Préstamos, Cobrado → tab Cobros, Capital en la calle inerte).
- **`.gitattributes` commiteado** (`* text=auto eol=lf`) — resuelve el ruido de CRLF al trabajar desde distintas PCs.


## Sprint 7d-1: renovaciones flexibles (esta sesión)

- **Renovar = préstamo nuevo** (`src/domain/loanRenewal.ts`): Fla define monto recibido (0 permitido), capital, interés y plazo del nuevo ciclo. El anterior queda `isPaid` con sus términos intactos; el nuevo lo enlaza con `renewedFromLoanId`. Pago de renovación (tipo `interest`) sobre el anterior vía `paymentsRepo.create` en la misma transacción (`loansRepo.renew`).
- **Deshacer:** anular el préstamo nuevo reabre el anterior; recién después se puede anular el pago de renovación (bloqueado mientras el hijo esté activo).
- **⚠️ Migración `0011_loans_renewed_from.sql` PENDIENTE de aplicar en Supabase** antes del próximo release a `main` — sin la columna `renewed_from_loan_id`, el push de préstamos nuevos falla en sync (dead-letter). Aplicar en el SQL Editor igual que las anteriores.
- Inputs compartidos `src/components/loan/InterestAmountInput.tsx` y `LoanTermInput.tsx` (usados en préstamo nuevo, edición y renovación).
- Detalle completo en `docs/DECISIONS.md` → "Sprint 7d-1".
## Estado actual

- `develop` y `main` con todo hasta el PR #37.
- 212/212 tests, `tsc` y build limpios.
- Migraciones 0001-0010 aplicadas. **0010** formaliza en el repo el `ALTER TABLE` de `term_days` que ya estaba aplicado manualmente en producción desde la sesión anterior.
- Deploy en Vercel activo, Fla ya actualizada.

## Backlog

| # | Tarea | Estado |
| --- | --- | --- |
| 1 | Confirmar mora con Fla | `LATE_INTEREST_ENABLED = false`. No activar sin instrucción explícita de Giancarlo por escrito |
| 2 | Test flaky en `settingsRepo` | Colisión de timestamps, pre-existente. Falla intermitente en CI, pasa al reintentar |
| 3 | Logo foto-fiel del perrito real | Pendiente solicitud explícita de Giancarlo |

## Learnings de esta sesión

- El problema de sync en el Xiaomi NO era MIUI — era el `break` en el loop de `pushOutbox()` bloqueando la cola indefinidamente.
- Los CHECK constraints de Supabase se desincronizan si se amplía la validación en frontend sin actualizar la BD.
- `new Date("YYYY-MM-DD")` es UTC medianoche, no local. Siempre `parseLocalDate()` para strings date-only.
- Cuando una validación existe en varias capas (dominio, form de edición, `disabled` del botón), grep amplio para encontrar TODAS antes de dar por cerrado el fix.
- La pantalla de Log de sincronización permite diagnóstico remoto sin cable USB ni `chrome://inspect` — el usuario manda captura.
- Extraer la lógica de reportes a dominio puro (`paymentsReport.ts`) evita que el PDF derive de lo que se muestra en pantalla.

## Docs de referencia

- `docs/DECISIONS.md` — historial de decisiones y detalle técnico de cada sprint/hotfix
- `CLAUDE.md` / `GEMINI.md` — contexto para agentes (leer antes de tocar código)
- `docs/DEPLOY_PUSH.md` — checklist de push notifications

## Suggested skills

- **caveman** — modo de comunicación activo
- **grill-me** — para definir alcance de features nuevos
- **handoff** — para generar handoffs al pausar
- **tdd** — para lógica de dominio nueva
- **diagnose** — si aparecen bugs en producción
