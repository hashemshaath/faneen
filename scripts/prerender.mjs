#!/usr/bin/env node
/**
 * P2.1 — Build-time static snapshot prerender.
 *
 * Clones dist/index.html for each target route and injects per-page
 * <title>, description, canonical, OG/Twitter, hreflang, and JSON-LD into
 * <head>, plus a crawlable content block as a SIBLING of #root. An inline
 * script removes that block before the deferred main module runs, so real
 * users never see it and React never touches it (no flash, no hydration
 * mismatch — React only ever mounts into the empty #root).
 *
 * Failure policy: any per-route or Supabase error is logged as a warning
 * and the build continues. Missing dynamic groups simply don't get
 * prerendered — the SPA still serves them at runtime.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");
const SHELL_PATH = join(DIST, "index.html");
const SITE = "https://qitaat.com";
const MAX_PROVIDERS = 2000;

if (!existsSync(SHELL_PATH)) {
  console.warn("[prerender] dist/index.html not found — skipping.");
  process.exit(0);
}

const SHELL = readFileSync(SHELL_PATH, "utf8");

function esc(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function truncate(s, n = 155) {
  if (!s) return "";
  const t = String(s).replace(/\s+/g, " ").trim();
  return t.length <= n ? t : t.slice(0, n - 1).trimEnd() + "…";
}

function renderPage(p) {
  const canonical = `${SITE}${p.path}`;
  const title = esc(p.title);
  const description = esc(truncate(p.description, 155));
  const ogImage = p.ogImage || `${SITE}/icons-512.png`;

  let html = SHELL;
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  html = html.replace(
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${description}">`,
  );
  html = html.replace(
    /<link\s+rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${esc(canonical)}" />`,
  );
  html = html.replace(
    /<link\s+rel=["']alternate["']\s+hreflang=["']ar["'][^>]*>\s*<link\s+rel=["']alternate["']\s+hreflang=["']x-default["'][^>]*>/i,
    `<link rel="alternate" hreflang="ar" href="${esc(canonical)}" />\n    <link rel="alternate" hreflang="x-default" href="${esc(canonical)}" />`,
  );

  // Strip pre-existing og:* / twitter:* meta tags from the shell so we
  // don't emit duplicates. Our fresh per-page block is injected below.
  html = html.replace(
    /\s*<meta\s+(?:property|name)=["'](?:og:[^"']+|twitter:[^"']+)["'][^>]*>/gi,
    "",
  );

  const ogBlock =
    `\n    <meta property="og:type" content="${p.ogType || "website"}" />` +
    `\n    <meta property="og:site_name" content="قِطاعات Qitaat" />` +
    `\n    <meta property="og:locale" content="ar_SA" />` +
    `\n    <meta property="og:title" content="${title}" />` +
    `\n    <meta property="og:description" content="${description}" />` +
    `\n    <meta property="og:url" content="${esc(canonical)}" />` +
    `\n    <meta property="og:image" content="${esc(ogImage)}" />` +
    `\n    <meta name="twitter:card" content="summary_large_image" />` +
    `\n    <meta name="twitter:title" content="${title}" />` +
    `\n    <meta name="twitter:description" content="${description}" />` +
    `\n    <meta name="twitter:image" content="${esc(ogImage)}" />`;

  const jsonLdBlocks = (p.jsonLd || [])
    .map(
      (obj) =>
        `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`,
    )
    .join("\n    ");

  html = html.replace(
    /<\/head>/i,
    `${ogBlock}\n    ${jsonLdBlocks}\n  </head>`,
  );

  if (p.crawlableHtml) {
    // FIX-1 (Pass-L batch c): the built shell ships with a populated
    // `<div id="root">…sitewide sr-only content…</div>` (see index.html).
    // The prior injection targeted an empty `<div id="root"></div>` which
    // never matched, so per-page crawlable text was silently dropped from
    // every prerendered page. We now replace the entire populated #root
    // with a page-specific crawlable block wrapped in the same sr-only
    // pattern; React's createRoot() atomically replaces this subtree on
    // first commit, so JS-capable visitors see zero flash.
    const inject =
      `<div id="root">` +
      `<div class="sr-only" aria-hidden="true">${p.crawlableHtml}</div>` +
      `</div>`;
    // In the built shell the module <script> is emitted in <head> (Vite
    // modulepreload target), and #root is the last element inside <body>.
    // Match the populated root by consuming everything up to </body>.
    const populatedRoot = /<div id="root">[\s\S]*<\/div>(?=\s*<\/body>)/;
    if (populatedRoot.test(html)) {
      html = html.replace(populatedRoot, inject + "\n    ");
    } else {
      // Fallback for the (unexpected) empty-root shell form.
      html = html.replace(/<div id="root"><\/div>/, inject);
    }
  }

  return html;
}

function writeRoute(path, html) {
  const cleanPath = path === "/" ? "/" : path.replace(/\/+$/, "");
  const outDir = cleanPath === "/" ? DIST : join(DIST, cleanPath);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html, "utf8");
}

function breadcrumb(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE}${it.path}`,
    })),
  };
}

// PASS-L / L1 — env-only Supabase config. No hard-coded anon-key
// fallback: the previous fallback silently pinned prerender to the
// dev project even when the workspace was pointed at a different
// Supabase, and shipped a rotating credential in the checked-in
// source. Behavior on missing env: warn loudly and skip the
// Supabase-dependent portion of prerender (static routes still ship);
// main build continues, exit code stays 0.
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "";
const SUPABASE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";
const SUPABASE_READY = Boolean(SUPABASE_URL && SUPABASE_KEY);
if (!SUPABASE_READY) {
  console.warn(
    "\n[prerender] ⚠️  SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY not set in env.\n" +
      "            Skipping dynamic (sector/blog/provider) prerender.\n" +
      "            Static routes will still be prerendered. The SPA continues\n" +
      "            to serve dynamic routes at runtime.\n",
  );
}

async function sbFetch(path) {
  if (!SUPABASE_READY) throw new Error("Supabase env not configured");
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status} on ${path}`);
  return res.json();
}
async function safeFetch(path, fallback = []) {
  try {
    return await sbFetch(path);
  } catch (e) {
    console.warn(`[prerender] Supabase fetch failed for ${path}:`, e.message);
    return fallback;
  }
}

const STATIC_PAGES = [
  {
    path: "/",
    title: "قِطاعات | مزودو الألمنيوم والحديد والزجاج بالسعودية",
    description:
      "منصة قِطاعات تجمع مزودي خدمات الألمنيوم، الحديد، الزجاج، الخشب، المطابخ، الواجهات والبوابات في السعودية. ابحث، قارن، واطلب عرض سعر بطريقة منظمة.",
    crawlableHtml:
      `<h1>قِطاعات — منصة القطاعات الصناعية في السعودية</h1>` +
      `<p>قِطاعات هي منصة سعودية تجمع مزودي خدمات الألمنيوم، الحديد، الزجاج، الخشب، المطابخ، الواجهات، والبوابات. ابحث، قارن، واطلب عروض أسعار من ورش ومصانع موثوقة.</p>` +
      `<ul><li><a href="/sectors/aluminum">الألمنيوم</a></li><li><a href="/sectors/iron">الحديد</a></li><li><a href="/sectors/glass">الزجاج</a></li><li><a href="/sectors/wood">الأخشاب</a></li><li><a href="/blog">المدونة</a></li></ul>`,
  },
  { path: "/about", title: "من نحن | قِطاعات", description: "قِطاعات منصة سعودية تربط طالبي خدمات القطاعات الصناعية بأفضل الورش والمصانع الموثوقة.", crawlableHtml: `<h1>عن قِطاعات</h1><p>منصة سعودية تربط طالبي خدمات القطاعات الصناعية بأفضل الورش والمصانع عبر نظام طلب عروض احترافي.</p>` },
  { path: "/contact", title: "تواصل معنا | قِطاعات", description: "تواصل مع فريق قِطاعات للاستفسارات، الدعم، أو الشراكة.", crawlableHtml: `<h1>تواصل معنا</h1><p>تواصل مع فريق قِطاعات عبر نموذج الاتصال لأي استفسار حول المنصة أو الشراكة.</p>` },
  { path: "/for-providers", title: "للمزودين — انضم إلى قِطاعات", description: "انضم إلى قِطاعات كمزود خدمة (ورشة، مصنع، مقاول) واستقبل طلبات عروض أسعار من عملاء جادين في السعودية.", crawlableHtml: `<h1>للمزودين</h1><p>هل تدير ورشة أو مصنع أو شركة مقاولات؟ انضم إلى قِطاعات واستقبل طلبات عروض أسعار وأدر مشاريعك بنظام احترافي.</p>` },
  { path: "/help", title: "مركز المساعدة | قِطاعات", description: "مركز المساعدة الرسمي لمنصة قِطاعات — أدلة، أسئلة شائعة، ودعم للمشترين والمزودين.", crawlableHtml: `<h1>مركز المساعدة</h1><p>ابحث في الأدلة والأسئلة الشائعة للمشترين والمزودين على قِطاعات.</p>` },
  { path: "/privacy", title: "سياسة الخصوصية | قِطاعات", description: "سياسة الخصوصية الرسمية لمنصة قِطاعات.", crawlableHtml: `<h1>سياسة الخصوصية</h1><p>تلتزم قِطاعات بحماية بياناتك الشخصية وفق أنظمة المملكة العربية السعودية.</p>` },
  { path: "/terms", title: "الشروط والأحكام | قِطاعات", description: "الشروط والأحكام الرسمية لاستخدام منصة قِطاعات.", crawlableHtml: `<h1>الشروط والأحكام</h1><p>تحكم هذه الشروط استخدامك لمنصة قِطاعات كمشتري أو مزود خدمة.</p>` },
  { path: "/sectors", title: "القطاعات الصناعية | قِطاعات", description: "استكشف جميع القطاعات الصناعية على قِطاعات: الألمنيوم، الحديد، الزجاج، الأخشاب، المطابخ، الواجهات، والمزيد.", crawlableHtml: `<h1>القطاعات الصناعية</h1><p>استكشف مزودي الخدمات في القطاعات الصناعية الرئيسية في السعودية.</p>` },
  { path: "/blog", title: "المدونة | قِطاعات", description: "أحدث المقالات والأدلة حول قطاعات الألمنيوم، الحديد، الزجاج، والصناعات المرتبطة في السعودية.", crawlableHtml: `<h1>مدونة قِطاعات</h1><p>أحدث المقالات والأدلة حول قطاعات الألمنيوم، الحديد، الزجاج، والصناعات المرتبطة.</p>` },
];

const manifest = { generatedAt: new Date().toISOString(), groups: {}, skipped: [] };
let totalWritten = 0;

function safeWrite(page) {
  try {
    const jsonLd = page.jsonLd ? [...page.jsonLd] : [];
    if (page.path !== "/") {
      jsonLd.push(
        breadcrumb([
          { name: "الرئيسية", path: "/" },
          ...(page.breadcrumbs || [{ name: page.title, path: page.path }]),
        ]),
      );
    } else {
      jsonLd.push({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "قِطاعات",
        url: SITE,
        inLanguage: "ar",
      });
    }
    const html = renderPage({ ...page, jsonLd });
    writeRoute(page.path, html);
    totalWritten++;
    return true;
  } catch (e) {
    console.warn(`[prerender] failed for ${page.path}:`, e.message);
    manifest.skipped.push({ path: page.path, reason: e.message });
    return false;
  }
}

async function run() {
  let staticCount = 0;
  for (const p of STATIC_PAGES) if (safeWrite(p)) staticCount++;
  manifest.groups.static = staticCount;

  const sectors = await safeFetch(
    "sectors?select=id,name_ar,name_en&is_active=eq.true&order=sort_order.asc",
  );
  let sectorCount = 0;
  for (const s of sectors) {
    const title = `${s.name_ar} — مزودو ${s.name_ar} في السعودية | قِطاعات`;
    const description = `استكشف أفضل مزودي وورش ومصانع ${s.name_ar} الموثوقين في المملكة العربية السعودية على قِطاعات. اطلب عروض أسعار، قارن، واختر الأنسب.`;
    const path = `/sectors/${s.id}`;
    if (
      safeWrite({
        path, title, description,
        breadcrumbs: [
          { name: "القطاعات", path: "/sectors" },
          { name: s.name_ar, path },
        ],
        crawlableHtml:
          `<h1>${esc(s.name_ar)} — مزودو الخدمات في السعودية</h1>` +
          `<p>${esc(description)}</p>` +
          `<p>اكتشف على قِطاعات نخبة من ورش ومصانع ${esc(s.name_ar)} المعتمدة، مع تقييمات حقيقية ونظام طلب عروض أسعار احترافي.</p>`,
        jsonLd: [{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: title,
          url: `${SITE}${path}`,
          inLanguage: "ar",
          about: { "@type": "Thing", name: s.name_ar },
        }],
      })
    ) sectorCount++;
  }
  manifest.groups.sectors = sectorCount;

  const posts = await safeFetch(
    "blog_posts?select=slug,title_ar,title_en,excerpt_ar,excerpt_en,meta_title_ar,meta_description_ar,cover_image_url,published_at,updated_at&status=eq.published&order=published_at.desc",
  );
  let blogCount = 0;
  for (const post of posts) {
    if (!post.slug) continue;
    const title = post.meta_title_ar || post.title_ar || post.title_en || "مقال";
    const description = post.meta_description_ar || post.excerpt_ar || post.excerpt_en || title;
    const path = `/blog/${post.slug}`;
    if (
      safeWrite({
        path,
        title: `${title} | قِطاعات`,
        description,
        ogType: "article",
        ogImage: post.cover_image_url || undefined,
        breadcrumbs: [
          { name: "المدونة", path: "/blog" },
          { name: title, path },
        ],
        crawlableHtml: `<article><h1>${esc(title)}</h1><p>${esc(description)}</p></article>`,
        jsonLd: [{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: title,
          description,
          url: `${SITE}${path}`,
          inLanguage: "ar",
          datePublished: post.published_at || undefined,
          dateModified: post.updated_at || post.published_at || undefined,
          image: post.cover_image_url || undefined,
          publisher: {
            "@type": "Organization",
            name: "قِطاعات",
            url: SITE,
            logo: { "@type": "ImageObject", url: `${SITE}/icons-512.png` },
          },
          mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}${path}` },
        }],
      })
    ) blogCount++;
  }
  manifest.groups.blog = blogCount;

  const businesses = await safeFetch(
    `businesses_public?select=username,name_ar,name_en,short_description_ar,short_description_en,description_ar,logo_url,region,updated_at&is_active=eq.true&is_verified=eq.true&approval_status=eq.published&username=not.is.null&limit=${MAX_PROVIDERS}`,
  );
  let providerCount = 0;
  for (const b of businesses) {
    if (!b.username) continue;
    const displayName = b.name_ar || b.name_en || b.username;
    const shortDesc =
      b.short_description_ar ||
      b.short_description_en ||
      (b.description_ar ? truncate(b.description_ar, 155) : "") ||
      `${displayName} — مزود خدمة موثوق على قِطاعات في السعودية.`;
    const path = `/${b.username}`;
    if (
      safeWrite({
        path,
        title: `${displayName} | قِطاعات`,
        description: shortDesc,
        ogType: "profile",
        ogImage: b.logo_url || undefined,
        breadcrumbs: [{ name: displayName, path }],
        crawlableHtml: `<h1>${esc(displayName)}</h1><p>${esc(shortDesc)}</p>`,
        jsonLd: [{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "@id": `${SITE}${path}`,
          name: displayName,
          url: `${SITE}${path}`,
          description: shortDesc,
          image: b.logo_url || undefined,
          address: {
            "@type": "PostalAddress",
            addressCountry: "SA",
            addressRegion: b.region || undefined,
          },
        }],
      })
    ) providerCount++;
  }
  manifest.groups.providers = providerCount;

  writeFileSync(
    join(DIST, "prerender-manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  console.log(
    `[prerender] wrote ${totalWritten} pages: static=${staticCount}, sectors=${sectorCount}, blog=${blogCount}, providers=${providerCount}, skipped=${manifest.skipped.length}`,
  );
}

run().catch((e) => {
  console.warn("[prerender] fatal — build continues with SPA shell:", e);
  process.exit(0);
});
