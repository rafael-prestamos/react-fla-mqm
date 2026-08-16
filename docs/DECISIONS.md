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

### Revert del modelo de cuotas (post 4b)
Se intentó migrar a un modelo de "Cuotas" (Sprints 4a/4b) por una confusión inicial en los requisitos. Se confirmó que Fla NO maneja cuotas; su modelo es siempre de pago único al final de plazos fijos (25/28/30 días). Por lo tanto:
- Se revirtió todo el dominio y la UI de cuotas, regresando al estado estable del Sprint 3b.
- **Qué se preservó**: Toda la infraestructura de `ErrorBoundary` y notificaciones (`ToastContext`), así como el endurecimiento de funciones puras en `money.ts`.
- **Qué se descartó**: Todos los modelos, repositorios, sincronización y UI relacionados con `installments`. (Los commits siguen accesibles en refs de ser necesarios).

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
- **Sprint 3a (Login Gate):** Pantalla de login estricta para asegurar producción. (Completado)
- **Sprint 3b (Sync Bidireccional):** Mappers de BD, pull inicial por sesión, push automático reaccionario, y Sync UI en la cabecera. Estrategia last-write-wins. (Completado)
- **Sprint 3c:** Activación final de interés por mora (tras confirmación verbal de Fla).
- **Sprint 4c-1:** Clasificación de clientes e historial en vista detalle. (Completado)
- **Sprint 4c-2a:** Settings del negocio para PDFs de recibos. (Completado)
- **Sprint 4c-2b:** Comprobante de pago y estado de cuenta en PDF. (Completado)
- **Sprint 5a:** Recordatorio por WhatsApp desde pestaña Hoy ("tap-to-send" sin API, usando `wa.me`). (Completado)
- **Sprint 5a-fix:** Titulares por cuenta (Yape, BCP Soles, BCP interbancaria). (Completado)
- **Sprint 5b-1:** Brief diario local (toast). (Completado)
- **Sprint 5b-2:** Push notifications reales.
- **Sprint 4:** Panel resumen, alerta 7 a.m. solo-dueño, backup automático, Sentry.

### Sprint 5b-1: brief diario local

- **Funcionalidad:** Muestra un toast informativo (🔔) la primera vez que se abre la app en el día, indicando los préstamos que vencen hoy y los atrasados.
- **Persistencia:** Se usa `localStorage` (`fla-mpm:lastOpenedDate`) por dispositivo. No se sincroniza, cada dispositivo tiene su propio registro.
- **Zona Horaria:** Se introdujo `toLocalIsoDate` (que usa fechas locales del dispositivo) para el tracker de primera apertura, distinto a `toIsoDate` (UTC) usado para persistencia y base de datos.
- **Hook:** `useDailyBrief` en `App.tsx` espera a que carguen los datos de Dexie, evalúa la condición y lanza el toast. Se asegura de marcar como abierto haya o no reporte.
- **Hotfix:** el hook ahora espera a que loans/clients estén cargados antes de evaluar; usa useRef para evitar re-disparos en StrictMode y refresh; toLocalIsoDate en tracker. Toasts admiten opción persistent; el daily brief la usa para no perderse si Fla no mira la app en 4s.

### Sprint 5a-fix: titulares por cuenta

- Se agregaron 3 campos a `BusinessSettings` (`yapeHolder`, `bcpSolesHolder`, `bcpInterbankHolder`) con default "Rafael Rojas".
- Migración Dexie v4 y SQL 0007 (idempotentes).
- `ensureSettings` realiza backfill de titulares para filas legacy.
- Reflejado en Ajustes UI, mensaje de WhatsApp y footers de PDFs.

### Sprint 5a: WhatsApp tap-to-send

