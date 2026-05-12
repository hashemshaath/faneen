-- Contract Trigger Cleanup — drop duplicates, keep canonical trigger of each kind.
-- Kept:
--   trg_contracts_lock_guard          (unchanged)
--   trg_contract_operation_log        (operation log)
--   trg_contract_status_notify        (status notify)
--   trg_contracts_updated_at          (updated_at)
-- Dropped duplicates:
DROP TRIGGER IF EXISTS trg_contract_operations_log ON public.contracts;
DROP TRIGGER IF EXISTS trg_log_contract_ops        ON public.contracts;
DROP TRIGGER IF EXISTS trg_notify_contract_status  ON public.contracts;
DROP TRIGGER IF EXISTS update_contracts_updated_at ON public.contracts;
