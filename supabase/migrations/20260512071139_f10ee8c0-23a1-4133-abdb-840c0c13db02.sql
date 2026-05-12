REVOKE EXECUTE ON FUNCTION public.send_contract_for_approval(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_contract(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.complete_contract(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_contract(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.recalc_contract_total(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.contract_caller_can_act(uuid) FROM PUBLIC, anon;