- **Funcionalidad:** Botón "WhatsApp" en la vista "Hoy" para préstamos Por vencer, Vence hoy y Atrasados.
- **Implementación:** Sin API, sin backend. Se usa `wa.me/{telefono}?text={mensaje}`. El navegador abre WhatsApp y el usuario (Fla) debe confirmar/enviar manualmente. No tiene costo.
- **Mensaje pre-armado:** Incluye saludo, estado de urgencia según la fecha ("vence el...", "HOY vence", "venció el..."), monto a pagar, y las opciones de pago configuradas en settings.
- **Teléfonos:** Normalizados para Perú (se añade `51` a los de 9 dígitos que empiezan con `9`).

### Sprint 4c-2b: PDFs

- **Librería:** `@react-pdf/renderer` (~450kb / ~1.26MB sin comprimir con sus
  fuentes). Para no engordar el bundle inicial, **siempre** se importa con
  dynamic `import()` en el momento en que el usuario toca "Descargar" — nunca
  en el top-level de un archivo alcanzable estáticamente desde `App.tsx`.
  Resultado verificado en build: el chunk principal creció ~6kB (566→572kB);
  react-pdf y los componentes de PDF quedan en chunks lazy aparte
  (`react-pdf.browser-*.js` ~1.26MB, `PaymentReceiptPdf-*.js` ~4kB,
  `StatementPdf-*.js` ~7kB).
- **Comprobante de pago** (`src/pdf/PaymentReceiptPdf.tsx`): se descarga desde
  el estado "pago-registrado" de `PaymentSheet` tras un cobro exitoso —
  `loansRepo.applyPayment` ahora devuelve también el `Payment` creado para
  poder generarlo sin una segunda consulta.
- **Estado de cuenta** (`src/pdf/StatementPdf.tsx`): se descarga desde
  `ClientDetailSheet` (préstamos + pagos históricos del cliente, resumen y
  saldo pendiente vía `deriveLoan`).
- Ambos toman los datos del negocio de `settingsRepo.get()` (Sprint 4c-2a);
  formato en español, tema navy consistente con la app.
- **Helpers nuevos:** `src/lib/downloadBlob.ts` (dispara la descarga del Blob
  en el browser) y `src/lib/sanitizeFilename.ts` (nombre de archivo seguro sin
  acentos/espacios). Formateo de textos específico de PDFs en
  `src/pdf/formatters.ts`.

### Sprint 4c-2a: Settings

- **Modelo:** Singleton (`id: "singleton"`) tanto en Dexie como en Supabase — una
  fila de `BusinessSettings` por usuario (`owner_id` en Supabase filtra por RLS).
  Contiene nombre del negocio, celular, Yape/Plin, cuenta BCP Soles y CCI
  interbancaria BCP; se usará para poblar los PDFs de recibos del Sprint 4c-2b.
- **Defaults:** `src/config/business.ts` (`DEFAULT_BUSINESS` / `makeDefaultSettings()`)
  trae los datos reales de Fla como arranque de fábrica. El usuario puede
  editarlos en la pantalla de Ajustes; si nunca los edita, los PDFs usan estos.
- **Bootstrap (orden crítico):** `pullFromSupabase()` primero, `ensureSettings()`
  después, en `SessionContext`. Así, si el usuario ya tenía settings en Supabase
  (de otro dispositivo), el pull los trae y `ensureSettings()` no los pisa —
  solo siembra defaults cuando, tras el pull, no existe fila local.
  `ensureSettings()` es idempotente: no reencola si la fila ya existe.
- **Migración Dexie v3:** Nueva tabla `settings: "id, updatedAt"`. No siembra
  datos en el upgrade (a diferencia del v1→v2 de rating); el sembrado es
  responsabilidad explícita de `ensureSettings()` para respetar el ownership
  post-login.
- **Migración SQL:** `supabase/migrations/0006_settings.sql` — tabla `settings`
  con RLS por `owner_id = auth.uid()`. Aplicación manual en el dashboard de
  Supabase (no se ejecuta automáticamente).
- **UI:** `SettingsSheet` (patrón sheet full-screen, mismo estilo que
  `ClientDetailSheet`), accesible desde la pestaña Clientes junto al botón de
  cerrar sesión. Carga vía `settingsRepo.get()`, guarda vía `settingsRepo.update()`.

