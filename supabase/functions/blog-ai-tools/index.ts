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
        systemPrompt = `You are an SEO specialist. Generate optimized meta tags. Return ONLY valid JSON with these fields:
{
  "meta_title_ar": "عنوان ميتا بالعربية (50-60 حرف)",
  "meta_title_en": "English meta title (50-60 chars)",
  "meta_description_ar": "وصف ميتا بالعربية (150-160 حرف)",
  "meta_description_en": "English meta description (150-160 chars)",
  "focus_keyword": "primary SEO keyword",
  "slug_suggestion": "optimized-url-slug"
}
${toneInstruction}`;
        userPrompt = `Title AR: ${title}\nContent excerpt: ${content?.substring(0, 500)}\nExisting keywords: ${keywords?.join(', ') || 'none'}`;
        break;

      case "seo_analysis":
        systemPrompt = `You are a senior SEO analyst. Analyze the blog post for SEO quality and provide a detailed score. Return ONLY valid JSON:
{
  "score": 85,
  "checks": [
    {"name_ar": "...", "name_en": "...", "status": "pass|warn|fail", "message_ar": "...", "message_en": "..."}
  ],
  "suggestions_ar": ["..."],
  "suggestions_en": ["..."]
}`;
        userPrompt = JSON.stringify({
          title_ar: title, content_ar: content,
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
