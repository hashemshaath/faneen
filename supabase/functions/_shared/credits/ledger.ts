// EDGE-2: Direct ledger insert for non-balance-changing audit rows.
// Balance-changing flows MUST go through debit/grant/admin RPCs so the
// update + ledger insert occur atomically.
import type { InsertCreditLedgerTransactionInput, SupabaseAdminLike } from './types.ts';

export async function insertCreditLedgerTransaction(
  admin: SupabaseAdminLike,
  input: InsertCreditLedgerTransactionInput,
) {
  return await admin
    .from('provider_lead_credit_transactions')
    .insert(input);
}