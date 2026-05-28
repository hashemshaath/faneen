-- BUSINESS-WORKFLOW-4: Work Order attachments & measurements

-- ─────────────────────────────────────────────────────────────────────────────
-- Sequences for human-readable ref ids
-- ─────────────────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.work_order_attachments_ref_seq START WITH 1000;
CREATE SEQUENCE IF NOT EXISTS public.work_order_measurements_ref_seq START WITH 1000;

-- ─────────────────────────────────────────────────────────────────────────────
-- work_order_attachments
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.work_order_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  task_id uuid NULL REFERENCES public.work_order_tasks(id) ON DELETE SET NULL,
  business_id uuid NOT NULL,
  uploaded_by_user_id uuid NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NULL,
  file_size bigint NULL,
  attachment_type text NOT NULL DEFAULT 'general'
    CHECK (attachment_type IN (
      'general','measurement_photo','drawing','quote_file',
      'contract_file','installation_photo','handover_document'
    )),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  CHECK (file_size IS NULL OR file_size >= 0),
  CHECK (char_length(file_name) BETWEEN 1 AND 255)
);

CREATE INDEX idx_woa_work_order ON public.work_order_attachments (work_order_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_woa_task ON public.work_order_attachments (task_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_woa_business ON public.work_order_attachments (business_id) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_order_attachments TO authenticated;
GRANT ALL ON public.work_order_attachments TO service_role;

ALTER TABLE public.work_order_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "woa_select_member" ON public.work_order_attachments
FOR SELECT TO authenticated
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND w.deleted_at IS NULL
      AND public.is_work_order_member(auth.uid(), w.business_id)
  )
);

CREATE POLICY "woa_insert_manager_or_assignee" ON public.work_order_attachments
FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND w.deleted_at IS NULL
      AND w.business_id = work_order_attachments.business_id
      AND (
        public.is_business_owner_or_manager(auth.uid(), w.business_id)
        OR (
          task_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.work_order_tasks t
            WHERE t.id = task_id
              AND t.work_order_id = w.id
              AND t.deleted_at IS NULL
              AND t.assigned_to_user_id = auth.uid()
          )
        )
      )
  )
);

CREATE POLICY "woa_update_manager" ON public.work_order_attachments
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
);

CREATE POLICY "woa_delete_manager" ON public.work_order_attachments
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
);

CREATE OR REPLACE FUNCTION public.trg_work_order_attachments_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.ref_id IS NULL THEN
    NEW.ref_id := 'WOA-' || nextval('public.work_order_attachments_ref_seq')::text;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_work_order_attachments_defaults
BEFORE INSERT ON public.work_order_attachments
FOR EACH ROW EXECUTE FUNCTION public.trg_work_order_attachments_defaults();

-- ─────────────────────────────────────────────────────────────────────────────
-- work_order_measurements
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.work_order_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  task_id uuid NULL REFERENCES public.work_order_tasks(id) ON DELETE SET NULL,
  business_id uuid NOT NULL,
  recorded_by_user_id uuid NOT NULL,
  measurement_type text NOT NULL,
  label text NOT NULL,
  width numeric NULL,
  height numeric NULL,
  depth numeric NULL,
  length numeric NULL,
  quantity numeric NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'cm'
    CHECK (unit IN ('mm','cm','m','inch')),
  notes text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  CHECK (char_length(label) BETWEEN 1 AND 200),
  CHECK (char_length(measurement_type) BETWEEN 1 AND 50),
  CHECK (width IS NULL OR width >= 0),
  CHECK (height IS NULL OR height >= 0),
  CHECK (depth IS NULL OR depth >= 0),
  CHECK (length IS NULL OR length >= 0),
  CHECK (quantity IS NULL OR quantity >= 0)
);

CREATE INDEX idx_wom_work_order ON public.work_order_measurements (work_order_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_wom_task ON public.work_order_measurements (task_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_wom_business ON public.work_order_measurements (business_id) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_order_measurements TO authenticated;
GRANT ALL ON public.work_order_measurements TO service_role;

ALTER TABLE public.work_order_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wom_select_member" ON public.work_order_measurements
FOR SELECT TO authenticated
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND w.deleted_at IS NULL
      AND public.is_work_order_member(auth.uid(), w.business_id)
  )
);

CREATE POLICY "wom_insert_manager_or_assignee" ON public.work_order_measurements
FOR INSERT TO authenticated
WITH CHECK (
  recorded_by_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND w.deleted_at IS NULL
      AND w.business_id = work_order_measurements.business_id
      AND (
        public.is_business_owner_or_manager(auth.uid(), w.business_id)
        OR (
          task_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.work_order_tasks t
            WHERE t.id = task_id
              AND t.work_order_id = w.id
              AND t.deleted_at IS NULL
              AND t.assigned_to_user_id = auth.uid()
          )
        )
      )
  )
);

CREATE POLICY "wom_update_manager" ON public.work_order_measurements
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
);

CREATE POLICY "wom_delete_manager" ON public.work_order_measurements
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
);

CREATE OR REPLACE FUNCTION public.trg_work_order_measurements_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.ref_id IS NULL THEN
    NEW.ref_id := 'WOM-' || nextval('public.work_order_measurements_ref_seq')::text;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_work_order_measurements_defaults
BEFORE INSERT OR UPDATE ON public.work_order_measurements
FOR EACH ROW EXECUTE FUNCTION public.trg_work_order_measurements_defaults();

-- ─────────────────────────────────────────────────────────────────────────────
-- Private storage bucket for work order files
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('work-order-files', 'work-order-files', false)
ON CONFLICT (id) DO NOTHING;

-- Members can read files; managers (or assigned task user via the metadata
-- table) handle write through the attachments wrapper. We gate storage by
-- work_order_attachments rows that reference the file_path.
CREATE POLICY "wo_files_select_member" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'work-order-files'
  AND EXISTS (
    SELECT 1
    FROM public.work_order_attachments a
    JOIN public.work_orders w ON w.id = a.work_order_id
    WHERE a.file_path = storage.objects.name
      AND a.deleted_at IS NULL
      AND w.deleted_at IS NULL
      AND public.is_work_order_member(auth.uid(), w.business_id)
  )
);

CREATE POLICY "wo_files_insert_manager" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'work-order-files'
  AND owner = auth.uid()
);

CREATE POLICY "wo_files_delete_manager" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'work-order-files'
  AND EXISTS (
    SELECT 1
    FROM public.work_order_attachments a
    JOIN public.work_orders w ON w.id = a.work_order_id
    WHERE a.file_path = storage.objects.name
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
);