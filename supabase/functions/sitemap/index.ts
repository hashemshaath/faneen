import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=86400, s-maxage=86400",
  "X-Robots-Tag": "noindex",
};

const BASE = "https://qitaat.com";
const FUNC = `${BASE}/functions/v1/sitemap`;

const TYPES = ["static", "businesses", "blog", "categories", "cities", "profiles", "projects"] as const;
type SitemapType = (typeof TYPES)[number];

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

function wrapUrlset(entries: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;
}

function buildIndex(today: string): string {
  const sitemaps = TYPES.map(
    (t) => `  <sitemap>
    <loc>${esc(`${FUNC}?type=${t}`)}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.join("\n")}
</sitemapindex>`;
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") as SitemapType | null;
    const today = new Date().toISOString().split("T")[0];

    // No type → return sitemap index
    if (!type || !TYPES.includes(type)) {
      return new Response(buildIndex(today), { headers: HEADERS });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const entries: string[] = [];

    if (type === "static") {
      const staticPages = [
        { loc: "/", priority: "1.0", changefreq: "daily" },
        { loc: "/search", priority: "0.9", changefreq: "daily" },
        { loc: "/categories", priority: "0.9", changefreq: "weekly" },
        { loc: "/offers", priority: "0.8", changefreq: "daily" },
        { loc: "/projects", priority: "0.8", changefreq: "daily" },
        { loc: "/blog", priority: "0.8", changefreq: "daily" },
        { loc: "/profile-systems", priority: "0.7", changefreq: "weekly" },
        { loc: "/compare", priority: "0.6", changefreq: "weekly" },
        { loc: "/compare-profiles", priority: "0.6", changefreq: "weekly" },
        { loc: "/membership", priority: "0.6", changefreq: "monthly" },
        { loc: "/about", priority: "0.5", changefreq: "monthly" },
        { loc: "/contact", priority: "0.5", changefreq: "monthly" },
        { loc: "/privacy", priority: "0.3", changefreq: "yearly" },
        { loc: "/terms", priority: "0.3", changefreq: "yearly" },
      ];
      for (const p of staticPages) {
        entries.push(entry(`${BASE}${p.loc}`, { lastmod: today, changefreq: p.changefreq, priority: p.priority }));
      }
    } else if (type === "businesses") {
      const { data } = await supabase.from("businesses").select("username, updated_at").eq("is_active", true).order("rating_avg", { ascending: false }).limit(50000);
      if (data) {
        for (const b of data) {
          entries.push(entry(`${BASE}/${encodeURIComponent(b.username)}`, { lastmod: toDate(b.updated_at), changefreq: "weekly", priority: "0.8" }));
        }
      }
    } else if (type === "blog") {
      const { data } = await supabase.from("blog_posts").select("slug, updated_at").eq("status", "published").order("published_at", { ascending: false }).limit(10000);
      if (data) {
        for (const p of data) {
          entries.push(entry(`${BASE}/blog/${encodeURIComponent(p.slug)}`, { lastmod: toDate(p.updated_at), changefreq: "monthly", priority: "0.7" }));
        }
      }
    } else if (type === "categories") {
      const { data } = await supabase.from("categories").select("id, slug, updated_at, created_at").eq("is_active", true);
      if (data) {
        for (const c of data) {
          entries.push(entry(`${BASE}/categories/${encodeURIComponent(c.slug)}`, { lastmod: toDate(c.updated_at ?? c.created_at), changefreq: "weekly", priority: "0.7" }));
          entries.push(entry(`${BASE}/search?category=${encodeURIComponent(c.id)}`, { lastmod: toDate(c.updated_at ?? c.created_at), changefreq: "daily", priority: "0.7" }));
        }
      }
    } else if (type === "cities") {
      const { data } = await supabase.from("cities").select("id, name_en, updated_at, created_at").eq("is_active", true);
      if (data) {
        for (const city of data) {
          entries.push(entry(`${BASE}/search?city=${encodeURIComponent(city.id)}`, { lastmod: toDate(city.updated_at ?? city.created_at), changefreq: "daily", priority: "0.7" }));
        }
      }
    } else if (type === "profiles") {
      const { data } = await supabase.from("profile_systems").select("slug, updated_at").eq("status", "published").limit(10000);
      if (data) {
        for (const p of data) {
          entries.push(entry(`${BASE}/profile-systems/${encodeURIComponent(p.slug)}`, { lastmod: toDate(p.updated_at), changefreq: "monthly", priority: "0.6" }));
        }
      }
    } else if (type === "projects") {
      const { data } = await supabase.from("projects").select("id, updated_at").eq("status", "published").order("created_at", { ascending: false }).limit(10000);
      if (data) {
        for (const p of data) {
          entries.push(entry(`${BASE}/projects/${p.id}`, { lastmod: toDate(p.updated_at), changefreq: "monthly", priority: "0.6" }));
        }
      }
    }

    return new Response(wrapUrlset(entries), { headers: HEADERS });
  } catch (error) {
    console.error("Sitemap error:", error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></sitemapindex>`, {
      status: 500,
      headers: { "Content-Type": "application/xml" },
    });
  }
});
