# Requisitos — Fla MpM

## Contexto de negocio
Fla es una prestamista informal en Perú que maneja ~8 clientes activos. Hoy lleva su control en cuaderno/spreadsheet, propenso a errores en cálculo de interés, atrasos y saldos. La app reemplaza ese control.

## Reglas de negocio
- Plazo: 25, 28 o 30 días (`src/types/domain.ts` → LoanTerm).
- Interés simple: interés = capital × tasa. `src/domain/loanRules.ts`.
- Renovación: cobra solo interés; corre disbursedAt +termDays. `src/domain/loanPayment.ts`.
- Abono parcial: cubre primero interés pendiente, sobrante baja capital. `src/domain/loanPayment.ts`.
- Tolerancia de atraso: 7 días. `src/domain/loanRules.ts` → GRACE_DAYS.
- Mora ⚠️: 1 interés extra por cada 30 días de atraso pasada la tolerancia. Flag `LATE_INTEREST_ENABLED` en `src/domain/loanRules.ts`, hoy FALSE. Requiere confirmación verbal con Fla antes de activar.
- Clasificación de cliente: good ≤7d atraso máx histórico; slow 8-30d; bad >30d. Rating cacheado, monótono ascendente (nunca baja). `src/domain/loanRules.ts` → classifyByMaxDaysLate.
- "Mal pagador" es solo advertencia — no bloquea prestar.

## Historias de usuario implementadas
- [H1] Como Fla quiero registrar un cliente nuevo con DNI/nombre/celular. `src/App.tsx` (sección "Nuevo Cliente").
- [H2] Como Fla quiero crear un préstamo (capital, tasa, plazo) para un cliente. `src/App.tsx` (sección "Nuevo Préstamo").
- [H3] Como Fla quiero cargar mi cartera actual con préstamos históricos (fecha entrega retro, renovaciones previas, saldo actual). `src/domain/loanBackfill.ts`.
- [H4] Como Fla quiero cobrar un préstamo (total / solo interés / abono parcial) con método efectivo o virtual. `src/domain/loanPayment.ts` y `src/components/PaymentSheet.tsx`.
- [H5] Como Fla quiero ver "Hoy" con préstamos por vencer, que vencen hoy y atrasados. Sección Hoy en `src/App.tsx`.
- [H6] Como Fla quiero un botón WhatsApp que abra un mensaje pre-armado con monto y cuentas. `src/components/WhatsappButton.tsx`.
- [H7] Como Fla quiero descargar comprobante PDF tras cobrar. `src/pdf/PaymentReceiptPdf.tsx`.
- [H8] Como Fla quiero descargar estado de cuenta PDF de un cliente. `src/pdf/StatementPdf.tsx`.
- [H9] Como Fla quiero recibir un aviso en la app la primera vez que la abro cada día con lo que debo cobrar. `src/ui/useDailyBrief.ts`.
- [H10] Como Fla quiero editar mis datos de negocio (nombre, teléfono, cuentas Yape/BCP/CCI con sus titulares). `src/components/SettingsSheet.tsx`.
- [H11] Como Fla quiero usar la app offline y que sincronice cuando vuelva la conexión. `src/sync/SyncEngine.tsx` y repositorios.
- [H12] Como Fla quiero que solo YO vea mis datos (login email+password). `src/auth/LoginScreen.tsx` + RLS Supabase.

## Historias pendientes (no implementadas todavía)
- [H13] Push notification a las 7 a.m. con lo del día (Sprint 5b-2 pendiente).
- [H14] Compartir comprobante directamente por WhatsApp desde el mismo botón. Sin priorizar.

## No es requisito (fuera de scope explícito)
- Modelo de cuotas: se intentó, se revirtió tras confirmar con Fla que solo maneja pago único. NO reactivar.
- Multi-usuario / colaboradores por cartera: Fla comparte credenciales si necesita ayudante.
- Historial de mora automática cobrada: flag LATE_INTEREST_ENABLED apagado hasta confirmación verbal.

## Invariantes que NO se pueden romper
- Montos: SIEMPRE enteros en céntimos.
- Offline-first: cualquier acción debe funcionar sin conexión.
- 1 dispositivo = 1 dueño. Al cambiar de user (o primer login), Dexie local se nukea.
- last-write-wins por updatedAt en sync.
