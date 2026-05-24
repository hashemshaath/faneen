
-- 1) Extend account_type enum with 'admin'
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'account_type' AND e.enumlabel = 'admin'
  ) THEN
    ALTER TYPE public.account_type ADD VALUE 'admin';
  END IF;
END $$;
