-- ============================================================================
-- ORG-RBAC-STRUCTURE-2 Step 4: Additive workspace governance schema
-- Additive only. Does not modify existing tables, RLS, auth, or payments.
-- ============================================================================

-- TEAM ref sequence (start at 1000 per project convention)
CREATE SEQUENCE IF NOT EXISTS public.seq_team START WITH 1000;

-- ----------------------------------------------------------------------------
-- 1) business_teams
-- ----------------------------------------------------------------------------
CREATE TABLE public.business_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  ref_id text UNIQUE NOT NULL DEFAULT public.generate_ref_id('TEAM', 'seq_team'),
  name text NOT NULL,
  description text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_teams_name_len_chk CHECK (char_length(name) BETWEEN 1 AND 120),
  CONSTRAINT business_teams_ref_id_pattern_chk CHECK (ref_id ~ '^TEAM-[0-9]{4,}$')
);

CREATE INDEX idx_business_teams_business_id ON public.business_teams(business_id);
CREATE INDEX idx_business_teams_is_active ON public.business_teams(is_active);

GRANT SELECT, INSERT, UPDATE ON public.business_teams TO authenticated;
GRANT ALL ON public.business_teams TO service_role;

ALTER TABLE public.business_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams: owners/managers/staff/admins can view"
  ON public.business_teams FOR SELECT TO authenticated
  USING (
    public.is_business_owner_or_manager(auth.uid(), business_id)
    OR public.is_business_staff(auth.uid(), business_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Teams: owners/managers/admins can insert"
  ON public.business_teams FOR INSERT TO authenticated
  WITH CHECK (
    public.is_business_owner_or_manager(auth.uid(), business_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Teams: owners/managers/admins can update"
  ON public.business_teams FOR UPDATE TO authenticated
  USING (
    public.is_business_owner_or_manager(auth.uid(), business_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    public.is_business_owner_or_manager(auth.uid(), business_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE TRIGGER trg_business_teams_updated_at
  BEFORE UPDATE ON public.business_teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 2) business_team_members
-- ----------------------------------------------------------------------------
CREATE TABLE public.business_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.business_teams(id) ON DELETE CASCADE,
  business_staff_id uuid NOT NULL REFERENCES public.business_staff(id) ON DELETE CASCADE,
  role_in_team text NOT NULL DEFAULT 'member',
  is_active boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  CONSTRAINT business_team_members_role_chk CHECK (role_in_team IN ('lead','member','viewer')),
  CONSTRAINT business_team_members_unique UNIQUE (team_id, business_staff_id)
);

CREATE INDEX idx_business_team_members_team_id ON public.business_team_members(team_id);
CREATE INDEX idx_business_team_members_staff_id ON public.business_team_members(business_staff_id);

GRANT SELECT, INSERT, UPDATE ON public.business_team_members TO authenticated;
GRANT ALL ON public.business_team_members TO service_role;

ALTER TABLE public.business_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "TeamMembers: owners/managers/staff/admins can view"
  ON public.business_team_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_teams t
      WHERE t.id = team_id
        AND (
          public.is_business_owner_or_manager(auth.uid(), t.business_id)
          OR public.is_business_staff(auth.uid(), t.business_id)
          OR public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'super_admin'::app_role)
        )
    )
  );

CREATE POLICY "TeamMembers: owners/managers/admins can insert"
  ON public.business_team_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_teams t
      WHERE t.id = team_id
        AND (
          public.is_business_owner_or_manager(auth.uid(), t.business_id)
          OR public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'super_admin'::app_role)
        )
    )
  );

CREATE POLICY "TeamMembers: owners/managers/admins can update"
  ON public.business_team_members FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_teams t
      WHERE t.id = team_id
        AND (
          public.is_business_owner_or_manager(auth.uid(), t.business_id)
          OR public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'super_admin'::app_role)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_teams t
      WHERE t.id = team_id
        AND (
          public.is_business_owner_or_manager(auth.uid(), t.business_id)
          OR public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'super_admin'::app_role)
        )
    )
  );

