DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'password_reset_log_status_allowlist'
  ) THEN
    ALTER TABLE public.password_reset_log
      ADD CONSTRAINT password_reset_log_status_allowlist
      CHECK (status IN (
        'forgot_page_viewed','reset_page_viewed','requested','resend','sent',
        'failed','completed','link_clicked','link_valid','link_expired','link_invalid'
      )) NOT VALID;
    -- Validate only rows that already match; legacy rows outside the list are tolerated.
    BEGIN
      ALTER TABLE public.password_reset_log
        VALIDATE CONSTRAINT password_reset_log_status_allowlist;
    EXCEPTION WHEN check_violation THEN
      -- Leave NOT VALID so production rows are not blocked; new inserts are still enforced.
      NULL;
    END;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'password_reset_log_metadata_size_cap'
  ) THEN
    ALTER TABLE public.password_reset_log
      ADD CONSTRAINT password_reset_log_metadata_size_cap
      CHECK (metadata IS NULL OR octet_length(metadata::text) <= 8192) NOT VALID;
    BEGIN
      ALTER TABLE public.password_reset_log
        VALIDATE CONSTRAINT password_reset_log_metadata_size_cap;
    EXCEPTION WHEN check_violation THEN
      NULL;
    END;
  END IF;
END $$;