-- 0001_init.sql — Esquema inicial de Fla MpM + Row Level Security.
-- Columnas en snake_case (idiomático en Postgres). El motor de sync mapea
-- camelCase <-> snake_case en Sprint 4.
-- owner_id se autocompleta con el usuario autenticado (auth.uid()).

-- Clientes -----------------------------------------------------------------
create table if not exists public.clients (
  id          uuid primary key,
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dni         text not null,
  name        text not null,
  phone       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Préstamos ----------------------------------------------------------------
create table if not exists public.loans (
  id              uuid primary key,
  owner_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id       uuid not null references public.clients(id) on delete cascade,
  principal_cents bigint not null,
  rate            numeric not null,
  term_days       smallint not null check (term_days in (25, 28, 30)),
  disbursed_at    date not null,
  paid_off_cents  bigint not null default 0,
  renewal_count   int not null default 0,
  is_paid         boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Pagos --------------------------------------------------------------------
create table if not exists public.payments (
  id           uuid primary key,
  owner_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  loan_id      uuid not null references public.loans(id) on delete cascade,
  type         text not null check (type in ('full', 'interest', 'partial')),
  amount_cents bigint not null,
  method       text not null check (method in ('cash', 'digital')),
  days_late    int not null default 0,
  paid_at      timestamptz not null default now()
);

create index if not exists idx_loans_client on public.loans(client_id);
create index if not exists idx_payments_loan on public.payments(loan_id);

-- Row Level Security: cada usuario solo ve/edita sus propias filas ----------
alter table public.clients  enable row level security;
alter table public.loans    enable row level security;
alter table public.payments enable row level security;

create policy "clients_owner" on public.clients
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "loans_owner" on public.loans
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "payments_owner" on public.payments
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
