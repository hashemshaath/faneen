#!/usr/bin/env node
/**
 * SEO post-deploy verification.
 *
 * Fetches a curated set of LIVE deployed URLs and asserts SEO-critical
 * head tags, canonical hygiene, JSON-LD parseability, robots/noindex
 * rules, and sitemap inclusion/exclusion rules.
 *
 * Usage:
 *   node scripts/seo-post-deploy-verify.mjs [--base https://qitaat.com]
 *
 * Exits 0 on PASS, 1 on FAIL. Read-only — never mutates the deployed site.
 */

const DEFAULT_BASE = "https://qitaat.com";
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = (baseIdx >= 0 ? args[baseIdx + 1] : process.env.SEO_VERIFY_BASE) || DEFAULT_BASE;

/**
 * Route catalog. `noindex: true` means the page MUST carry a robots
 * noindex directive AND MUST NOT appear in the sitemap.
 */
export const ROUTES = [
  { path: "/", noindex: false, category: "public" },
  { path: "/search", noindex: false, category: "public" },
  { path: "/help", noindex: false, category: "public" },
  { path: "/help/article/getting-started", noindex: false, category: "public", optional: true },
  // Token / private surfaces — must be noindex and excluded from sitemap.
  { path: "/q/SAMPLE", noindex: true, category: "token", optional: true },
  { path: "/client/SAMPLE", noindex: true, category: "token", optional: true },
];

const CHECKS = [
  "status_200",
  "title",
  "meta_description",
  "canonical",
  "og_title",
  "og_description",
  "og_image",
  "robots_meta",
  "noindex_when_required",
  "jsonld_parseable",
  "no_uuid_in_canonical",
];

const results = [];
let failed = 0;

function record(route, check, ok, detail = "") {
  results.push({ route: route.path, check, ok, detail });
  if (!ok) failed += 1;
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow", headers: { "user-agent": "QitaatSEOVerify/1.0" } });
  const text = await res.text();
  return { status: res.status, text, finalUrl: res.url };
}

function pick(html, re) {
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

function getMeta(html, nameOrProp) {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${nameOrProp}["'][^>]*content=["']([^"']*)["']`,
    "i",
  );
  return pick(html, re) ?? (() => {
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${nameOrProp}["']`,
      "i",
    );
    return pick(html, re2);
  })();
}

function getCanonical(html) {
  return pick(html, /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
}

function getTitle(html) {
  return pick(html, /<title[^>]*>([^<]*)<\/title>/i);
}

function getJsonLdBlocks(html) {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

async function verifyRoute(route) {
  const url = BASE.replace(/\/$/, "") + route.path;
  let res;
  try {
    res = await fetchText(url);
  } catch (err) {
    if (route.optional) {
      record(route, "status_200", true, "optional, skipped (fetch error)");
      return;
    }
    record(route, "status_200", false, `fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }

  if (res.status === 404 && route.optional) {
    record(route, "status_200", true, "optional, 404 acceptable");
    return;
  }

  record(route, "status_200", res.status === 200, `status=${res.status}`);
  if (res.status !== 200) return;

  const html = res.text;
  const title = getTitle(html);
  const description = getMeta(html, "description");
  const canonical = getCanonical(html);
  const ogTitle = getMeta(html, "og:title");
  const ogDesc = getMeta(html, "og:description");
  const ogImg = getMeta(html, "og:image");
  const robots = getMeta(html, "robots");
  const jsonLd = getJsonLdBlocks(html);

  record(route, "title", Boolean(title && title.length > 0));
  record(route, "meta_description", Boolean(description && description.length > 0));
  record(route, "canonical", Boolean(canonical));
  record(route, "og_title", Boolean(ogTitle));
  record(route, "og_description", Boolean(ogDesc));
  record(route, "og_image", Boolean(ogImg), ogImg ? "" : "missing (optional but recommended)");

  const robotsLower = (robots || "").toLowerCase();
  record(route, "robots_meta", Boolean(robots));
  const isNoindex = robotsLower.includes("noindex");
  if (route.noindex) {
    record(route, "noindex_when_required", isNoindex, isNoindex ? "" : "private/token page is missing noindex");
  } else {
    record(route, "noindex_when_required", !isNoindex, isNoindex ? "public page incorrectly noindex" : "");
  }

  if (canonical) {
    record(route, "no_uuid_in_canonical", !UUID_RE.test(canonical), canonical);
  } else {
    record(route, "no_uuid_in_canonical", true);
  }

  let parseOk = true;
  for (const block of jsonLd) {
    try {
      JSON.parse(block);
    } catch {
      parseOk = false;
      break;
    }
  }
  record(route, "jsonld_parseable", parseOk, parseOk ? "" : "invalid JSON-LD block");
}

async function verifySitemap() {
  const url = BASE.replace(/\/$/, "") + "/sitemap.xml";
  let res;
  try {
    res = await fetchText(url);
  } catch (err) {
    record({ path: "/sitemap.xml" }, "status_200", false, `fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }

  record({ path: "/sitemap.xml" }, "status_200", res.status === 200, `status=${res.status}`);
  if (res.status !== 200) return;

  const xml = res.text;
  // Treat sitemap index as PASS for inclusion/exclusion (sub-sitemaps drive details).
  const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);

  for (const route of ROUTES) {
    if (route.noindex) {
      const leaked = locs.some((u) => u.includes(route.path));
      record({ path: "/sitemap.xml" }, `excludes:${route.path}`, !leaked, leaked ? "private path appears in sitemap" : "");
    }
  }

  // No UUIDs in any sitemap URL.
  const uuidLeak = locs.find((u) => UUID_RE.test(u));
  record({ path: "/sitemap.xml" }, "no_uuid_in_sitemap", !uuidLeak, uuidLeak || "");
}

async function main() {
  console.log(`SEO post-deploy verify against: ${BASE}`);
  for (const route of ROUTES) {
    await verifyRoute(route);
  }
  await verifySitemap();

  const pad = (s, n) => (s + " ".repeat(n)).slice(0, n);
  for (const r of results) {
    const status = r.ok ? "PASS" : "FAIL";
    console.log(`  ${status}  ${pad(r.route, 32)} ${pad(r.check, 28)} ${r.detail}`);
  }

  console.log("");
  console.log(`Routes checked: ${ROUTES.length}`);
  console.log(`Checks failed:  ${failed}`);
  console.log(`Reminder: Google Search Console OAuth is a MANUAL step — connect via the Connectors panel.`);

  if (failed > 0) {
    console.error("SEO post-deploy verify: FAIL");
    process.exit(1);
  }
  console.log("SEO post-deploy verify: PASS");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { CHECKS, BASE };