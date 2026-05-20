-- Phase 8 QA: drop the obsolete 2-arg overload of verify_contract_public.
-- The 3-arg version (_contract_number, _hash, _barcode_code) replaces it.
DROP FUNCTION IF EXISTS public.verify_contract_public(text, text);