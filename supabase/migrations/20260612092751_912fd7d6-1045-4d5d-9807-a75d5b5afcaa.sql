-- 1) CREATE TABLE
CREATE TABLE public.admin_identity_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'global',
  tokens jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_identity_tokens_scope_unique UNIQUE (scope)
);

-- 2) GRANTS
GRANT SELECT ON public.admin_identity_tokens TO authenticated;
GRANT ALL ON public.admin_identity_tokens TO service_role;

-- 3) ENABLE RLS
ALTER TABLE public.admin_identity_tokens ENABLE ROW LEVEL SECURITY;

-- 4) POLICIES
CREATE POLICY "authenticated_read_identity_tokens"
  ON public.admin_identity_tokens
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admin_insert_identity_tokens"
  ON public.admin_identity_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin_update_identity_tokens"
  ON public.admin_identity_tokens
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin_delete_identity_tokens"
  ON public.admin_identity_tokens
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger (function already exists in project)
CREATE TRIGGER trg_admin_identity_tokens_updated_at
  BEFORE UPDATE ON public.admin_identity_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a single default global row so the app always finds a record.
INSERT INTO public.admin_identity_tokens (scope, tokens)
VALUES ('global', '{}'::jsonb)
ON CONFLICT (scope) DO NOTHING;