// contracts-ai-suggest-clauses
// ────────────────────────────────────────────────────────────────────────────
// Uses Lovable AI Gateway to suggest professional contract clauses for a
// given service category / project type (Arabic-first). Caller must be an
// authenticated business owner/manager or admin.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Body {
  category?: string
  industry?: 'aluminum' | 'glass' | 'wood' | 'steel' | string
  language?: 'ar' | 'en'
  extraContext?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '')
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'unauthenticated' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt)
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'unauthenticated' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = (await req.json().catch(() => ({}))) as Body
    const lang: 'ar' | 'en' = body.language === 'en' ? 'en' : 'ar'
    const category = (body.category ?? '').toString().slice(0, 120)
    const industry = (body.industry ?? '').toString().slice(0, 40)
    const extra = (body.extraContext ?? '').toString().slice(0, 800)

    const apiKey = Deno.env.get('LOVABLE_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ai_unavailable' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const systemPrompt = lang === 'ar'
      ? 'أنت محرر عقود محترف للقطاع الصناعي (الألمنيوم، الزجاج، الخشب، الحديد) في المملكة العربية السعودية. اقترح بنوداً قانونية واضحة ومختصرة لا تتجاوز 8 بنود، كل بند سطر أو سطران، بدون رموز Markdown.'
      : 'You are a professional contracts editor for the industrial sector (aluminum, glass, wood, steel) in Saudi Arabia. Suggest up to 8 clear, concise legal clauses; one or two sentences each, no Markdown.'

    const userPrompt = lang === 'ar'
      ? `الفئة: ${category || 'عام'}\nالقطاع: ${industry || 'صناعي'}\nسياق إضافي: ${extra || 'لا يوجد'}\n\nأخرج البنود في صيغة JSON: {"clauses":[{"title":"...","body":"..."}]}`
      : `Category: ${category || 'general'}\nIndustry: ${industry || 'industrial'}\nExtra: ${extra || 'none'}\n\nReturn JSON: {"clauses":[{"title":"...","body":"..."}]}`

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      }),
    })

    if (!resp.ok) {
      const txt = await resp.text()
      console.error('[ai-clauses] gateway', resp.status, txt.slice(0, 200))
      return new Response(JSON.stringify({ error: 'ai_failed', status: resp.status }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await resp.json()
    const content: string = data?.choices?.[0]?.message?.content ?? '{}'
    let parsed: { clauses?: Array<{ title: string; body: string }> } = {}
    try { parsed = JSON.parse(content) } catch { parsed = {} }

    const clauses = (parsed.clauses ?? [])
      .filter((c) => c && typeof c.title === 'string' && typeof c.body === 'string')
      .slice(0, 8)

    return new Response(JSON.stringify({ ok: true, clauses, language: lang }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    console.error('[ai-clauses] fatal', msg)
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})