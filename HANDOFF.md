# Fla MpM — Handoff

## Contexto
Gestor de préstamos personales offline-first para Fla (~8 clientes en Perú). Reemplaza el control manual en cuaderno/spreadsheet. Usuaria = Fla. Dev + infra = Giancarlo. Idioma UI = español.

## Estado
Producto usable end-to-end en `develop`, no desplegado a producción todavía. Fla prueba en Preview de Vercel con cuenta real de Supabase.

- Última rama activa: develop
- Último commit: 075b91f fix: persistent toasts and cleanup run-cases.ts (2026-08-15)
- Total tests: 109 passed (0 fallos, 0 skipped)
- `main` intacto en `4ec3745 Initial commit`
- Ramas locales preservadas por rescates previos: `backup/develop-pre-revert-cuotas`, `restore/pre-cuotas` (NO borrar sin autorización — historial de un revert grande).

## Documentación autoritativa
Consulta estos ANTES de tocar código:
- `docs/DECISIONS.md` — fuente de verdad; contiene el modelo de negocio, decisiones de arquitectura por sprint, convenciones, invariantes y pendientes.
- `docs/REQUIREMENTS.md` — historias de usuario e invariantes.
- `docs/ARCHITECTURE.md` — arquitectura + diagramas Mermaid.
- `docs/DATA_MODEL.md` — diccionario de datos.
- `CLAUDE.md` y `GEMINI.md` — briefs para agentes de IA (contenido gemelo).
- `CONTRIBUTING.md` — git flow: main = producción (auto deploy), develop = integración (CI, sin deploy), feature branches `feature/sprint-<n><letra>-<slug>` que salen de develop, PR a develop, self-merge con CI verde. Conventional Commits.

## Stack
- Frontend: React 18 + Vite + TypeScript (strict). PWA vía vite-plugin-pwa.
- Datos locales (fuente de verdad): Dexie/IndexedDB (v4 actual). Repository pattern por entidad. Outbox pattern para sync.
- Backend: Supabase (Postgres). Auth email+password + RLS por owner. Storage: Vercel.
- Testing: Vitest. 22 archivos de test, 109 tests. TDD para lógica pura.
- PDFs: `@react-pdf/renderer` con dynamic import (chunk lazy, no engordar bundle inicial).

## Modelo de negocio activo (importante)
Préstamo con PAGO ÚNICO al vencimiento (termDays 25/28/30, tasa variable). Interés simple: interés = capital × tasa; total = capital + interés. Renovación = cobra solo interés y corre disbursedAt +termDays. Abono parcial = cubre primero interés pendiente, sobrante baja capital. Tolerancia de atraso: 7 días.

⚠️ NO usar modelo de cuotas. Se intentó (sprints 4a/4b) tras malinterpretar un requerimiento; se revertió al confirmar con Fla que solo maneja pago único. Los commits del intento son inalcanzables pero preservados en git. Si algún día vuelve a proponerse, requiere confirmación explícita del usuario.

## Convenciones obligatorias (recordatorio)
- TypeScript estricto; camelCase; identificadores en inglés; comentarios y UI en español.
- Montos SIEMPRE como enteros en céntimos. `toCents`/`fromCents`/`formatSoles` en `src/lib/money.ts`. `toCents` es defensivo contra NaN/Infinity.
- Nombrar los patrones de diseño en comentarios (Repository, Outbox, Provider/Context, Domain Model).
- Cambios llegan como prompts UN prompt por respuesta; agente autorizado para commit/push/merge feature→develop; NUNCA main sin autorización explícita.

## Pendientes ordenados por prioridad
1. **Confirmación verbal con Fla de la regla de mora** antes de activar `LATE_INTEREST_ENABLED` (hoy = false en `src/domain/loanRules.ts`). La regla codificada: 7 días de gracia + 1 interés extra por cada 30 días de atraso sobre capital, no compuesto. Sin confirmarlo se puede afectar cuánto cobra ella; no activar por Claude ni por el agente.
2. **Sprint 5b-2 — Push notifications reales 7 a.m.** Foco Android (Fla usará Android). Requiere: VAPID keypair, tabla `push_subscriptions`, Supabase Edge Function con `pg_cron`, service worker `push` handler, UI para pedir permiso + guía para instalar PWA en home. iOS queda como best-effort (solo funciona si PWA instalada en home + delay variable).
3. **Release develop→main** = deploy productivo. Vercel Production Branch = main. Workflow ya configurado (build+test en push/PR a main y develop; deploy SOLO en push a main). Antes: aplicar todas las migraciones SQL pendientes en Supabase (ver siguiente sección).

## Migraciones SQL de Supabase
Todas viven en `supabase/migrations/`. NO se aplican automáticamente. Cada una se ejecuta manualmente en el SQL Editor del dashboard antes de que el código dependiente empiece a pushear datos.

Verifica en la sección "Migraciones SQL Supabase" de `docs/DECISIONS.md` cuáles han sido aplicadas al proyecto real y cuáles no. Si no está documentado, corre `ls supabase/migrations/` y confirma con el usuario cuál fue la última aplicada. Aplicar migraciones fuera de orden es peligroso.

## Datos por defecto del negocio
Están en `src/config/business.ts` como fallback (se siembran solo en primer login por dispositivo, vía `ensureSettings`). Fla los edita en la pantalla Ajustes (accesible desde pestaña Clientes). Si edita, sobrescribe defaults; si no toca nada, los PDFs y el mensaje de WhatsApp usan estos valores.

## Preview y Producción
- Preview: cada push a `develop` genera un deploy Preview automático en Vercel. URL cambia por commit.
- Cuenta Supabase de Fla ya está creada. Credenciales se comparten fuera del código.
- Producción: aún NO desplegado. Main sigue en initial commit.

## Ramas y commits especiales a NO borrar
- `main` (obviamente).
- `backup/develop-pre-revert-cuotas` — snapshot pre-revert.
- `restore/pre-cuotas` — rama base del revert.
Comandos de limpieza masiva del tipo `git branch -D` son PELIGROSOS acá.

## Próximo paso natural cuando se retome
Dependiendo del enfoque del usuario:
- Si quiere ver deploy real → coordinar release develop→main después de aplicar todos los SQL pendientes.
- Si quiere completar features → Sprint 5b-2 push notifs.
- Si quiere confirmar la mora con Fla → activar `LATE_INTEREST_ENABLED = true`, correr tests, verificar que ningún test rompa.

Preguntar al usuario cuál es la prioridad. NO decidir por él.
