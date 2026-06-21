
-- PERSONAL PROJECTS OWNERSHIP MODEL — Option A
-- 1) Schema: make business_id nullable, add owner_user_id, add exclusive XOR check + index.
ALTER TABLE public.projects
  ALTER COLUMN business_id DROP NOT NULL;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_projects_owner_user_id
  ON public.projects(owner_user_id)
  WHERE owner_user_id IS NOT NULL;

-- Exclusive XOR: exactly one of business_id / owner_user_id must be set.
-- Safe: today every row has business_id set and owner_user_id is NULL.
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_ownership_xor_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_ownership_xor_check
  CHECK (
    (business_id IS NOT NULL AND owner_user_id IS NULL)
    OR
    (business_id IS NULL AND owner_user_id IS NOT NULL)
  );

-- 2) RLS — add personal-ownership policies. Keep existing business policies
-- and the existing public "published" read policy untouched.
DROP POLICY IF EXISTS "Owners can view personal projects" ON public.projects;
CREATE POLICY "Owners can view personal projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can insert personal projects" ON public.projects;
CREATE POLICY "Owners can insert personal projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND business_id IS NULL
  );

DROP POLICY IF EXISTS "Owners can update personal projects" ON public.projects;
CREATE POLICY "Owners can update personal projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid() AND business_id IS NULL);

DROP POLICY IF EXISTS "Owners can delete personal projects" ON public.projects;
CREATE POLICY "Owners can delete personal projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (owner_user_id = auth.uid());
