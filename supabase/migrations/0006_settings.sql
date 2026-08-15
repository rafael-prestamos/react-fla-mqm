-- Tabla singleton de settings de negocio (nombre, teléfono, cuentas de pago).
-- Cada usuario tiene su propia fila (filtrada por RLS).

create table if not exists public.settings (
  id             text not null,                                -- always "singleton" per user
  owner_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  business_name  text not null default 'Fla',
  phone          text not null default '',
  yape           text not null default '',
  bcp_soles      text not null default '',
  bcp_interbank  text not null default '',
  updated_at     timestamptz not null default now(),
  primary key (id, owner_id)
);

alter table public.settings enable row level security;

create policy "settings_owner" on public.settings
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
