import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, text, sourceLang, targetLang, title, content, keywords } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      case "translate":
        systemPrompt = `You are an expert translator. Translate the following text from ${sourceLang === 'ar' ? 'Arabic' : 'English'} to ${targetLang === 'ar' ? 'Arabic' : 'English'}. Preserve formatting, markdown, and HTML tags. Return ONLY the translation, nothing else.`;
        userPrompt = text;
        break;

      case "generate_keywords":
        systemPrompt = `You are an SEO expert. Extract 8-12 highly relevant SEO keywords/phrases from the given content. Return ONLY a JSON array of strings. Focus on high-search-volume, low-competition keywords relevant to the content. Include both short-tail and long-tail keywords. Return format: ["keyword1", "keyword2", ...]`;
        userPrompt = `Title: ${title}\nContent: ${content}`;
        break;

      case "generate_meta":
        systemPrompt = `You are an SEO specialist. Generate optimized meta tags. Return ONLY valid JSON with these fields:
{
  "meta_title_ar": "عنوان ميتا بالعربية (50-60 حرف)",
  "meta_title_en": "English meta title (50-60 chars)",
  "meta_description_ar": "وصف ميتا بالعربية (150-160 حرف) يتضمن الكلمة المفتاحية",
  "meta_description_en": "English meta description (150-160 chars) including focus keyword",
  "focus_keyword": "primary SEO keyword",
  "slug_suggestion": "optimized-url-slug"
}
Make titles compelling with power words. Include focus keyword naturally in descriptions.`;
        userPrompt = `Title AR: ${title}\nContent excerpt: ${content?.substring(0, 500)}\nExisting keywords: ${keywords?.join(', ') || 'none'}`;
        break;

      case "seo_analysis":
        systemPrompt = `You are a senior SEO analyst. Analyze the blog post for SEO quality and provide a detailed score. Return ONLY valid JSON:
{
  "score": 85,
  "checks": [
    {"name_ar": "طول العنوان", "name_en": "Title Length", "status": "pass|warn|fail", "message_ar": "...", "message_en": "..."},
    {"name_ar": "الكلمة المفتاحية في العنوان", "name_en": "Keyword in Title", "status": "pass|warn|fail", "message_ar": "...", "message_en": "..."},
    {"name_ar": "طول الوصف الميتا", "name_en": "Meta Description Length", "status": "pass|warn|fail", "message_ar": "...", "message_en": "..."},
    {"name_ar": "كثافة الكلمة المفتاحية", "name_en": "Keyword Density", "status": "pass|warn|fail", "message_ar": "...", "message_en": "..."},
    {"name_ar": "الروابط الداخلية", "name_en": "Internal Links", "status": "pass|warn|fail", "message_ar": "...", "message_en": "..."},
    {"name_ar": "العناوين الفرعية", "name_en": "Subheadings (H2/H3)", "status": "pass|warn|fail", "message_ar": "...", "message_en": "..."},
    {"name_ar": "طول المحتوى", "name_en": "Content Length", "status": "pass|warn|fail", "message_ar": "...", "message_en": "..."},
    {"name_ar": "صورة الغلاف", "name_en": "Cover Image", "status": "pass|warn|fail", "message_ar": "...", "message_en": "..."},
    {"name_ar": "النص البديل للصور", "name_en": "Image Alt Text", "status": "pass|warn|fail", "message_ar": "...", "message_en": "..."},
    {"name_ar": "قابلية القراءة", "name_en": "Readability", "status": "pass|warn|fail", "message_ar": "...", "message_en": "..."}
  ],
  "suggestions_ar": ["اقتراح 1", "اقتراح 2"],
  "suggestions_en": ["Suggestion 1", "Suggestion 2"]
}`;
        userPrompt = JSON.stringify({
          title_ar: title, content_ar: content,
          focus_keyword: keywords?.[0] || '',
          meta_description: text || '',
          has_cover_image: !!keywords?.[1],
          word_count: content?.split(/\s+/).length || 0,
        });
        break;

      case "improve_content":
        systemPrompt = `You are an expert content writer and SEO specialist. Improve the given content for better SEO ranking. Keep the same language (Arabic or English). Add relevant headings (H2, H3), improve readability, add transition words, and naturally incorporate the focus keyword. Return ONLY the improved content in the same format (markdown).`;
        userPrompt = `Focus keyword: ${keywords?.[0] || ''}\n\nContent to improve:\n${text}`;
        break;

      case "generate_excerpt":
        systemPrompt = `You are a content specialist. Generate a compelling excerpt/summary (2-3 sentences, 150-200 chars) that includes the focus keyword and encourages clicks. Return ONLY the excerpt text, nothing else. Write in the same language as the input.`;
        userPrompt = `Focus keyword: ${keywords?.[0] || ''}\nTitle: ${title}\nContent: ${content?.substring(0, 800)}`;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
