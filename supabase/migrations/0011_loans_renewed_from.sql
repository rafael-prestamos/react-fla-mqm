-- 0011_loans_renewed_from.sql — Sprint 7d-1: renovaciones flexibles.
-- Cada renovación crea un préstamo NUEVO (capital/interés/plazo propios) enlazado al
-- anterior. renewed_from_loan_id apunta al préstamo que se cerró al renovar.
-- ON DELETE SET NULL: el hard delete de cliente (sprint 7c-1) borra los préstamos
-- uno a uno en cualquier orden sin violar la FK.
alter table public.loans
  add column if not exists renewed_from_loan_id uuid null references public.loans(id) on delete set null;

create index if not exists idx_loans_renewed_from on public.loans(renewed_from_loan_id);
