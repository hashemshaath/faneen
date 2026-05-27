
CREATE SEQUENCE IF NOT EXISTS public.work_orders_ref_seq START 1000000;
CREATE SEQUENCE IF NOT EXISTS public.work_order_tasks_ref_seq START 1000000;

CREATE TABLE public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  business_id uuid NOT NULL,
  source_type text CHECK (source_type IN ('lead','quote','contract','manual')),
  source_id uuid,
  title text NOT NULL,
  customer_name text,
  customer_phone text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','on_hold','completed','cancelled')),
  current_stage_key text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  owner_user_id uuid NOT NULL,
  created_by_user_id uuid NOT NULL,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_work_orders_business ON public.work_orders(business_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_work_orders_owner ON public.work_orders(owner_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_work_orders_status ON public.work_orders(business_id, status) WHERE deleted_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_orders TO authenticated;
GRANT ALL ON public.work_orders TO service_role;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.work_order_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  stage_key text NOT NULL,
  title_ar text NOT NULL,
  title_en text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','completed','skipped')),
  sort_order int NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  assigned_to_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_work_order_stages_wo ON public.work_order_stages(work_order_id, sort_order);
CREATE UNIQUE INDEX idx_work_order_stages_unique ON public.work_order_stages(work_order_id, stage_key);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_order_stages TO authenticated;
GRANT ALL ON public.work_order_stages TO service_role;
ALTER TABLE public.work_order_stages ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.work_order_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES public.work_order_stages(id) ON DELETE SET NULL,
  business_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','blocked','completed','archived')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  assigned_to_user_id uuid,
  created_by_user_id uuid NOT NULL,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_work_order_tasks_wo ON public.work_order_tasks(work_order_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_work_order_tasks_assignee ON public.work_order_tasks(assigned_to_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_work_order_tasks_business_status ON public.work_order_tasks(business_id, status) WHERE deleted_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_order_tasks TO authenticated;
GRANT ALL ON public.work_order_tasks TO service_role;
ALTER TABLE public.work_order_tasks ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.work_order_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.work_order_tasks(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_work_order_comments_wo ON public.work_order_comments(work_order_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_work_order_comments_task ON public.work_order_comments(task_id) WHERE deleted_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_order_comments TO authenticated;
GRANT ALL ON public.work_order_comments TO service_role;
ALTER TABLE public.work_order_comments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.trg_work_orders_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.ref_id IS NULL THEN
    NEW.ref_id := 'WO-' || nextval('public.work_orders_ref_seq')::text;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_work_orders_defaults
BEFORE INSERT OR UPDATE ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_work_orders_defaults();

CREATE OR REPLACE FUNCTION public.trg_work_order_tasks_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.ref_id IS NULL THEN
    NEW.ref_id := 'TASK-' || nextval('public.work_order_tasks_ref_seq')::text;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_work_order_tasks_defaults
BEFORE INSERT OR UPDATE ON public.work_order_tasks
FOR EACH ROW EXECUTE FUNCTION public.trg_work_order_tasks_defaults();

CREATE OR REPLACE FUNCTION public.trg_work_order_stages_touch()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_work_order_stages_touch
BEFORE UPDATE ON public.work_order_stages
FOR EACH ROW EXECUTE FUNCTION public.trg_work_order_stages_touch();

CREATE OR REPLACE FUNCTION public.is_work_order_member(_user_id uuid, _business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_user_id, 'admin') OR
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = _business_id AND b.user_id = _user_id) OR
    EXISTS (SELECT 1 FROM public.business_staff bs WHERE bs.business_id = _business_id AND bs.user_id = _user_id AND bs.is_active = true);
$$;

CREATE POLICY "wo_select_member" ON public.work_orders
FOR SELECT TO authenticated
USING (deleted_at IS NULL AND public.is_work_order_member(auth.uid(), business_id));

CREATE POLICY "wo_insert_manager" ON public.work_orders
FOR INSERT TO authenticated
WITH CHECK (created_by_user_id = auth.uid() AND public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "wo_update_manager" ON public.work_orders
FOR UPDATE TO authenticated
USING (public.is_business_owner_or_manager(auth.uid(), business_id))
WITH CHECK (public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "wo_delete_manager" ON public.work_orders
FOR DELETE TO authenticated
USING (public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "wos_select_member" ON public.work_order_stages
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.work_orders w WHERE w.id = work_order_id AND w.deleted_at IS NULL AND public.is_work_order_member(auth.uid(), w.business_id)));

CREATE POLICY "wos_write_manager" ON public.work_order_stages
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.work_orders w WHERE w.id = work_order_id AND public.is_business_owner_or_manager(auth.uid(), w.business_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.work_orders w WHERE w.id = work_order_id AND public.is_business_owner_or_manager(auth.uid(), w.business_id)));

CREATE POLICY "wot_select_member" ON public.work_order_tasks
FOR SELECT TO authenticated
USING (deleted_at IS NULL AND public.is_work_order_member(auth.uid(), business_id));

CREATE POLICY "wot_insert_manager" ON public.work_order_tasks
FOR INSERT TO authenticated
WITH CHECK (created_by_user_id = auth.uid() AND public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "wot_update_manager" ON public.work_order_tasks
FOR UPDATE TO authenticated
USING (public.is_business_owner_or_manager(auth.uid(), business_id))
WITH CHECK (public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "wot_update_assignee" ON public.work_order_tasks
FOR UPDATE TO authenticated
USING (assigned_to_user_id = auth.uid() AND deleted_at IS NULL)
WITH CHECK (assigned_to_user_id = auth.uid());

CREATE POLICY "wot_delete_manager" ON public.work_order_tasks
FOR DELETE TO authenticated
USING (public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "woc_select_member" ON public.work_order_comments
FOR SELECT TO authenticated
USING (deleted_at IS NULL AND EXISTS (SELECT 1 FROM public.work_orders w WHERE w.id = work_order_id AND w.deleted_at IS NULL AND public.is_work_order_member(auth.uid(), w.business_id)));

CREATE POLICY "woc_insert_member" ON public.work_order_comments
FOR INSERT TO authenticated
WITH CHECK (author_user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.work_orders w WHERE w.id = work_order_id AND public.is_work_order_member(auth.uid(), w.business_id)));

CREATE POLICY "woc_update_author" ON public.work_order_comments
FOR UPDATE TO authenticated
USING (author_user_id = auth.uid())
WITH CHECK (author_user_id = auth.uid());

CREATE POLICY "woc_delete_author_or_manager" ON public.work_order_comments
FOR DELETE TO authenticated
USING (author_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.work_orders w WHERE w.id = work_order_id AND public.is_business_owner_or_manager(auth.uid(), w.business_id)));