### Sprint 6a-1: Rebrand logo

- **Decisión:** PNG como formato base (no SVG traced) por simplicidad y calidad suficiente, extraído de `assets/branding/logo-source-1024.png`.
- **Assets:** Se generaron derivados para PWA (`pwa-192.png`, `pwa-512.png`, `pwa-maskable-512.png`), favicons (`favicon.ico`, `apple-touch-icon.png`) y uso interno (`logo.png`).
- **Implementación UI:** Componente `BrandLogo` (`src/components/brand/BrandLogo.tsx`) como *single source of truth* para renderizar el logo en la app (Login, cabecera).
### Sprint 6a-2: Colores estado + limpieza Hoy

- **Tokens de Color (Semáforo):** A pedido del cliente, se adoptó una paleta de semáforo pura (`good: navy #16325C`, `slow: amber #F59E0B`, `bad: red #DC2626`) implementada vía CSS variables en `theme.css`. Se crearon variantes `-soft` para fondos con baja opacidad en los badges de estado.
- **Limpieza de "Hoy":** Se eliminó el conteo estadístico de "mal pagador" de la cabecera en la pestaña "Hoy" para evitar ruido y ansiedad visual diaria. El componente queda comentado por si se requiere en el futuro, pero la visualización permanente se delega a las vistas de historial y al listado general de clientes.
- **Estrategia (Opción C híbrida):** Los nombres de clientes se normalizan a UPPERCASE tanto al crear como al editar. Se implementó una migración one-shot (`namesMigratedToUpperV1`) con backup local que actualiza los registros en Dexie y hace un `.update` en Supabase para evitar sobrescribir otros campos.
- **UI:** Se incluyó un input de búsqueda case-insensitive y se agregó un texto de previsualización (e.g. "Se guardará como: JUAN PÉREZ") debajo del input de creación de cliente.
- **SQL / Consideración futura:** De momento la normalización se maneja 100% en el frontend con el helper `normalizeClientName`. Se considera un trigger SQL en Supabase como defensa futura pero no se requiere actualmente.

### Sprint 6a-4: Plazo flexible de préstamo (1-365 días)

- **Decisión:** Se cambió el tipo `LoanTerm` de un enum estricto `25 | 28 | 30` a `number` validado en rango `[1, 365]`. Esto habilita a Fla a ingresar cualquier plazo entero (ej. 45 días, 60 días) sin perder los atajos rápidos de sus plazos habituales.
- **Rationale:** Fla necesita flexibilidad para acuerdos informales con plazos no estándar. El 90% de sus préstamos seguirán siendo 25/28/30 días, pero la restricción de enum bloqueaba casos edge.
- **Sin migración de datos:** Los préstamos existentes tienen `termDays` ∈ {25, 28, 30}, todos dentro del nuevo rango [1, 365]. Solo se relaja la restricción, sin tocar datos persistidos.
- **Value Object de dominio:** `src/domain/loanTerm.ts` implementa el patrón Value Object con `isValidLoanTerm()` y `assertValidLoanTerm()`. Constantes: `LOAN_TERM_MIN=1`, `LOAN_TERM_MAX=365`, `LOAN_TERM_PRESETS=[25,28,30]`.
- **Defensa en profundidad:** Validación en tres capas — dominio (`isValidLoanTerm`), validador de formulario (`validateLoanInput`/`validateLoanBackfillInput`), y repository (`assertValidLoanTerm` antes del `put`).
- **UI (Compound Input):** El formulario de préstamo muestra un `<input type="number">` libre para el plazo más tres botones-preset (25d / 28d / 30d) visualmente conectados. El botón activo se destaca en navy. Los presets respetan el hábito de Fla sin quitar la libertad de ingresar cualquier valor.
- **Cálculos:** Los cálculos de interés simple, fecha de vencimiento, mora y renovación ya operaban con `number`; no requirieron cambio lógico, solo tipológico.

