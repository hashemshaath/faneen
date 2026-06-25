ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_dates_chk;
ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_dates_chk
  CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date);