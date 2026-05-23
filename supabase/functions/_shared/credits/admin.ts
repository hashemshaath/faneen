// EDGE-2: Server-side wrapper for the admin_adjust_provider_credits RPC.
import type { AdminAdjustProviderCreditsServerInput, SupabaseAdminLike } from './types.ts';

export async function adminAdjustProviderCreditsServer(
  admin: SupabaseAdminLike,
  args: AdminAdjustProviderCreditsServerInput,
) {
  return await admin.rpc('admin_adjust_provider_credits', args as unknown as Record<string, unknown>);
}