### Sprint 6a-8: CRUD editable + soft delete

- **Alcance:** editar cliente (nombre/DNI/teléfono), préstamo (monto/tasa/plazo/fecha) y pago (monto/método); anular préstamos con cascada a sus pagos y anular pagos individuales.
- **Campos:** `cancelledAt`, `cancelReason` opcional y `editedAt` en Loan/Payment; solo `editedAt` en Client. La auditoría conserva únicamente ese timestamp y se muestra un badge sutil “editado”.
- **Cascada:** al anular un préstamo se anulan todos sus pagos activos. El modal los enumera y exige escribir `ELIMINAR` antes de habilitar la acción destructiva.
- **Visibilidad:** las consultas `all`/`active`/`byClient`/`byLoan` excluyen registros anulados, por lo que desaparecen de las vistas normales.
- **Sync:** Dexie v5 y migración SQL `0008_soft_delete_and_edit.sql`; los mappers sincronizan los nuevos campos.
- **Fix colateral:** `rowToLoan` usa `isValidLoanTerm` en vez del listado hardcodeado 25/28/30, preservando plazos libres entre 1 y 365.
- **Descartado:** hard delete (sin auditoría), log completo de valores anteriores (excesivo para el producto) y una sección visible de anulados (ruido visual).

#### Hotfix 6a-8b: Restricciones de pago

- **Editar pago:** solo permite cambiar el método (`cash` ↔ `digital`). El monto no es editable: ante un error debe anularse y registrarse de nuevo.
- **Anular pago:** únicamente se permite el último pago activo del préstamo; para llegar a uno anterior se anulan primero los más recientes.
- **Recálculo:** al anular se reconstruyen `paidOffCents`, `isPaid`, `renewalCount` y, cuando corresponde, `disbursedAt` a partir de los pagos activos restantes en orden cronológico.
- **Justificación:** editar importes sin actualizar el préstamo dejaba saldos inconsistentes; anular pagos fuera de orden rompía la secuencia de renovaciones y abonos.

### Sprint 6a-7: Fix teclado móvil tapa input

- **Problema:** en Android, el teclado flotante puede tapar el campo enfocado dentro de sheets con scroll.
- **Solución (Opción B):** `useKeyboardAwareInput` detecta la apertura mediante `visualViewport.resize`; si el control enfocado está dentro del contenedor, hace `scrollIntoView({ block: "center" })` tras un breve delay para que el layout termine de actualizarse.
- **Aplicado en:** `NewLoanSheet`, `NewClientSheet`, `PaymentSheet`, `SettingsSheet` y `LoginScreen`. `ClientDetailSheet` y `ProfileSheet` no tienen inputs editables.
- **Descartado:** Opción A (CSS puro, no confiable en modales Android) y Opción C (librería React Native, no aplica a PWA web).

### Sprint 6a-6: Sección Perfil

- **Decisión UX (Opción A):** avatar persistente en el header en vez de una pestaña nueva; Perfil queda disponible desde Hoy, Préstamos y Clientes sin ocupar espacio en la navegación principal.
- **Contenido consolidado:** `ProfileSheet` muestra nombre del negocio, versión, estado de conexión/sincronización, Ajustes y cierre de sesión con confirmación explícita. Reutiliza `useSync` y `useSession`, sin modificar sus lógicas.
- **Navegación:** Ajustes deja de estar al final de Clientes. Al elegirlo desde Perfil se cierra ese sheet y se abre el `SettingsSheet` existente.
- **Versión:** `APP_VERSION` en `src/config/version.ts` toma `package.json.version` como constante de build-time.

### Sprint 6a-5: WhatsApp ubicuo (Hoy + Detalle Cliente + tab Préstamos)

