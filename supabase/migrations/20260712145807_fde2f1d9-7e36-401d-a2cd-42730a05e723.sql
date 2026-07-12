-- S2: FK integrity for author/actor columns on newly-added RFQ tables/columns.
-- Relax NOT NULL on author_user_id so ON DELETE SET NULL is legal.
ALTER TABLE public.rfq_clarifications
  ALTER COLUMN author_user_id DROP NOT NULL;

ALTER TABLE public.rfq_clarifications
  ADD CONSTRAINT rfq_clarifications_author_user_id_fkey
  FOREIGN KEY (author_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.opportunity_bids
  ADD CONSTRAINT opportunity_bids_revision_requested_by_fkey
  FOREIGN KEY (revision_requested_by) REFERENCES auth.users(id) ON DELETE SET NULL;