import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, text, sourceLang, targetLang, tone, model, context, knowledgeContext, systemPromptOverride, responseStyle, translationInstructions, contentInstructions, stream: doStream } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (!action || !text) {
      return new Response(JSON.stringify({ error: "action and text are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toneInstruction = tone ? `Use a ${tone} tone/style.` : "";
    const styleInstruction = responseStyle === 'concise' ? 'Be very concise and brief.' 
      : responseStyle === 'detailed' ? 'Be detailed and thorough in your response.' 
      : '';

    let systemPrompt = "";
    let userPrompt = text;

    switch (action) {
      case "translate": {
        let extra = '';
        if (translationInstructions) extra = `\nAdditional translation rules:\n${translationInstructions}\n`;
        systemPrompt = `You are an expert translator. Translate from ${sourceLang === 'ar' ? 'Arabic' : 'English'} to ${targetLang === 'ar' ? 'Arabic' : 'English'}. ${toneInstruction} Return ONLY the translation as clean plain text. No markdown symbols.${extra}`;
        break;
      }

      case "improve":
        systemPrompt = `You are an expert content editor. Improve the given text for clarity, readability and engagement. ${toneInstruction} ${styleInstruction} Maintain the original language. Return ONLY the improved text as plain text. No markdown symbols unless the text is a long article.`;
        break;

      case "summarize":
        systemPrompt = `You are a summarization expert. Summarize the given text concisely while preserving key information. ${toneInstruction} ${styleInstruction} Return ONLY the summary as plain text. No markdown symbols.`;
        break;

      case "expand":
        systemPrompt = `You are a content writer. Expand the given text with more detail, examples, and depth while maintaining the same style. ${toneInstruction} ${styleInstruction} Return ONLY the expanded text as plain text.`;
        break;

      case "proofread":
        systemPrompt = `You are a professional proofreader. Correct grammar, spelling, and punctuation errors. Also improve sentence flow. ${toneInstruction} Return ONLY the corrected text as plain text. No markdown symbols.`;
        break;

      case "rewrite":
        systemPrompt = `You are an expert rewriter. Rewrite the given text in a completely different way while preserving the meaning. ${toneInstruction} ${styleInstruction} Return ONLY the rewritten text as plain text. No markdown symbols.`;
        break;

      case "bullet_points":
        systemPrompt = `Extract the key points from the given text and present them as clear, concise bullet points. ${toneInstruction} Use • as bullet markers. Return ONLY the bullet points.`;
        break;

      case "headline":
        systemPrompt = `You are a headline copywriter. Generate 5 compelling, attention-grabbing headlines for the given text. ${toneInstruction} Return ONLY the headlines, one per line, numbered 1-5. No markdown symbols.`;
        break;

      case "extract_from_url":
        systemPrompt = `You are a content extraction expert. The user will give you a URL or website content. Extract the main useful content and summarize the key information from it. ${toneInstruction} ${styleInstruction} Return the extracted content as clean text.`;
        break;

      case "chat": {
        let basePrompt = systemPromptOverride 
          || `You are a professional AI business assistant for a services marketplace platform called "فنيين" (Faneen). You help business owners manage their businesses, write content, optimize their profiles, and answer questions about running a service business.`;
        
        basePrompt += ` ${toneInstruction} ${styleInstruction} Be helpful and practical. Respond in the same language as the user's message. Do NOT use markdown formatting symbols.`;
        
        if (knowledgeContext) {
          basePrompt += `\n\nIMPORTANT - Use the following knowledge base as your primary reference when answering. Always prioritize this information:\n\n${knowledgeContext}`;
        }
        
        systemPrompt = basePrompt;
        
        if (context) {
          userPrompt = `Previous conversation:\n${context}\n\nUser: ${text}`;
        }
        break;
      }

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
        ...(doStream ? { stream: true } : {}),
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

    // Streaming mode: pass through SSE
    if (doStream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
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
