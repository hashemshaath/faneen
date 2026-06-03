// Shared cron / admin authorization guard for scheduled edge functions.
// Accepts either the x-cron-secret header (set in pg_cron job headers) or
// an admin user's JWT bearer token. Returns null when authorized, or a
// 401 Response to be returned to the caller when not.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function requireCronOrAdmin(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  const headerSecret = req.headers.get('x-cron-secret') ?? '';
  if (cronSecret && headerSecret && headerSecret === cronSecret) return null;

  const authHeader = req.headers.get('Authorization') ?? '';
  if (authHeader.startsWith('Bearer ')) {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const sb = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace('Bearer ', '');
      const { data } = await sb.auth.getClaims(token);
      const uid = data?.claims?.sub;
      if (uid) {
        const { data: ok } = await sb.rpc('has_admin_access', { _user_id: uid });
        if (ok === true) return null;
      }
    } catch (_e) { /* fall through to 401 */ }
  }

  return new Response(
    JSON.stringify({ error: 'unauthorized' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}