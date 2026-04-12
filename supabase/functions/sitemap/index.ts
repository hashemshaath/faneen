import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
};

const BASE_URL = "https://faneen.com";

Deno.serve(async () => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Static pages
    const staticPages = [
      { loc: "/", priority: "1.0", changefreq: "daily" },
      { loc: "/search", priority: "0.9", changefreq: "daily" },
      { loc: "/categories", priority: "0.9", changefreq: "weekly" },
      { loc: "/offers", priority: "0.8", changefreq: "daily" },
      { loc: "/projects", priority: "0.8", changefreq: "daily" },
      { loc: "/blog", priority: "0.8", changefreq: "daily" },
      { loc: "/profile-systems", priority: "0.7", changefreq: "weekly" },
      { loc: "/compare", priority: "0.6", changefreq: "weekly" },
      { loc: "/membership", priority: "0.6", changefreq: "monthly" },
      { loc: "/about", priority: "0.5", changefreq: "monthly" },
      { loc: "/contact", priority: "0.5", changefreq: "monthly" },
      { loc: "/privacy", priority: "0.3", changefreq: "yearly" },
      { loc: "/terms", priority: "0.3", changefreq: "yearly" },
    ];

    // Fetch businesses
    const { data: businesses } = await supabase
      .from("businesses")
      .select("username, updated_at")
      .eq("is_active", true)
      .order("rating_avg", { ascending: false })
      .limit(1000);

    // Fetch blog posts
    const { data: posts } = await supabase
      .from("blog_posts")
      .select("slug, updated_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1000);

    // Fetch categories
    const { data: categories } = await supabase
      .from("categories")
      .select("slug, created_at")
      .eq("is_active", true);

    // Fetch cities
    const { data: cities } = await supabase
      .from("cities")
      .select("id, name_en, created_at")
      .eq("is_active", true);

    // Fetch profile systems
    const { data: profiles } = await supabase
      .from("profile_systems")
      .select("slug, updated_at")
      .eq("is_active", true)
      .limit(500);

    // Fetch projects
    const { data: projects } = await supabase
      .from("projects")
      .select("id, updated_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(500);

    // Build XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

    // Static pages
    for (const page of staticPages) {
      xml += `  <url>
    <loc>${BASE_URL}${page.loc}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    // Businesses
    if (businesses) {
      for (const b of businesses) {
        xml += `  <url>
    <loc>${BASE_URL}/${encodeURIComponent(b.username)}</loc>
    <lastmod>${new Date(b.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      }
    }

    // Blog posts
    if (posts) {
      for (const p of posts) {
        xml += `  <url>
    <loc>${BASE_URL}/blog/${encodeURIComponent(p.slug)}</loc>
    <lastmod>${new Date(p.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }
    }

    // Categories
    if (categories) {
      for (const c of categories) {
        xml += `  <url>
    <loc>${BASE_URL}/categories/${encodeURIComponent(c.slug)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }
    }

    // Profile systems
    if (profiles) {
      for (const p of profiles) {
        xml += `  <url>
    <loc>${BASE_URL}/profile-systems/${encodeURIComponent(p.slug)}</loc>
    <lastmod>${new Date(p.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
      }
    }

    // Projects
    if (projects) {
      for (const p of projects) {
        xml += `  <url>
    <loc>${BASE_URL}/projects/${p.id}</loc>
    <lastmod>${new Date(p.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
      }
    }

    xml += `</urlset>`;

    return new Response(xml, { headers: corsHeaders });
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return new Response("<error>Failed to generate sitemap</error>", {
      status: 500,
      headers: { "Content-Type": "application/xml" },
    });
  }
});
