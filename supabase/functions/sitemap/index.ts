import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=86400, s-maxage=86400",
  "X-Robots-Tag": "noindex",
};

const BASE = "https://faneen.com";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&apos;").replace(/"/g, "&quot;");
}

function entry(loc: string, opts: { lastmod?: string; changefreq: string; priority: string }) {
  return `  <url>
    <loc>${esc(loc)}</loc>${opts.lastmod ? `\n    <lastmod>${opts.lastmod}</lastmod>` : ""}
    <changefreq>${opts.changefreq}</changefreq>
    <priority>${opts.priority}</priority>
  </url>`;
}

function toDate(d: string | null): string {
  if (!d) return new Date().toISOString().split("T")[0];
  try { return new Date(d).toISOString().split("T")[0]; } catch { return new Date().toISOString().split("T")[0]; }
}

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const today = new Date().toISOString().split("T")[0];

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

    // Parallel fetches
    const [bizRes, postRes, catRes, cityRes, profileRes, projectRes] = await Promise.all([
      supabase.from("businesses").select("username, updated_at").eq("is_active", true).order("rating_avg", { ascending: false }).limit(50000),
      supabase.from("blog_posts").select("slug, updated_at").eq("status", "published").order("published_at", { ascending: false }).limit(10000),
      supabase.from("categories").select("slug, created_at").eq("is_active", true),
      supabase.from("cities").select("id, name_en, created_at").eq("is_active", true),
      supabase.from("profile_systems").select("slug, updated_at").eq("is_active", true).limit(10000),
      supabase.from("projects").select("id, updated_at").eq("status", "published").order("created_at", { ascending: false }).limit(10000),
    ]);

    const entries: string[] = [];

    // Static
    for (const p of staticPages) {
      entries.push(entry(`${BASE}${p.loc}`, { lastmod: today, changefreq: p.changefreq, priority: p.priority }));
    }

    // Businesses
    if (bizRes.data) {
      for (const b of bizRes.data) {
        entries.push(entry(`${BASE}/${encodeURIComponent(b.username)}`, { lastmod: toDate(b.updated_at), changefreq: "weekly", priority: "0.8" }));
      }
    }

    // Blog
    if (postRes.data) {
      for (const p of postRes.data) {
        entries.push(entry(`${BASE}/blog/${encodeURIComponent(p.slug)}`, { lastmod: toDate(p.updated_at), changefreq: "monthly", priority: "0.7" }));
      }
    }

    // Categories
    if (catRes.data) {
      for (const c of catRes.data) {
        entries.push(entry(`${BASE}/categories/${encodeURIComponent(c.slug)}`, { lastmod: toDate(c.created_at), changefreq: "weekly", priority: "0.7" }));
      }
    }

    // Cities
    if (cityRes.data) {
      for (const city of cityRes.data) {
        const slug = city.name_en?.toLowerCase().replace(/\s+/g, "-") || city.id;
        entries.push(entry(`${BASE}/search?city=${encodeURIComponent(city.id)}`, { lastmod: toDate(city.created_at), changefreq: "daily", priority: "0.7" }));
      }
    }

    // Profile systems
    if (profileRes.data) {
      for (const p of profileRes.data) {
        entries.push(entry(`${BASE}/profile-systems/${encodeURIComponent(p.slug)}`, { lastmod: toDate(p.updated_at), changefreq: "monthly", priority: "0.6" }));
      }
    }

    // Projects
    if (projectRes.data) {
      for (const p of projectRes.data) {
        entries.push(entry(`${BASE}/projects/${p.id}`, { lastmod: toDate(p.updated_at), changefreq: "monthly", priority: "0.6" }));
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

    return new Response(xml, { headers: HEADERS });
  } catch (error) {
    console.error("Sitemap error:", error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`, {
      status: 500,
      headers: { "Content-Type": "application/xml" },
    });
  }
});
