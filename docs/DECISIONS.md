# Fla MpM — Registro de decisiones (DECISIONS.md)

Fuente de verdad del proyecto. Vive en el repo y viaja con el código.
Última actualización: Sprint 0.

## 1. Producto

Gestor de préstamos para una prestamista (~8 clientes) que hoy lleva todo en
hoja de cálculo. Objetivo: reemplazar el control manual (con errores) por una
app confiable, instalable y **offline-first**. Usuaria: **Fla**. Dev/infra:
**Giancarlo**. Idioma de la UI: español.

## 2. Decisiones de arquitectura (grill Sprint 0)

| # | Decisión | Resultado |
|---|----------|-----------|
| Q1 | ¿Supabase desde el día 1? | **Sí.** Sync desde el inicio. |
| Q2 | Autenticación | **Email + password + RLS** (filas scoped al dueño). |
| Q3 | Dueño de cuentas | Infra de **Giancarlo**; usuaria de la app = **Fla** (1 proyecto Supabase). |
| Q4 | Lenguaje | **TypeScript** con buenas prácticas. |
| Q5 | Estado y datos | **Dexie (Repository) + useLiveQuery + sync Outbox + Context.** Sin Zustand/Redux, sin TanStack Query. |

## 3. Stack

- **Frontend:** React 18 + **Vite** + TypeScript. UI con CSS tokens + `lucide-react`.
- **Datos locales (fuente de verdad):** Dexie / IndexedDB. Montos en **céntimos enteros**.
- **Backend/sync:** Supabase (Postgres) free tier. Auth email+password + RLS. Patrón **Outbox**, last-write-wins.
- **PWA:** `vite-plugin-pwa` (manifest + service worker, instalable y offline).
- **Infra:** GitHub (repo) → Vercel (host) → GitHub Actions (CI/CD).
- **Errores:** Sentry — **diferido a Sprint 3/4** (no bloquea).
- **PM:** Trello — board "Gestor de Préstamos — MVP".

### Por qué Vite y no Next.js
La app es 100% client-side (IndexedDB = verdad). SSR/RSC/API-routes/SEO de Next
no aplican; RSC no accede a IndexedDB. `vite-plugin-pwa` (Workbox) es más maduro
para el service worker que el SW de Next App Router. Vite = menos peso, offline
más sólido. (La familiaridad con Next fue el único punto a favor de Next.)

## 4. Convenciones de código

- TypeScript estricto; **camelCase**.
- Nombres de variables/propiedades/funciones **en inglés**.
- Comentarios y explicaciones **en español**; **UI en español**.
- Nombrar los **patrones de diseño** usados (Repository, Outbox, Provider/Context, Domain/Pure Functions).

## 5. Reglas de negocio (confirmadas)

- Interés = capital × tasa (**interés simple**, no compuesto). Total = capital + interés.
- Plazos **25 / 28 / 30** días. Tasa variable por cliente.
- **Tolerancia de 7 días** de atraso sin penalidad.
- Renovación por "solo interés": nuevo ciclo desde la fecha de vencimiento.
- Abonos parciales que reducen el saldo.
- Clasificación automática: **bueno / se demora (>7 d) / mal pagador (>30 d)**.
  "Mal pagador" es **solo advertencia**, no bloquea prestar.

### ⚠️ Regla de MAYOR riesgo — mora por atraso (interés extra)
Pasados los 7 días corre **1 interés adicional por cada 30 días** de atraso
(sobre el capital). Implementada tras el flag `LATE_INTEREST_ENABLED` en
`src/domain/loanRules.ts`. **Pendiente de CONFIRMACIÓN VERBAL con la clienta
antes de activarla en firme en Sprint 3.**

### Sprint 2: Modelo de pagos y Onboarding de cartera activa
- **Orden de abonos (partial):** Primero cubren el interés pendiente del ciclo actual. El sobrante reduce el capital (saldo).
- **Semántica de renovación (interest):** El pago de "solo interés" inicia un nuevo ciclo cuya fecha de entrega (`disbursedAt`) es idéntica a la fecha de vencimiento anterior, corriendo el plazo hacia adelante.
- **Transacción única y Cableado UI:** La aplicación de un pago usa `applyPayment` transaccional (muta el `loan`, inserta el `payment` y encola en `outbox` en ACID de Dexie). Los antiguos métodos no transaccionales fueron retirados.
- **Cobranzas "Hoy":** Reordenada, incorpora sección "Por vencer" (próximos 3 días) y manejo de errores explícito en el `PaymentSheet`.
- **Sprint 2c (Registro Histórico):** Onboarding de la cartera activa. Permite a Fla cargar los préstamos vigentes que tiene en su cuaderno. Se consolida el saldo inicial restándolo de la deuda calculada (la cual toma en cuenta mora si `LATE_INTEREST_ENABLED` está activo). Si hay abonos consolidados, se genera un Payment sintético "Saldo inicial" para no perder la cuadratura. Este flujo es exclusivo para el arranque y no reemplaza el registro estándar de préstamos nuevos.

## 6. Diseño / marca

- **Color principal: azul marino.** Tokens: `#16325C` principal, `#1F406A` claro,
  `#122845` profundo, `#D49A5D` acento caramelo, `#FBF5E9` crema.
- Se conserva el **semáforo de estado** (verde=buen pagador, ámbar=demora,
  rojo=mal pagador) porque es señal funcional, no marca.
- **Logo:** por ahora la mascota-perrito generada (SVG navy). Pendiente para el
  final: versión fiel a la foto original (solo quitar fondo).

## 7. Testing

- **Herramienta:** Vitest.
- **Enfoque actual:** Tests de caracterización sobre la lógica pura (`src/lib`, `src/domain`).
- **Próximos Sprints (1+):** Uso de TDD (red-green-refactor) para nuevo código de dominio.

## 8. Flujo de Git y Ramas

- **main:** Producción (despliegue automático a Vercel).
- **develop:** Integración continua (CI) en verde.
- Todo incremento nuevo empieza creando y cambiando a una rama `feature/sprint-...` desde `develop`.
- Commits bajo la convención **Conventional Commits** (en inglés).

## 9. Pendientes / decisiones abiertas

- **Recordatorio WhatsApp** (1 día antes del vencimiento): decidir "toca para
  enviar" (wa.me, recomendado para ~8 clientes) vs. envío 100% automático
  (requiere WhatsApp Business API + costo). Datos de pago listos.
- **Confirmación verbal** de la regla de mora antes de Sprint 3.
- **Sentry** en Sprint 3/4.
- **Logo** fiel a la foto (al final).

## 10. Plan de sprints

- **Sprint 0:** repo, TS, Dexie + Repository, Supabase (SQL+RLS), sync Outbox (esqueleto), PWA (navy + rename + íconos), CI/CD, este documento.
- **Sprint 1a:** Dexie como backbone en vivo (useLiveQuery). Sembrado dev-only. Prod arranca vacío. (Completado)
- **Sprint 1b:** alta de cliente + validación (TDD para validación de dominio). (Completado)
- **Sprint 1c:** registrar préstamo con auto-cálculo, ver activos. (Completado)
- **Sprint 2:** pago total/parcial, renovación, método de pago, pantalla de cobranzas del día. (Completado)
- **Sprint 3:** interés por mora, clasificación automática, alerta mal pagador, (Próximo)
  historial de cliente, sync offline.
- **Sprint 4:** panel resumen, alerta 7 a.m. solo-dueño, backup automático, Sentry.
