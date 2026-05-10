import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, text, sourceLang, targetLang, title, content, keywords, tone, model, translationInstructions, contentInstructions, responseStyle } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const toneInstruction = tone ? `Use a ${tone} tone/style.` : "";
    const styleInstruction = responseStyle === 'concise' ? 'Be very concise and brief.'
      : responseStyle === 'detailed' ? 'Be detailed and thorough.'
      : '';

    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      case "translate": {
        let extra = '';
        if (translationInstructions) extra = `\nAdditional translation rules from the user:\n${translationInstructions}\n`;
        systemPrompt = `You are an expert translator. Translate the following text from ${sourceLang === 'ar' ? 'Arabic' : 'English'} to ${targetLang === 'ar' ? 'Arabic' : 'English'}. ${toneInstruction} Return ONLY the translation as plain text. No markdown symbols.${extra}`;
        userPrompt = text;
        break;
      }

      case "generate_keywords":
        systemPrompt = `You are an SEO expert. Extract 8-12 highly relevant SEO keywords/phrases from the given content. Return ONLY a JSON array of strings. ${toneInstruction}`;
        userPrompt = `Title: ${title}\nContent: ${content}`;
        break;

      case "generate_meta":
        systemPrompt = `You are an elite SEO copywriter. Generate THREE distinct meta tag variations for this article, each tailored to a different search intent. Return ONLY valid JSON with this exact shape:
{
  "options": [
    {
      "id": "informational|commercial|transactional",
      "label_ar": "متوازن|تسويقي|مقارنة",
      "label_en": "Balanced|Marketing|Comparison",
      "intent": "informational|commercial|transactional",
      "meta_title_ar": "... (50-60 chars exactly, includes focus keyword naturally)",
      "meta_title_en": "... (50-60 chars exactly)",
      "meta_description_ar": "... (150-160 chars exactly, includes focus keyword + soft CTA)",
      "meta_description_en": "... (150-160 chars exactly)",
      "score": 0-100,
      "recommended": true|false,
      "rationale_ar": "سبب مختصر (سطر واحد)",
      "rationale_en": "short reason (one line)"
    }
  ],
  "focus_keyword": "primary keyword",
  "slug_suggestion": "lowercase-hyphenated-slug-max-60-chars"
}
Rules:
- Generate EXACTLY 3 options with intents: informational (educational/how-to), commercial (best/comparison), transactional (services/buy).
- Mark exactly ONE option with "recommended": true based on the dominant search intent of the content.
- Score reflects: length compliance (50-60 title, 150-160 desc), keyword usage, click-through appeal.
- meta_title length 50-60 chars; meta_description length 150-160 chars (strict).
- slug_suggestion: lowercase ASCII, hyphens only, max 60 chars.
- All values plain text, no markdown.
${toneInstruction}`;
        userPrompt = `Title AR: ${title}\nContent excerpt: ${content?.substring(0, 800)}\nExisting keywords: ${keywords?.join(', ') || 'none'}`;
        break;

      case "seo_analysis":
        systemPrompt = `You are a senior SEO analyst. Analyze the blog post deeply and return actionable, applyable improvements. Return ONLY valid JSON with this exact shape:
{
  "score": 0-100,
  "checks": [
    {"name_ar": "...", "name_en": "...", "status": "pass|warn|fail", "message_ar": "...", "message_en": "..."}
  ],
  "suggestions_ar": ["..."],
  "suggestions_en": ["..."],
  "fixes": [
    {
      "field": "title_ar|title_en|meta_title_ar|meta_title_en|meta_description_ar|meta_description_en|slug|excerpt_ar|excerpt_en|focus_keyword",
      "suggested_value": "the new improved value, plain text only, no markdown",
      "reason_ar": "سبب مختصر بالعربية",
      "reason_en": "short reason in English",
      "priority": "high|medium|low"
    }
  ]
}
Rules:
- Include 3-8 fixes, only for fields that genuinely need improvement.
- meta_title_* must be 50-60 chars, meta_description_* 150-160 chars.
- slug must be lowercase, hyphenated, ASCII, max 60 chars.
- suggested_value must be a clean string without markdown symbols.
- Make sure focus_keyword appears naturally in titles and meta_description when relevant.
- Score must reflect: keyword usage, meta quality, content length, heading structure, slug quality, excerpts presence.`;
        userPrompt = JSON.stringify(typeof text === 'string' && text.startsWith('{')
          ? JSON.parse(text)
          : {
              title_ar: title,
              content_ar: content,
              focus_keyword: keywords?.[0] || '',
              meta_description: text || '',
              has_cover_image: !!keywords?.[1],
              word_count: content?.split(/\s+/).length || 0,
            });
        break;

      case "improve_content": {
        let extra = '';
        if (contentInstructions) extra = `\nAdditional content improvement rules from the user:\n${contentInstructions}\n`;
        systemPrompt = `You are an expert content writer and SEO specialist. Improve the given content for better ranking and readability. ${toneInstruction} ${styleInstruction} Keep the same language. IMPORTANT: If the input is a short text (title, excerpt, or meta description), return it as clean plain text WITHOUT any markdown symbols. Only use markdown if the input is a long article body. Return ONLY the improved content.${extra}`;
        userPrompt = `Focus keyword: ${keywords?.[0] || ''}\n\nContent to improve:\n${text}`;
        break;
      }

      case "generate_excerpt":
        systemPrompt = `You are a content specialist. Generate a compelling excerpt/summary (2-3 sentences, 150-200 chars) that includes the focus keyword. ${toneInstruction} Return ONLY plain text without markdown. Write in the same language as the input.`;
        userPrompt = `Focus keyword: ${keywords?.[0] || ''}\nTitle: ${title}\nContent: ${content?.substring(0, 800)}`;
        break;

      case "competitor_analysis":
        systemPrompt = `You are a senior SEO strategist. Analyze the given article. Return ONLY valid JSON:
{
  "keyword_difficulty": "low|medium|high",
  "estimated_position": "1-10|11-20|21-50|50+",
  "strengths_ar": ["..."], "strengths_en": ["..."],
  "weaknesses_ar": ["..."], "weaknesses_en": ["..."],
  "recommendations_ar": ["..."], "recommendations_en": ["..."],
  "content_gap_ar": ["..."], "content_gap_en": ["..."],
  "competitive_score": 75
}`;
        userPrompt = JSON.stringify({
          focus_keyword: keywords?.[0] || '',
          title, content_length: content?.split(/\s+/).length || 0,
          content_excerpt: content?.substring(0, 1000),
          meta_description: text || '',
        });
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const selectedModel = model || "google/gemini-3-flash-preview";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