- **Decisión (Opción B):** Un botón WhatsApp por cada préstamo activo en todas las vistas. Acordado con Fla: si un cliente tiene 2 préstamos activos, aparecen 2 botones (uno por préstamo) con la fecha de entrega como distinción.
- **Single source of truth:** `buildWhatsappUrl` + `buildReminderMessage` en `src/domain/whatsappReminder.ts` — componente `WhatsappButton` (`src/components/WhatsappButton.tsx`) como presentacional reutilizable. NO se duplicó lógica.
- **3 ubicaciones:** Pestaña Hoy (`LoanRowItem`), pestaña Préstamos (`LoanCard` — solo activos), y `ClientDetailSheet` (por cada préstamo `!loan.isPaid`).
- **Excepción cromática:** Fondo verde `#25D366` (WhatsApp brand color). Excepción documentada y justificada: convención universal reconocida por todos los usuarios; usar navy generaría confusión con el botón de cobro.
- **Sin cambios en dominio ni datos:** Alcance puramente UI. No afecta sync, IndexedDB ni lógica de cálculo.
- **Filtro activo:** `!loan.isPaid` (criterio existente en dominio — préstamos pagados no muestran botón WhatsApp).

### Hotfix 6a-8c: Observaciones del cliente (4 correcciones)

**1. Editar préstamo con pagos — bloqueado en repo + UI disabled:**
- `loansRepo.update()` valida pagos activos antes de permitir la edición. Lanza `"No se puede editar un préstamo con pagos registrados. Anula los pagos primero."`.
- `ClientDetailSheet`: botón Editar tiene `disabled={hasPayments}` y `opacity: 0.4` + tooltip explicativo.
- El handler de `EditLoanSheet` en ambas UI (ClientDetailSheet y tab Préstamos) está envuelto en try/catch con `toast.error`.
- **Justificación:** editar capital o tasa después de registrar pagos deja saldos inconsistentes.

**2. Editar desde tab Préstamos — botón Pencil en LoanCard:**
- `LoanCard` acepta prop `onEdit` y muestra botón Pencil solo si `!loan.isPaid`.
- Estado `editingLoanFromTab` en `App` controla qué préstamo se edita.
- `EditLoanSheet` se renderiza al mismo nivel que `PaymentSheet` (al final del árbol del componente principal).
- Tab Hoy (`LoanRowItem`) no tiene botón Editar — es para cobranza rápida.

**3. Input interés en soles (no porcentaje):**
- `NewLoanSheet` y `EditLoanSheet`: campo cambia de "Interés (%)" a "Interés (S/)".
- `rate` se calcula como `interésCents / principalCents` (antes: `ratePct / 100`).
- El porcentaje derivado se muestra como hint debajo del input (`= X.X%`).
- **Internamente `rate` sigue siendo decimal** — sin cambio en el modelo de datos ni en Supabase.
- **Justificación:** Fla piensa en montos ("cobra 200 soles"), no en porcentajes.

**4. Fallback teclado MIUI/Xiaomi:**
- `useKeyboardAwareInput`: estrategia dual.
  - Estrategia 1: `visualViewport.resize` (funciona en Chrome/Samsung).
  - Estrategia 2: `focusin` con delay 300ms (fallback para MIUI/Xiaomi donde `resize` no dispara correctamente).
- El check usa `tagName` en vez de `instanceof Element` (compatible con entornos sin jsdom).
- Doble scroll inofensivo: `scrollIntoView` idempotente al mismo elemento.

### Sprint 6a-9: Reportes PDF — historial por cliente + reporte global

