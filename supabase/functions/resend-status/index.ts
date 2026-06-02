// Resend connection status & test-send edge function.
// Returns connection health by hitting Resend's /domains endpoint with the
// RESEND_API_KEY secret. Admin-only.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface ResendDomain {
  id: string;
  name: string;
  status: string;
  region?: string;
  created_at?: string;
}

interface StatusResponse {
  configured: boolean;
  connected: boolean;
  error?: string;
  domains?: ResendDomain[];
  checkedAt: string;
  keyMasked?: string;
}

function maskKey(k: string): string {
  if (!k) return '';
  if (k.length <= 8) return '••••';
  return `${k.slice(0, 4)}••••${k.slice(-4)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization') ?? '';

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'admin',
    });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const apiKey = Deno.env.get('RESEND_API_KEY');
    const checkedAt = new Date().toISOString();

    if (!apiKey) {
      const body: StatusResponse = {
        configured: false,
        connected: false,
        error: 'RESEND_API_KEY is not set',
        checkedAt,
      };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Optional test-send mode.
    let action: 'status' | 'test' = 'status';
    let testTo: string | undefined;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body?.action === 'test' && typeof body.to === 'string') {
          action = 'test';
          testTo = body.to;
        }
      } catch { /* ignore */ }
    }

    // Always validate via /domains call.
    const r = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!r.ok) {
      const text = await r.text();
      const body: StatusResponse = {
        configured: true,
        connected: false,
        error: `Resend ${r.status}: ${text.slice(0, 200)}`,
        checkedAt,
        keyMasked: maskKey(apiKey),
      };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const json = await r.json().catch(() => ({}));
    const domains: ResendDomain[] = Array.isArray(json?.data) ? json.data : [];

    if (action === 'test' && testTo) {
      const sendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Qitaat <onboarding@resend.dev>',
          to: [testTo],
          subject: 'Qitaat — Resend test email',
          html: '<p>This is a Resend connection test from Qitaat admin.</p>',
        }),
      });
      const sendJson = await sendRes.json().catch(() => ({}));
      return new Response(
        JSON.stringify({
          configured: true,
          connected: sendRes.ok,
          domains,
          checkedAt,
          keyMasked: maskKey(apiKey),
          testSend: { ok: sendRes.ok, status: sendRes.status, response: sendJson },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body: StatusResponse = {
      configured: true,
      connected: true,
      domains,
      checkedAt,
      keyMasked: maskKey(apiKey),
    };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ configured: false, connected: false, error: msg, checkedAt: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});