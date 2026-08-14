-- IMPORTANTE: aplicar MANUALMENTE en el dashboard de Supabase antes del release.
-- Wipe total (Q6=a del grill: solo hay datos de prueba).
truncate table public.payments, public.loans, public.clients cascade;

-- Rediseño de loans
alter table public.loans
  drop column if exists paid_off_cents,
  drop column if exists renewal_count,
  drop column if exists term_days,
  add column if not exists installment_count int not null default 1 check (installment_count between 1 and 60),
  add column if not exists frequency text not null default 'monthly' check (frequency in ('weekly','biweekly','monthly'));

alter table public.loans alter column installment_count drop default;
alter table public.loans alter column frequency drop default;

-- Nueva tabla installments
create table if not exists public.installments (
  id           uuid primary key,
  owner_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  loan_id      uuid not null references public.loans(id) on delete cascade,
  index        int not null,
  due_date     date not null,
  amount_cents bigint not null,
  paid_cents   bigint not null default 0,
  status       text not null default 'pending' check (status in ('pending','paid')),
  paid_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_installments_loan on public.installments(loan_id);
create index if not exists idx_installments_due on public.installments(due_date);

alter table public.installments enable row level security;
create policy "installments_owner" on public.installments
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- payments ahora referencia installment
alter table public.payments
  drop column if exists type,
  add column if not exists installment_id uuid references public.installments(id) on delete cascade;