-- ----------------------------------------------------------------------------
-- 3) delegated_workspace_access
-- ----------------------------------------------------------------------------
CREATE TABLE public.delegated_workspace_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  delegated_to_user_id uuid NOT NULL,
  delegated_by_user_id uuid NOT NULL,
  reason text NOT NULL,
  permissions text[] NOT NULL DEFAULT '{}',
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz NULL,
  revoked_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT delegated_expires_after_starts_chk CHECK (expires_at > starts_at),
  CONSTRAINT delegated_expires_max_30d_chk CHECK (expires_at <= starts_at + interval '30 days'),
  CONSTRAINT delegated_reason_len_chk CHECK (char_length(reason) BETWEEN 5 AND 500)
);

CREATE INDEX idx_delegated_access_business_id ON public.delegated_workspace_access(business_id);
CREATE INDEX idx_delegated_access_to_user ON public.delegated_workspace_access(delegated_to_user_id);
CREATE INDEX idx_delegated_access_by_user ON public.delegated_workspace_access(delegated_by_user_id);

GRANT SELECT, INSERT, UPDATE ON public.delegated_workspace_access TO authenticated;
GRANT ALL ON public.delegated_workspace_access TO service_role;

ALTER TABLE public.delegated_workspace_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Delegated: involved parties and admins can view"
  ON public.delegated_workspace_access FOR SELECT TO authenticated
  USING (
    auth.uid() = delegated_to_user_id
    OR auth.uid() = delegated_by_user_id
    OR public.is_business_owner_or_manager(auth.uid(), business_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Delegated: owners/managers/admins can insert"
  ON public.delegated_workspace_access FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = delegated_by_user_id
    AND (
      public.is_business_owner_or_manager(auth.uid(), business_id)
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

CREATE POLICY "Delegated: owners/managers/admins can update (revoke)"
  ON public.delegated_workspace_access FOR UPDATE TO authenticated
  USING (
    public.is_business_owner_or_manager(auth.uid(), business_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    public.is_business_owner_or_manager(auth.uid(), business_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- ----------------------------------------------------------------------------
-- 4) staff_activity_sessions
-- ----------------------------------------------------------------------------
CREATE TABLE public.staff_activity_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  business_staff_id uuid NULL REFERENCES public.business_staff(id) ON DELETE SET NULL,
  session_label text NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'web',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT staff_activity_source_chk CHECK (source IN ('web','mobile','admin','system')),
  CONSTRAINT staff_activity_metadata_object_chk CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_staff_activity_business_id ON public.staff_activity_sessions(business_id);
CREATE INDEX idx_staff_activity_user_id ON public.staff_activity_sessions(user_id);
CREATE INDEX idx_staff_activity_last_seen ON public.staff_activity_sessions(last_seen_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.staff_activity_sessions TO authenticated;
GRANT ALL ON public.staff_activity_sessions TO service_role;

ALTER TABLE public.staff_activity_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "StaffSessions: self/owners/managers/admins can view"
  ON public.staff_activity_sessions FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_business_owner_or_manager(auth.uid(), business_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "StaffSessions: user can insert own"
  ON public.staff_activity_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "StaffSessions: user can update own"
  ON public.staff_activity_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5) Read-only helper functions
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_active_delegated_access(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.delegated_workspace_access
    WHERE delegated_to_user_id = _user_id
      AND business_id = _business_id
      AND revoked_at IS NULL
      AND now() BETWEEN starts_at AND expires_at
  );
$$;

CREATE OR REPLACE FUNCTION public.get_active_delegated_permissions(_user_id uuid, _business_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT array_agg(DISTINCT perm)
      FROM public.delegated_workspace_access d,
           LATERAL unnest(d.permissions) AS perm
      WHERE d.delegated_to_user_id = _user_id
        AND d.business_id = _business_id
        AND d.revoked_at IS NULL
        AND now() BETWEEN d.starts_at AND d.expires_at
    ),
    ARRAY[]::text[]
  );
$$;

REVOKE ALL ON FUNCTION public.has_active_delegated_access(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_active_delegated_permissions(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_active_delegated_access(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_active_delegated_permissions(uuid, uuid) TO authenticated, service_role;