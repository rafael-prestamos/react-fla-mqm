alter table public.settings
  add column if not exists yape_holder text not null default 'Rafael Rojas',
  add column if not exists bcp_soles_holder text not null default 'Rafael Rojas',
  add column if not exists bcp_interbank_holder text not null default 'Rafael Rojas';
