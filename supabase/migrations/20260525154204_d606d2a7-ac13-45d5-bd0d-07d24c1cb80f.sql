
-- Additive nullable column for branch typing
ALTER TABLE public.business_branches
  ADD COLUMN IF NOT EXISTS location_type text;

-- Default LOC- reference for new branches (existing rows keep their value)
ALTER TABLE public.business_branches
  ALTER COLUMN ref_id SET DEFAULT public.generate_ref_id('LOC', 'seq_loc');