- **Dos reportes nuevos:** `ClientHistoryPdf` (historial completo por cliente: activos + pagados + anulados, con sección aparte "Registros anulados" con motivo y fecha de anulación) y `GlobalReportPdf` (métricas del negocio: cartera activa, cobranza del mes por tipo, morosidad, resumen por cliente, histórico acumulado).
- **`StatementPdf` convive sin cambios** — es el estado de cuenta que Fla envía al cliente; no se toca ni se reemplaza.
- **Descarga:** Historial desde `ClientDetailSheet` (botón junto a "Estado de cuenta"); Reporte global desde `ProfileSheet` (entre Ajustes y Cerrar sesión).
- **Datos del historial:** se leen directo de Dexie (`db.loans`/`db.payments` sin filtro de `cancelledAt`) porque `loansRepo`/`paymentsRepo` excluyen anulados por diseño (Sprint 6a-8); el reporte global sí usa los repos tal cual (ya vienen sin anulados).
- **Dynamic import** de `@react-pdf/renderer` en ambos handlers (mismo patrón que `StatementPdf`) — cada PDF queda en su propio chunk lazy (~2.5kb gzip).
- **Sin migración SQL ni campos nuevos** — solo lectura de datos existentes.
- **Helpers nuevos** en `src/pdf/formatters.ts`: `isCurrentMonth(isoDate, reference)` y `ratingLabel(rating)`.

### Sprint 5b-2: Push notifications diarias 7am

- **Transporte:** Web Push estándar con VAPID (sin Firebase Cloud Messaging) — costo cero, funciona en Chrome/Android sin dependencias externas.
- **Trigger:** Supabase Edge Function `daily-push` (Deno) invocada por `pg_cron` a `0 12 * * *` UTC (= 7am hora Perú, UTC-5 fijo). Alternativa documentada con cron externo si `pg_net` no está disponible.
- **Tabla `push_subscriptions`:** RLS por `owner_id`, `unique(owner_id, endpoint)`; migración `0009_push_subscriptions.sql`.
- **Suscripción:** `src/push/pushSubscription.ts` — `subscribeToPush()` pide permiso, se suscribe al `PushManager` del service worker y guarda `{endpoint, p256dh, auth}` en Supabase; `isPushSubscribed()` solo consulta el estado local. Ambas funciones son no-op seguro (`false`) en modo solo-local o navegadores sin soporte.
- **Opt-in:** `PushPermissionModal` se muestra una vez al primer login (flag `fla_push_dismissed` en `localStorage` — solo UX, no dato de negocio); toggle equivalente y persistente en `SettingsSheet` (no se puede desactivar desde la app, hay que ir a la configuración del navegador — evita un estado "activado en Supabase, revocado en el browser" inconsistente).
- **Service Worker:** `public/sw-push.js` (handlers `push`/`notificationclick`) se importa desde el SW autogenerado por `vite-plugin-pwa` vía `workbox.importScripts` en `vite.config.ts`, para no pisar el SW de precache de Workbox.
- **Edge Function:** calcula por cada `owner_id` los préstamos que vencen hoy o están atrasados (misma regla de tolerancia 7 días y mora que `deriveLoan`), compone el mensaje y envía el push; si el envío devuelve 410 (Gone), borra la suscripción vencida. Solo notifica si hay algo que vence hoy o está atrasado — no molesta por préstamos al día.
- **Lógica de mensaje duplicada a propósito:** `src/domain/dailyBrief.ts` (frontend, toast in-app) y la Edge Function (Deno) no comparten código — son runtimes distintos sin forma práctica de compartir un módulo entre Vite/browser y Supabase Edge Functions.
- **Deploy manual, no ejecutado por el agente:** aplicar la migración, desplegar la Edge Function, configurar secrets VAPID y habilitar `pg_cron`/`pg_net` requieren el Supabase CLI autenticado y acceso a dashboards — ver checklist en `docs/DEPLOY_PUSH.md`.

### Sprint 7a-1: Header Hoy — logo más grande, sin saludo

- **Solo presentación** en el header navy de la pestaña Hoy (`App.tsx`): el logo (`BrandLogo`) pasa de 18px a 64px; se elimina el saludo ("Buen día · fecha · hora") y la etiqueta "Debes cobrar hoy" — el monto grande de cobro del día queda directo debajo de la fila del logo.
- **No afecta** el toast del brief diario (`src/domain/dailyBrief.ts`) ni los mini-cards "Vencen hoy"/"Atrasados", que se mantienen sin cambios.

### Sprint 7a-3b: Reducir borde y sombra del logo PDF

