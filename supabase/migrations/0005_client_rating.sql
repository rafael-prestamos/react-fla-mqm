alter table public.clients
  add column if not exists rating text not null default 'good' check (rating in ('good','slow','bad')),
  add column if not exists max_days_late_historical int not null default 0;
