// Beta-only edge function: verifies a temporary login code and returns a
// magic-link token_hash the client can exchange for a real Supabase session.
//
// Flow:
//   1. Client POSTs { identifier, code }
//   2. We verify via the existing public.verify_temporary_login_code RPC
//      (service role bypasses RLS; the function is the single source of truth
//      for code validity, rate limits, and the 000000 beta bypass).
//   3. Resolve identifier -> auth.users.email (via SECURITY DEFINER helper).
//   4. admin.generateLink({ type: 'magiclink' }) -> hashed_token.
//   5. Client calls supabase.auth.verifyOtp({ email, token_hash, type: 'magiclink' })
//      to mint a real session. Existing useRoleRedirect handles the redirect.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface RpcResult {
  verified?: boolean;
  bypass?: boolean;
  reason?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  let payload: { identifier?: string; code?: string };
  try {
    payload = await req.json();
  } catch {
    return json(200, { ok: false, error: 'invalid_body' });
  }

  const identifier = (payload.identifier ?? '').trim();
  const code = (payload.code ?? '').trim();
  if (!identifier || !code) {
    return json(200, { ok: false, error: 'missing_fields' });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1) Verify the temporary code via the canonical RPC.
  const { data: rpcData, error: rpcError } = await admin.rpc('verify_temporary_login_code', {
    _identifier: identifier,
    _code: code,
  });

  if (rpcError) {
    const msg = `${rpcError.message ?? ''} ${rpcError.details ?? ''} ${rpcError.code ?? ''}`;
    if (msg.includes('TOO_MANY_ATTEMPTS')) return json(200, { ok: false, error: 'rate_limited' });
    if (msg.includes('INVALID_IDENTIFIER')) return json(200, { ok: false, error: 'invalid_id' });
    if (msg.includes('INVALID_OR_EXPIRED')) return json(200, { ok: false, error: 'invalid' });
    console.error('[temp-code-session] rpc error', rpcError);
    return json(200, { ok: false, error: 'generic' });
  }

  const verified = (rpcData as RpcResult | null)?.verified === true;
  if (!verified) return json(200, { ok: false, error: 'invalid' });

  // 2) Resolve email via service-role-only helper.
  const { data: emailData, error: emailErr } = await admin.rpc(
    'find_auth_user_email_by_identifier',
    { _identifier: identifier },
  );
  if (emailErr) {
    console.error('[temp-code-session] email lookup error', emailErr);
    return json(200, { ok: false, error: 'generic' });
  }
  const email = (emailData as string | null) ?? null;
  if (!email) {
    return json(200, { ok: false, error: 'no_account' });
  }

  // 3) Generate magic link to extract the hashed_token (do NOT email it).
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkErr || !linkData?.properties?.hashed_token) {
    console.error('[temp-code-session] generateLink error', linkErr);
    return json(200, { ok: false, error: 'generic' });
  }

  return json(200, {
    ok: true,
    email,
    token_hash: linkData.properties.hashed_token,
  });
});