- **Ajuste de parámetros** en `scripts/process-logo.py`: outline blanco de 9px a 3px, drop-shadow de offset (0,5px)/blur 10px a (0,2px)/blur 4px (opacidad 28% sin cambios).
- **Regenerado** `public/logo-pdf.png` y `src/assets/logo-pdf.png` corriendo el script — mismo pipeline documentado en Sprint 7a-3, solo cambian los valores de intensidad del borde/sombra.
- **Solo afecta** el logo usado en los 4 PDF components (`react-pdf`); no toca `<BrandLogo />` de la UI ni lógica de dominio.

### Sprint 7a-4: Descargar comprobante desde historial de pagos

- **Botón por pago:** en `ClientDetailSheet`, cada fila del historial de pagos (préstamos activos o pagados) tiene un ícono `FileDown` discreto (navy) que regenera y descarga el mismo `PaymentReceiptPdf` que ya se genera al registrar el cobro — mismo componente, mismo patrón de dynamic import, sin duplicar esa lógica.
- **Problema:** el comprobante necesita `balanceCentsAfterPayment` (saldo justo después de ESE pago), dato que no se guarda por pago — el préstamo solo conserva su `paidOffCents` acumulado actual, que ya incluye pagos posteriores y se resetea en cada renovación.
- **Solución — nuevo módulo puro `src/domain/loanBalanceHistory.ts`** (con tests): reconstruye ese saldo reproduciendo la secuencia completa de pagos activos del préstamo desde su primer ciclo (retrocediendo `disbursedAt` un `termDays` por cada renovación previa) y reaplicándolos en orden con `applyPayment` hasta el pago objetivo, devolviendo `deriveLoan(...).balanceCents`. Reutiliza `applyPayment`/`deriveLoan` de `loanPayment.ts`/`loanRules.ts` tal cual — no se modificó ninguna regla de interés/mora/renovación existente, solo se compuso.
- **Limitación aceptada:** si el préstamo fue editado (capital/tasa/plazo) entre pagos históricos, la reconstrucción usa los valores actuales para todos los ciclos — misma limitación que ya tenía `rebuildLoanAfterPaymentCancellation` (Hotfix 6a-8b) para el mismo escenario.

### Sprint 7a-5: Saldo en card de préstamo + botón "Cobrar" desde ClientDetailSheet

- **Saldo visible:** cada card de préstamo en `ClientDetailSheet` muestra "Saldo: S/ X" (navy) para préstamos activos, "Pagado" (verde) para pagados y "Anulado" (gris) para anulados — reemplaza el antiguo texto genérico "Activo"/"Pagado". Usa `deriveLoan(loan, startOfToday())`, ya calculado una sola vez por card (antes solo se calculaba condicionalmente para el botón de WhatsApp).
- **Botón "Cobrar":** visible solo en préstamos activos (`!isPaid && !cancelledAt`); dispara `onPayLoan(loan.id)`, prop nueva que `App.tsx` conecta directo a `setPayingId` — el mismo `PaymentSheet` que ya usan las pestañas Hoy/Préstamos, sin componente ni lógica de pago duplicada. Como `rows` en `App.tsx` cubre todos los préstamos (no solo los de "Hoy"), `payingRow` encuentra el préstamo sin cambios adicionales.
- **Orden de overlays:** ambos overlays comparten `z-index:50` (`.ovl`), así que el orden en el DOM decide cuál queda encima. Se reordenó el JSX en `App.tsx` para que `PaymentSheet` se renderice después de `ClientDetailSheet` — si no, al abrir "Cobrar" desde el detalle del cliente, el sheet de pago hubiera quedado tapado detrás.
- **Saldo se actualiza solo:** tras registrar el pago, `loans`/`payments` (Dexie `useLiveQuery`) se refrescan y `ClientDetailSheet` re-renderiza con el saldo nuevo — no hizo falta ningún estado ni prop adicional para esto.

### Hotfix diagnóstico → causa raíz confirmada: error al descargar Historial PDF (caso ELVIA PÉREZ)

