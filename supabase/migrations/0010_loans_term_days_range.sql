-- 0010_loans_term_days_range.sql — Formaliza en el repo un ALTER TABLE que ya
-- se aplicó manualmente en producción (SQL Editor de Supabase). El frontend
-- permite plazo libre 1-365 días desde el sprint 6a-4, pero la constraint de
-- loans.term_days seguía restringida a {25, 28, 30} (heredada de 0001_init.sql,
-- reafirmada en 0004_revert_installments.sql) — cualquier préstamo con un
-- plazo fuera de ese set fallaba al sincronizar a Supabase, aunque se
-- guardaba bien en local. IF EXISTS hace el DROP idempotente para poder
-- correr este archivo sin error contra la base real, que ya tiene el fix.
alter table public.loans drop constraint if exists loans_term_days_check;
alter table public.loans add constraint loans_term_days_check check (term_days >= 1 and term_days <= 365);
