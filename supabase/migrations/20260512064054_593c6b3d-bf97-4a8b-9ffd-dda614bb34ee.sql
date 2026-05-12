REVOKE ALL ON FUNCTION public.contract_canonical_snapshot(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.contract_snapshot_hash(jsonb) FROM PUBLIC, anon, authenticated;