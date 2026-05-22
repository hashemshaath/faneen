import { supabase } from '@/integrations/supabase/client';

/**
 * Fire-and-forget supplier lead notification.
 *
 * Notes:
 * - Returns void; the underlying invoke promise is intentionally not awaited.
 * - Must never throw — failures here must not break lead capture.
 * - The DB trigger already creates the in-app notification, so email failure is fail-soft.
 * - Body shape uses `lead_id` (snake_case) because the deployed
 *   `notify-supplier-lead` edge function reads `body.lead_id`. Changing this
 *   would silently break supplier email delivery.
 */
export function notifySupplierLead(leadId: string): void {
  try {
    void supabase.functions.invoke('notify-supplier-lead', {
      body: { lead_id: leadId },
    });
  } catch {
    // swallow — fail-soft
  }
}