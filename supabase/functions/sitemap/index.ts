import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=86400, s-maxage=86400",
  "X-Robots-Tag": "noindex",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "content-type, last-modified, etag",
};

const BASE = "https://qitaat.com";
// Sub-sitemap URLs are exposed under the public custom domain so we
// don't leak the internal Supabase Functions host in robots/sitemap output.
const FUNC = `${BASE}/functions/v1/sitemap`;

const TYPES = ["static", "businesses", "branches", "blog", "categories", "cities", "profiles", "projects", "sectors", "services", "brands", "help", "rentals"] as const;
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

/** Like toDate, but returns null when no real source date is available so
 *  callers can omit <lastmod> instead of writing today as a fake value. */
function toDateOrNull(d: string | null | undefined): string | null {
  if (!d) return null;
  try { return new Date(d).toISOString().split("T")[0]; } catch { return null; }
}

function wrapUrlset(entries: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;
}

function buildIndex(_today: string): string {
  const sitemaps = TYPES.map(
    (t) => `  <sitemap>
    <loc>${esc(`${FUNC}?type=${t}`)}</loc>
  </sitemap>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.join("\n")}
</sitemapindex>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: HEADERS });
  }
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
      // Compute a real lastmod for content-driven landing pages by reading
      // the most-recent updated_at from the underlying public dataset.
      // Pure marketing pages keep no <lastmod> (omission is valid per the
      // sitemap spec and preferred over a fabricated date).
      async function maxUpdated(table: string, filter?: (q: ReturnType<typeof supabase.from>) => unknown): Promise<string | null> {
        try {
          let q = supabase.from(table).select("updated_at").order("updated_at", { ascending: false }).limit(1);
          if (filter) q = filter(q) as typeof q;
          const { data } = await q;
          return toDateOrNull(data?.[0]?.updated_at ?? null);
        } catch { return null; }
      }
      const [
        lmBusinesses, lmCategories, lmBlog, lmProjects, lmProfiles, lmBrands, lmRentals, lmHelp,
      ] = await Promise.all([
        maxUpdated("businesses", (q) => (q as { eq: (k: string, v: unknown) => unknown }).eq("approval_status", "published")),
        maxUpdated("taxonomy_categories", (q) => (q as { eq: (k: string, v: unknown) => unknown }).eq("is_public", true)),
        maxUpdated("blog_posts", (q) => (q as { eq: (k: string, v: unknown) => unknown }).eq("status", "published")),
        maxUpdated("projects", (q) => (q as { eq: (k: string, v: unknown) => unknown }).eq("status", "published")),
        maxUpdated("profile_systems", (q) => (q as { eq: (k: string, v: unknown) => unknown }).eq("status", "published")),
        maxUpdated("brands_public"),
        maxUpdated("rental_items", (q) => (q as { eq: (k: string, v: unknown) => unknown }).eq("is_published", true)),
        maxUpdated("help_articles", (q) => (q as { eq: (k: string, v: unknown) => unknown }).eq("status", "published")),
      ]);
      const staticPages: Array<{ loc: string; priority: string; changefreq: string; lastmod: string | null }> = [
        { loc: "/", priority: "1.0", changefreq: "daily", lastmod: lmBusinesses ?? lmBlog ?? null },
        { loc: "/search", priority: "0.9", changefreq: "daily", lastmod: lmBusinesses },
        { loc: "/categories", priority: "0.9", changefreq: "weekly", lastmod: lmCategories },
        { loc: "/offers", priority: "0.8", changefreq: "daily", lastmod: lmBusinesses },
        { loc: "/projects", priority: "0.8", changefreq: "daily", lastmod: lmProjects },
        { loc: "/blog", priority: "0.8", changefreq: "daily", lastmod: lmBlog },
        { loc: "/guides", priority: "0.7", changefreq: "weekly", lastmod: null },
        { loc: "/guides/heavy-equipment-rental-saudi-arabia", priority: "0.75", changefreq: "monthly", lastmod: null },
        { loc: "/profile-systems", priority: "0.7", changefreq: "weekly", lastmod: lmProfiles },
        { loc: "/brands", priority: "0.85", changefreq: "daily", lastmod: lmBrands },
        { loc: "/rentals", priority: "0.85", changefreq: "daily", lastmod: lmRentals },
        { loc: "/compare", priority: "0.6", changefreq: "weekly", lastmod: null },
        { loc: "/compare-profiles", priority: "0.6", changefreq: "weekly", lastmod: null },
        { loc: "/membership", priority: "0.6", changefreq: "monthly", lastmod: null },
        { loc: "/for-providers", priority: "0.9", changefreq: "weekly", lastmod: null },
        { loc: "/join-as-provider", priority: "0.8", changefreq: "weekly", lastmod: null },
        { loc: "/about", priority: "0.5", changefreq: "monthly", lastmod: null },
        { loc: "/contact", priority: "0.5", changefreq: "monthly", lastmod: null },
        { loc: "/help", priority: "0.6", changefreq: "weekly", lastmod: lmHelp },
        { loc: "/privacy", priority: "0.3", changefreq: "yearly", lastmod: null },
        { loc: "/terms", priority: "0.3", changefreq: "yearly", lastmod: null },
      ];
      for (const p of staticPages) {
        entries.push(entry(`${BASE}${p.loc}`, { lastmod: p.lastmod ?? undefined, changefreq: p.changefreq, priority: p.priority }));
      }
    } else if (type === "sectors") {
      const sectors = [
        "aluminum", "iron", "glass", "wood", "cabinets",
        "steel", "stainless-steel", "fabrication-installation",
      ];
      // Map of SA city URL slug → cities.name_en (mirrors src/lib/sa-cities.ts).
      // Only the cities present in this map can ever appear as
      // /sectors/:sector/:city, and they're emitted only when there is
      // at least one published, non-demo, active business in that city.
      const saCities: Array<{ slug: string; name_en: string }> = [
        { slug: "riyadh", name_en: "Riyadh" },
        { slug: "jeddah", name_en: "Jeddah" },
        { slug: "makkah", name_en: "Makkah" },
        { slug: "madinah", name_en: "Madinah" },
        { slug: "dammam", name_en: "Dammam" },
        { slug: "khobar", name_en: "Khobar" },
        { slug: "taif", name_en: "Taif" },
        { slug: "buraidah", name_en: "Buraidah" },
        { slug: "tabuk", name_en: "Tabuk" },
        { slug: "abha", name_en: "Abha" },
        { slug: "khamis-mushait", name_en: "Khamis Mushait" },
        { slug: "hail", name_en: "Hail" },
        { slug: "jazan", name_en: "Jazan" },
        { slug: "najran", name_en: "Najran" },
        { slug: "yanbu", name_en: "Yanbu" },
      ];

      // Pull every published business with city + updated_at, then group in
      // memory: cheaper than 15+ round-trips and avoids RPC.
      const { data: bizRows } = await supabase
        .from("businesses")
        .select("updated_at, cities!inner(name_en)")
        .eq("is_active", true)
        .eq("approval_status", "published")
        .eq("is_demo", false)
        .limit(50000);

      const byCity = new Map<string, string>(); // name_en → max updated_at
      let globalMax: string | null = null;
      for (const row of (bizRows as Array<{ updated_at: string | null; cities: { name_en?: string } | null }> | null) ?? []) {
        const name = row?.cities?.name_en ?? null;
        const u = row?.updated_at ?? null;
        if (!u) continue;
        if (!globalMax || u > globalMax) globalMax = u;
        if (!name) continue;
        const prev = byCity.get(name);
        if (!prev || u > prev) byCity.set(name, u);
      }

      const sectorsLm = toDateOrNull(globalMax) ?? undefined;
      entries.push(entry(`${BASE}/sectors`, { lastmod: sectorsLm, changefreq: "weekly", priority: "0.8" }));
      for (const s of sectors) {
        entries.push(entry(`${BASE}/sectors/${s}`, { lastmod: sectorsLm, changefreq: "weekly", priority: "0.85" }));
        for (const c of saCities) {
          const lm = byCity.get(c.name_en);
          // SAFE GATING: emit /sectors/:sector/:city ONLY when the city has
          // at least one published business. Cities with no live content
          // are intentionally omitted so we don't ship thin SEO pages.
          if (!lm) continue;
          entries.push(entry(`${BASE}/sectors/${s}/${c.slug}`, {
            lastmod: toDateOrNull(lm) ?? undefined,
            changefreq: "weekly",
            priority: "0.75",
          }));
        }
      }
    } else if (type === "services") {
      const services = [
        "aluminum-windows","aluminum-cladding","aluminum-pergolas",
        "steel-canopies","iron-gates","glass-shopfronts","glass-shower-cabins",
        "wood-doors","wood-flooring","kitchen-cabinets","wardrobes",
      ];
      entries.push(entry(`${BASE}/services`, { changefreq: "weekly", priority: "0.8" } as { changefreq: string; priority: string }));
      for (const s of services) {
        entries.push(entry(`${BASE}/services/${s}`, { changefreq: "weekly", priority: "0.7" } as { changefreq: string; priority: string }));
      }
    } else if (type === "businesses") {
      // SEO-1 — align with `businesses_public` filters so pending / rejected /
      // demo / unpublished providers never reach the sitemap. The columns
      // selected match what's exposed by the public view; using the raw
      // `businesses` table here is intentional only because we need
      // service-role access for the full page count, and the filters below
      // mirror the public view definition exactly:
      //   is_active = true
      //   approval_status = 'published'
      //   is_demo = false
      const { data } = await supabase
        .from("businesses")
        .select("username, updated_at")
        .eq("is_active", true)
        .eq("approval_status", "published")
        .eq("is_demo", false)
        .not("username", "is", null)
        .order("rating_avg", { ascending: false })
        .limit(50000);
      if (data) {
        for (const b of data) {
          if (!b.username) continue;
          entries.push(entry(`${BASE}/${encodeURIComponent(b.username)}`, { lastmod: toDate(b.updated_at), changefreq: "weekly", priority: "0.8" }));
        }
      }
    } else if (type === "branches") {
      // Public branch pages live at `/{username}/{branch.slug}`. Only emit entries
      // that have a real slug — never expose ref-based ids like `loc1000003`.
      const { data: branches } = await supabase
        .from("business_branches_public")
        .select("business_id, slug, updated_at")
        .not("slug", "is", null)
        .limit(50000);
      if (branches && branches.length > 0) {
        const bizIds = Array.from(new Set(branches.map((b) => b.business_id).filter(Boolean) as string[]));
        const { data: bizRows } = await supabase
          .from("businesses")
          .select("id, username, is_active, approval_status, is_demo")
          .in("id", bizIds);
        const usernameByBiz = new Map<string, string>();
        for (const b of bizRows ?? []) {
          if (b.is_active && b.approval_status === "published" && !b.is_demo && b.username) {
            usernameByBiz.set(b.id as string, b.username as string);
          }
        }
        for (const br of branches) {
          const slug = (br as { slug?: string | null }).slug;
          // Skip legacy numeric/ref-style slugs to keep the index clean
          if (!slug || /^loc\d+$/i.test(slug)) continue;
          const uname = usernameByBiz.get(br.business_id as string);
          if (!uname) continue;
          entries.push(entry(`${BASE}/${encodeURIComponent(uname)}/${encodeURIComponent(slug)}`, {
            lastmod: toDate((br as { updated_at?: string | null }).updated_at ?? null),
            changefreq: "weekly",
            priority: "0.75",
          }));
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
      // Phase 19c: source category sitemap entries from the unified taxonomy.
      // Only include public, active, non-archived nodes flagged for SEO.
      const { data, error } = await supabase
        .from("taxonomy_categories")
        .select("id, slug, created_at, updated_at")
        .eq("is_active", true)
        .eq("is_public", true)
        .eq("is_archived", false)
        .or("show_in_seo.eq.true,show_in_search.eq.true");
      if (error) console.error("categories sitemap error:", error.message);
      if (data) {
        for (const c of data) {
          const lm = toDate((c as { updated_at?: string | null; created_at?: string | null }).updated_at ?? c.created_at);
          entries.push(entry(`${BASE}/categories/${encodeURIComponent(c.slug)}`, { lastmod: lm, changefreq: "weekly", priority: "0.7" }));
          entries.push(entry(`${BASE}/search?category=${encodeURIComponent(c.id)}`, { lastmod: lm, changefreq: "daily", priority: "0.7" }));
        }
      }
    } else if (type === "cities") {
      const { data, error } = await supabase.from("cities").select("id, name_en, created_at, updated_at").eq("is_active", true);
      if (error) console.error("cities sitemap error:", error.message);
      if (data) {
        for (const city of data) {
          const lm = toDate((city as { updated_at?: string | null; created_at?: string | null }).updated_at ?? city.created_at);
          entries.push(entry(`${BASE}/search?city=${encodeURIComponent(city.id)}`, { lastmod: lm, changefreq: "daily", priority: "0.7" }));
        }
      }
    } else if (type === "profiles") {
      const { data } = await supabase.from("profile_systems").select("slug, updated_at").eq("status", "published").limit(10000);
      if (data) {
        for (const p of data) {
          entries.push(entry(`${BASE}/profile-systems/${encodeURIComponent(p.slug)}`, { lastmod: toDate(p.updated_at), changefreq: "monthly", priority: "0.6" }));
        }
      }
      // Per-category SEO landing pages for /profile-systems.
      const profileCategories = ["aluminum", "kitchen", "iron", "glass", "wood", "upvc"];
      for (const c of profileCategories) {
        entries.push(entry(`${BASE}/profile-systems/category/${c}`, { changefreq: "weekly", priority: "0.75" } as { changefreq: string; priority: string }));
      }
    } else if (type === "projects") {
      const { data } = await supabase.from("projects").select("id, updated_at").eq("status", "published").order("created_at", { ascending: false }).limit(10000);
      if (data) {
        for (const p of data) {
          entries.push(entry(`${BASE}/projects/${p.id}`, { lastmod: toDate(p.updated_at), changefreq: "monthly", priority: "0.6" }));
        }
      }
    } else if (type === "brands") {
      const { data, error } = await supabase
        .from("brands_public")
        .select("slug, created_at")
        .limit(10000);
      if (error) console.error("brands sitemap error:", error.message);
      if (data) {
        for (const b of data) {
          if (!b.slug) continue;
          entries.push(entry(`${BASE}/brands/${encodeURIComponent(b.slug)}`, {
            lastmod: toDate((b as { created_at?: string | null }).created_at ?? null),
            changefreq: "weekly",
            priority: "0.7",
          }));
        }
      }
    } else if (type === "help") {
      // Help Center: index home, every published category, and every published article.
      const { data: helpLm } = await supabase
        .from("help_articles")
        .select("updated_at")
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(1);
      const helpHomeLm = toDateOrNull(helpLm?.[0]?.updated_at ?? null) ?? undefined;
      entries.push(entry(`${BASE}/help`, { lastmod: helpHomeLm, changefreq: "weekly", priority: "0.7" }));
      const { data: cats, error: catErr } = await supabase
        .from("help_categories")
        .select("slug, updated_at")
        .limit(1000);
      if (catErr) console.error("help categories sitemap error:", catErr.message);
      if (cats) {
        for (const c of cats) {
          entries.push(entry(`${BASE}/help/category/${encodeURIComponent(c.slug)}`, {
            lastmod: toDate((c as { updated_at?: string | null }).updated_at ?? null),
            changefreq: "weekly",
            priority: "0.6",
          }));
        }
      }
      const { data: arts, error: artErr } = await supabase
        .from("help_articles")
        .select("slug, updated_at")
        .eq("status", "published")
        .limit(10000);
      if (artErr) console.error("help articles sitemap error:", artErr.message);
      if (arts) {
        for (const a of arts) {
          entries.push(entry(`${BASE}/help/article/${encodeURIComponent(a.slug)}`, {
            lastmod: toDate(a.updated_at),
            changefreq: "monthly",
            priority: "0.6",
          }));
        }
      }
    } else if (type === "rentals") {
      // Public rental items: only published & approved entries with a real SEO slug.
      // Mirrors the filters used by RentalItems.listPublishedItems / getPublishedItemBySlug
      // so the sitemap never advertises pending / rejected / unpublished items.
      entries.push(entry(`${BASE}/rentals`, { changefreq: "daily", priority: "0.85" } as { changefreq: string; priority: string }));
      const { data, error } = await supabase
        .from("rental_items")
        .select("seo_slug, updated_at")
        .eq("is_published", true)
        .eq("status", "approved")
        .not("seo_slug", "is", null)
        .limit(10000);
      if (error) console.error("rentals sitemap error:", error.message);
      if (data) {
        for (const r of data) {
          const slug = (r as { seo_slug?: string | null }).seo_slug;
          if (!slug) continue;
          entries.push(entry(`${BASE}/rentals/${encodeURIComponent(slug)}`, {
            lastmod: toDate((r as { updated_at?: string | null }).updated_at ?? null),
            changefreq: "weekly",
            priority: "0.7",
          }));
        }
      }
    }

    return new Response(wrapUrlset(entries), { headers: HEADERS });
  } catch (error) {
    console.error("Sitemap error:", error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></sitemapindex>`, {
      status: 500,
      headers: HEADERS,
    });
  }
});
