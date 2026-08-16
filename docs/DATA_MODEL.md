# Modelo de datos — Fla MpM

Fuente: `src/types/domain.ts`

## Convenciones
- Todo ID = string UUID v4 (generados con `newId()` en `src/lib/id.ts`).
- Todas las fechas = ISO 8601. Distinción importante:
  - `disbursedAt`, `dueDate` (derivada): solo día (`YYYY-MM-DD`).
  - `createdAt`, `updatedAt`, `paidAt`: timestamp completo.
- Todos los montos: enteros en céntimos (100 céntimos = 1 sol). Nunca float.
- Postgres: snake_case; TypeScript: camelCase. Mapeo en `src/sync/mappers.ts`.

## Entidades

### Client
| Campo | Tipo | Requerido | Descripción | Invariante |
|---|---|---|---|---|
| id | string (UUID) | sí | PK | |
| dni | string | sí | 8 dígitos | `/^\d{8}$/` |
| name | string | sí | Nombre completo. **Siempre normalizado a UPPERCASE** post sprint 6a-3 (sin espacios extras y locale-aware `es-PE`). | trim, length ≥ 2 |
| phone | string | sí | Celular | `/^9\d{8}$/` (Perú) |
| rating | "good" \| "slow" \| "bad" | sí | Cacheado, monótono ascendente | nunca baja |
| maxDaysLateHistorical | number (int) | sí | Máximo atraso alguna vez | ≥ 0, nunca disminuye |
| createdAt | string ISO | sí | | |
| updatedAt | string ISO | sí | | last-write-wins usa este |

### Loan
| Campo | Tipo | Requerido | Descripción | Invariante |
|---|---|---|---|---|
| id | string (UUID) | sí | PK | |
| clientId | string (UUID) | sí | FK a Client | |
| principalCents | number (int) | sí | Capital prestado | > 0 |
| rate | number | sí | Tasa por período | > 0 |
| termDays | number (int, 1-365) | sí | Plazo en días. Libre: cualquier entero 1-365. Presets comunes: 25, 28, 30 (sprint 6a-4). | ≥ 1, ≤ 365, entero |

| disbursedAt | string ISO | sí | Fecha de entrega (YYYY-MM-DD) | |
| paidOffCents | number (int) | sí | Abonos acumulados | ≥ 0 |
| renewalCount | number (int) | sí | Veces que renovó pagando solo interés | ≥ 0 |
| isPaid | boolean | sí | ¿Está pagado en su totalidad? | |
| createdAt | string ISO | sí | | |
| updatedAt | string ISO | sí | | last-write-wins usa este |

### Payment
| Campo | Tipo | Requerido | Descripción | Invariante |
|---|---|---|---|---|
| id | string (UUID) | sí | PK | inmutable tras creación |
| loanId | string (UUID) | sí | FK a Loan | |
| type | PaymentType | sí | "full" \| "interest" \| "partial" | |
| amountCents | number (int) | sí | Monto cobrado | > 0 |
| method | PaymentMethod | sí | "cash" \| "digital" | |
| daysLate | number (int) | sí | Atraso al momento de pagar | ≥ 0 |
| paidAt | string ISO | sí | Fecha de pago exacta | |

### BusinessSettings
| Campo | Tipo | Requerido | Descripción | Invariante |
|---|---|---|---|---|
| id | string | sí | Singleton | Siempre "singleton" |
| businessName | string | sí | Nombre del negocio (ej. "Fla") | |
| phone | string | sí | Celular | |
| yape | string | sí | Cuenta Yape | |
| yapeHolder | string | sí | Titular Yape | |
| bcpSoles | string | sí | Cuenta BCP | |
| bcpSolesHolder | string | sí | Titular BCP | |
| bcpInterbank | string | sí | CCI BCP | |
| bcpInterbankHolder | string | sí | Titular CCI BCP | |
| updatedAt | string ISO | sí | | last-write-wins usa este |

### OutboxOp (solo local, no sync)
| Campo | Tipo | Requerido | Descripción | Invariante |
|---|---|---|---|---|
| id | number | sí | PK (Autoincremental Dexie) | |
| entity | SyncEntity | sí | Tabla afectada | |
| op | "upsert" \| "delete" | sí | Operación a realizar | |
| recordId | string (UUID) | sí | PK del registro | |
| payload | object \| null | no | Datos de la entidad | |
| enqueuedAt | string ISO | sí | | |

## Enumeraciones
- LoanTerm: 25 | 28 | 30 (días).
- PaymentType: "full" | "interest" | "partial".
- PaymentMethod: "cash" | "digital".
- ClientRating: "good" | "slow" | "bad".
- LoanStatus (derivado, no persistido): "active" | "dueSoon" | "dueToday" | "grace" | "lateInterest" | "paid".

## Campos derivados (calculados, no persistidos)
- `interestCents` = round(principalCents × rate).
- `totalCents` = principalCents + interestCents.
- `dueDate` = disbursedAt + termDays.
- `daysLate` = diffDays(reference, dueDate).
- `latePeriods` = 0 si daysLate ≤ 7 o si LATE_INTEREST_ENABLED=false; sino 1 + floor((daysLate-8)/30).
- `lateInterestCents` = latePeriods × interestCents.
- `debtCents` = totalCents + lateInterestCents.
- `balanceCents` = 0 si isPaid; sino max(0, debtCents - paidOffCents).
Todos calculados en `src/domain/loanRules.ts` → `deriveLoan()`.

## Migraciones aplicadas
| # | Archivo | Estado | Contenido resumido |
|---|---|---|---|
| 0001 | `0001_init.sql` | ✅ aplicado | Tablas clients/loans/payments + RLS |
| 0003 | `0003_installments.sql` | ⚠️ aplicado + revertido | Modelo de cuotas — obsoleto |
| 0004 | `0004_revert_installments.sql` | ✅ aplicado | Revert al modelo pago único |
| 0005 | `0005_client_rating.sql` | ✅ aplicado | Rating + max_days_late_historical |
| 0006 | `0006_settings.sql` | ✅ aplicado | Tabla settings singleton |
| 0007 | `0007_settings_account_holders.sql` | ✅ aplicado | Titulares por cuenta |

## Versiones de Dexie
| Versión | Cambios |
|---|---|
| v1 | Schema inicial (clients, loans, payments, outbox) |
| v2 | +rating +maxDaysLateHistorical en clients |
| v3 | +settings (tabla nueva) |
| v4 | +yapeHolder +bcpSolesHolder +bcpInterbankHolder en settings |
