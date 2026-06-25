
ALTER TYPE public.milestone_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE public.milestone_status ADD VALUE IF NOT EXISTS 'submitted';
ALTER TYPE public.milestone_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.milestone_status ADD VALUE IF NOT EXISTS 'revision_requested';
ALTER TYPE public.milestone_status ADD VALUE IF NOT EXISTS 'released';