- **Reporte inicial:** para un cliente con un préstamo + pago creados y luego anulados (soft delete de ambos), la descarga de "Historial" fallaba; otros clientes funcionaban bien.
- **Primera investigación (sin logging):** se reprodujo el escenario de anulación en cascada con datos sintéticos contra `ClientHistoryPdf` y no crasheó — el filtro por `cancelledAt` estaba bien. Como los tres handlers de descarga en `ClientDetailSheet` (`handleDownloadStatement`, `handleDownloadHistory`, `handleDownloadReceipt`) atrapaban el error con `catch { toast.error(...) }` **sin loguearlo**, se agregó `console.error` en los tres para poder ver el error real la próxima vez.
- **Causa raíz confirmada con el error real:** `Could not resolve font for Helvetica-Bold, fontWeight 400, fontStyle italic`. El préstamo de ELVIA PÉREZ no solo fue anulado — antes de anularlo, también fue **editado** (`loan.editedAt` truthy), lo que en `ClientHistoryPdf.tsx` activaba el badge `" (editado)"` (estilo `editedBadge`, con `fontStyle: "italic"`) anidado dentro del `<Text style={styles.loanBoxTitle}>` del título del préstamo, que tiene `fontFamily: "Helvetica-Bold"`. react-pdf hereda el `fontFamily` del padre en el `<Text>` anidado y no sabe resolver la combinación "Helvetica-Bold" + `fontStyle: italic` (los únicos fonts estándar disponibles son Helvetica / Helvetica-Bold / Helvetica-Oblique / Helvetica-BoldOblique, no hay una variante bold-italic registrada bajo ese nombre) — por eso solo fallaba para préstamos editados (y en este caso, coincidentemente, también anulados).
- **Fix:** se quitó `fontStyle: "italic"` de `editedBadge` en `src/pdf/ClientHistoryPdf.tsx` — el color gris (`MUTED`) y el texto explícito "(editado)" ya bastan como indicador visual, sin depender de una variante de fuente que react-pdf no puede resolver. Se verificó que es el único uso de `fontStyle: "italic"` en todo `src/pdf/*`.
- **Test de regresión:** `src/pdf/ClientHistoryPdf.test.ts` — genera el PDF real (`pdf(...).toBlob()`, mismo código que producción) para un préstamo editado-y-anulado con pago anulado en cascada, y para un cliente sin préstamos.
- **Lección:** en PDFs con react-pdf, evitar `fontStyle`/`fontWeight` en `<Text>` anidados dentro de otro `<Text>` con `fontFamily` ya resuelto a una variante (ej. `"Helvetica-Bold"` en vez de `"Helvetica"` + `fontWeight: "bold"`) — la combinación puede no tener una fuente registrada y falla en tiempo de generación, no en build ni en tests que no ejerciten esa combinación de datos.

### Sprint 7a-6: Búsqueda en tab Préstamos

- **Mismo patrón que Clientes:** input `.inp` con placeholder "Buscar préstamo por cliente...", estado `loanSearch` en `App.tsx`, filtra por `clientNameMatches(r.client.name, loanSearch)` — la misma función de `src/domain/clientName.ts` que ya usa la búsqueda de Clientes (case/acento-insensitive).
- **Derivados:** `filteredActiveRows`/`filteredPaidRows` se calculan junto a `activeRows`/`paidRows` (no dentro del JSX), y alimentan tanto la lista de préstamos activos como la sección "Pagados (historial)".
- **Vacíos diferenciados:** "Aún no tienes préstamos activos" (cero préstamos en total, con botón para crear) vs. "No se encontraron préstamos para '...'" (hay préstamos pero ninguno matchea la búsqueda) — mismo criterio que ya existía implícitamente en Clientes, ahora explícito en ambos tabs.
- **Sin cambios de dominio:** el filtro es puro presentacional sobre `rows` (ya calculado con `deriveLoan`); no toca `loanRules.ts` ni ningún repositorio.
