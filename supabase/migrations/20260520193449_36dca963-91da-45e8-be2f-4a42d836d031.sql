
CREATE OR REPLACE FUNCTION public.get_entity_barcode_code(
  _entity_type text,
  _entity_id uuid
) RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT br.barcode_code
  FROM public.barcode_registry br
  WHERE br.entity_type = _entity_type
    AND br.entity_id   = _entity_id
    AND br.status      = 'active'
    AND auth.uid() IS NOT NULL
  ORDER BY br.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_entity_barcode_code(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_entity_barcode_code(text, uuid) TO authenticated;
