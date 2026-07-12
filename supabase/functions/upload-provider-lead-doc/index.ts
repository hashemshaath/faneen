// Public edge function for provider-join CR uploads.
// Uses SERVICE ROLE to write to the private `provider-lead-documents` bucket.
// Replaces a permissive storage RLS policy that let anyone with a lead-id
// guess the folder path and upload files directly. Public unauthenticated
// callers hit THIS function, which validates size & mime server-side.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BUCKET = 'provider-lead-documents';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIMES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

function safeExt(name: string): string {
  const raw = name.includes('.') ? name.split('.').pop() : 'bin';
  const cleaned = (raw ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  return cleaned || 'bin';
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return jsonResponse({ error: 'missing_file' }, 400);
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return jsonResponse({ error: 'file_too_large' }, 400);
    }
    const mime = file.type || 'application/octet-stream';
    if (!ALLOWED_MIMES.has(mime)) {
      return jsonResponse({ error: 'unsupported_type' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ error: 'server_misconfigured' }, 500);
    }
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const token = crypto.randomUUID();
    const path = `prv-leads/${token}/cr-${Date.now()}.${safeExt(file.name)}`;
    const arrayBuf = await file.arrayBuffer();

    const { error } = await admin.storage.from(BUCKET).upload(path, arrayBuf, {
      contentType: mime,
      upsert: false,
    });
    if (error) {
      console.error('provider-lead-doc upload failed:', error.message);
      return jsonResponse({ error: 'upload_failed', details: error.message }, 500);
    }
    return jsonResponse({ path });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    console.error('upload-provider-lead-doc error:', msg);
    return jsonResponse({ error: 'unknown', details: msg }, 500);
  }
});