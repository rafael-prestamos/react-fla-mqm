-- Sprint revert: volver al modelo pago-único (termDays 25/28/30).
-- Aplicar MANUALMENTE en el dashboard de Supabase. Contiene TRUNCATE.

-- Wipe seguro: en la nueva realidad no hay data que preservar.
truncate table public.payments, public.installments, public.loans, public.clients cascade;

-- Drop tabla installments (con policy)
drop policy if exists "installments_owner" on public.installments;
drop table if exists public.installments;

-- Restaurar columnas de loans del modelo pago-único
alter table public.loans
  drop column if exists installment_count,
  drop column if exists frequency,
  add column if not exists term_days smallint not null default 30 check (term_days in (25, 28, 30)),
  add column if not exists paid_off_cents bigint not null default 0,
  add column if not exists renewal_count int not null default 0;

alter table public.loans alter column term_days drop default;
alter table public.loans alter column paid_off_cents drop default;
alter table public.loans alter column renewal_count drop default;

-- Restaurar payments al modelo pago-único
alter table public.payments
  drop column if exists installment_id,
  add column if not exists type text not null default 'partial' check (type in ('full', 'interest', 'partial'));

alter table public.payments alter column type drop default;
