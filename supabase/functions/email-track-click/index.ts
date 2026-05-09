// Click tracking endpoint. Records a click and 302-redirects to the original URL.
// Public, unauthenticated by design.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function safeUrl(raw: string | null): string | null {
  if (!raw) return null
  try {
    const u = new URL(raw)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.toString()
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const url = new URL(req.url)
  const mid = url.searchParams.get('m')
  const target = safeUrl(url.searchParams.get('u'))

  try {
    if (mid) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      )
      await supabase.rpc('record_email_click', { _message_id: mid })
    }
  } catch (e) {
    console.error('click tracking error', e)
  }

  if (!target) {
    return new Response(JSON.stringify({ error: 'missing or invalid target url' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, Location: target, 'Cache-Control': 'no-store' },
  })
})