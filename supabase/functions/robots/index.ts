import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
  "Access-Control-Allow-Origin": "*",
};

const BASE = "https://qitaat.com";

const DEFAULT_ROBOTS = `User-agent: *
Allow: /
Allow: /search$
Allow: /search?city=
Allow: /search?category=
Allow: /categories/
Allow: /projects
Allow: /projects/
Allow: /offers
Allow: /blog
Allow: /blog/
Allow: /profile-systems
Allow: /profile-systems/
Allow: /compare$
Allow: /compare-profiles$
Allow: /membership
Allow: /about
Allow: /contact
Allow: /privacy
Allow: /terms

Disallow: /search?q=
Disallow: /compare?ids=
Disallow: /compare-profiles?ids=

Disallow: /admin/
Disallow: /dashboard/
Disallow: /auth
Disallow: /reset-password
Disallow: /onboarding
Disallow: /forbidden
Disallow: /unsubscribe
Disallow: /profile/settings
Disallow: /add-business/success
Disallow: /s/
Disallow: /q/

User-agent: Googlebot
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: cohere-ai
Allow: /

Sitemap: ${BASE}/sitemap.xml
Sitemap: ${BASE}/functions/v1/sitemap
`;

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check optional override in platform_settings
    const { data } = await supabase
      .from("platform_settings")
      .select("setting_value, is_active")
      .eq("setting_key", "robots_txt_custom")
      .maybeSingle();

    const custom = data?.is_active && typeof data.setting_value === "string"
      ? data.setting_value.trim()
      : "";

    const body = custom.length > 0 ? custom : DEFAULT_ROBOTS;
    return new Response(body, { headers: HEADERS });
  } catch (error) {
    console.error("robots error:", error);
    return new Response(DEFAULT_ROBOTS, { headers: HEADERS });
  }
});
