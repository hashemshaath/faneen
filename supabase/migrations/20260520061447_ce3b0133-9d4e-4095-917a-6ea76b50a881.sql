
CREATE OR REPLACE FUNCTION public._atlc_mask_identifier(_identifier text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _identifier IS NULL OR length(_identifier) = 0 THEN ''
    WHEN position('@' IN _identifier) > 0 THEN
      left(_identifier, 1) || '***' || substring(_identifier FROM position('@' IN _identifier))
    WHEN length(_identifier) <= 4 THEN repeat('*', length(_identifier))
    ELSE left(_identifier, 2) || repeat('*', length(_identifier) - 4) || right(_identifier, 2)
  END;
$$;

CREATE OR REPLACE FUNCTION public._atlc_hash(_code text, _row_id uuid)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public, extensions AS $$
  SELECT encode(digest(_code || ':' || _row_id::text, 'sha256'), 'hex');
$$;
