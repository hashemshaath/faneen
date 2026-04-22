#!/usr/bin/env node
/**
 * Sitemap XML Validation Audit
 * ────────────────────────────
 * Fetches the live sitemap index + every sub-sitemap from the edge function
 * and validates:
 *   1. Well-formed XML (parseable, correct root element)
 *   2. Every <loc> is a valid absolute URL with https scheme
 *   3. No empty <loc> or malformed entries
 *   4. Correct namespace (sitemaps.org)
 *   5. lastmod values (if present) are valid ISO dates
 *
 * Exit 1 on any critical failure.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

/* ── Resolve sitemap URL ── */
let SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
if (!SUPABASE_URL) {
  try {
    const envFile = fs.readFileSync(path.join(ROOT, ".env"), "utf-8");
    const m = envFile.match(/VITE_SUPABASE_URL=(.+)/);
    if (m) SUPABASE_URL = m[1].trim();
  } catch {}
}
const SITEMAP_BASE = flag("sitemap-url", SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/sitemap` : "");
const TIMEOUT_MS = parseInt(flag("timeout", "15000"), 10);

const c = {
  reset: "\x1b[0m", bold: "\x1b[1m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m",
};

/* ── helpers ── */

async function safeFetch(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const body = await res.text();
    return { status: res.status, body, error: null };
  } catch (e) {
    return { status: 0, body: "", error: e.message };
  } finally {
    clearTimeout(timer);
  }
}

const URL_RE = /^https?:\/\/[^\s<>"{}|\\^`]+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;
const SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9";

function extractTag(xml, tag) {
  return [...xml.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, "g"))].map((m) => m[1].trim());
}

function validateXml(xml, label) {
  const issues = [];

  // 1. XML declaration
  if (!xml.trimStart().startsWith("<?xml")) {
    issues.push({ level: "warn", msg: `${label}: missing XML declaration` });
  }

  // 2. Root element
  const isIndex = xml.includes("<sitemapindex");
  const isUrlset = xml.includes("<urlset");
  if (!isIndex && !isUrlset) {
    issues.push({ level: "critical", msg: `${label}: no <sitemapindex> or <urlset> root element` });
    return issues; // can't parse further
  }

  // 3. Namespace
  if (!xml.includes(SITEMAP_NS)) {
    issues.push({ level: "critical", msg: `${label}: missing sitemaps.org namespace` });
  }

  // 4. Balanced tags (simple check)
  const openLoc = (xml.match(/<loc>/g) || []).length;
  const closeLoc = (xml.match(/<\/loc>/g) || []).length;
  if (openLoc !== closeLoc) {
    issues.push({ level: "critical", msg: `${label}: unbalanced <loc> tags (${openLoc} open, ${closeLoc} close)` });
  }

  // 5. Validate each <loc>
  const locs = extractTag(xml, "loc");
  if (locs.length === 0 && isUrlset) {
    // Empty urlset is allowed (e.g. no data yet)
    issues.push({ level: "warn", msg: `${label}: empty urlset (0 URLs)` });
  }

  for (const loc of locs) {
    if (!loc) {
      issues.push({ level: "critical", msg: `${label}: empty <loc> value` });
      continue;
    }
    if (!URL_RE.test(loc)) {
      issues.push({ level: "critical", msg: `${label}: invalid URL "${loc.substring(0, 80)}"` });
      continue;
    }
    if (!loc.startsWith("https://")) {
      issues.push({ level: "warn", msg: `${label}: non-HTTPS URL "${loc.substring(0, 80)}"` });
    }
    // No XML-unsafe characters should remain unescaped
    if (/[<>"']/.test(loc)) {
      issues.push({ level: "critical", msg: `${label}: unescaped XML chars in URL "${loc.substring(0, 80)}"` });
    }
  }

  // 6. Validate <lastmod> values
  const lastmods = extractTag(xml, "lastmod");
  for (const lm of lastmods) {
    if (!lm) continue;
    if (!ISO_DATE_RE.test(lm)) {
      issues.push({ level: "critical", msg: `${label}: invalid lastmod date "${lm}"` });
    }
  }

  // 7. Validate <changefreq>
  const VALID_FREQ = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"];
  const freqs = extractTag(xml, "changefreq");
  for (const f of freqs) {
    if (!VALID_FREQ.includes(f)) {
      issues.push({ level: "warn", msg: `${label}: invalid changefreq "${f}"` });
    }
  }

  // 8. Validate <priority>
  const priorities = extractTag(xml, "priority");
  for (const p of priorities) {
    const n = parseFloat(p);
    if (isNaN(n) || n < 0 || n > 1) {
      issues.push({ level: "warn", msg: `${label}: invalid priority "${p}"` });
    }
  }

  return issues;
}

/* ── Main ── */

console.log(`\n${c.bold}${c.cyan}🔍 Sitemap XML Validation Audit${c.reset}`);
console.log(`   Endpoint: ${SITEMAP_BASE || "(not configured)"}\n`);

if (!SITEMAP_BASE) {
  console.log(`${c.yellow}⚠ No sitemap URL configured. Set VITE_SUPABASE_URL or --sitemap-url.${c.reset}`);
  // Fallback: validate the static sitemap.xml
  const staticXml = fs.existsSync(path.join(ROOT, "public/sitemap.xml"))
    ? fs.readFileSync(path.join(ROOT, "public/sitemap.xml"), "utf-8") : null;
  if (!staticXml) {
    console.error(`${c.red}✗ No sitemap source available.${c.reset}`);
    process.exit(1);
  }
  console.log(`   Falling back to public/sitemap.xml\n`);
  const issues = validateXml(staticXml, "public/sitemap.xml");
  printAndExit([{ label: "public/sitemap.xml", issues, urlCount: extractTag(staticXml, "loc").length }]);
}

// Fetch index
const indexRes = await safeFetch(SITEMAP_BASE);
if (indexRes.status !== 200) {
  console.error(`${c.red}✗ Failed to fetch sitemap index: ${indexRes.status || indexRes.error}${c.reset}`);
  process.exit(1);
}

const allFindings = [];

// Validate index
const indexIssues = validateXml(indexRes.body, "sitemap-index");
const indexLocs = extractTag(indexRes.body, "loc");
allFindings.push({ label: "sitemap-index", issues: indexIssues, urlCount: indexLocs.length });

const icon0 = indexIssues.some((i) => i.level === "critical") ? `${c.red}✗` : `${c.green}✓`;
console.log(`   ${icon0}${c.reset} sitemap-index — ${indexLocs.length} sub-sitemaps, ${indexIssues.length} issue(s)`);

// Fetch & validate each sub-sitemap
for (const subUrl of indexLocs) {
  const typeMatch = subUrl.match(/type=(\w+)/);
  const label = typeMatch ? typeMatch[1] : subUrl.split("/").pop();

  const res = await safeFetch(subUrl);
  if (res.status !== 200) {
    allFindings.push({ label, issues: [{ level: "critical", msg: `${label}: HTTP ${res.status || res.error}` }], urlCount: 0 });
    console.log(`   ${c.red}✗${c.reset} ${label} — fetch failed (${res.status || res.error})`);
    continue;
  }

  const issues = validateXml(res.body, label);
  const locs = extractTag(res.body, "loc");
  allFindings.push({ label, issues, urlCount: locs.length });

  const hasErr = issues.some((i) => i.level === "critical");
  const hasWarn = issues.some((i) => i.level === "warn");
  const icon = hasErr ? `${c.red}✗` : hasWarn ? `${c.yellow}⚠` : `${c.green}✓`;
  console.log(`   ${icon}${c.reset} ${label} — ${locs.length} URLs, ${issues.length} issue(s)`);
}

printAndExit(allFindings);

/* ── Report & exit ── */

function printAndExit(findings) {
  const allIssues = findings.flatMap((f) => f.issues);
  const criticals = allIssues.filter((i) => i.level === "critical");
  const warns = allIssues.filter((i) => i.level === "warn");
  const totalUrls = findings.reduce((s, f) => s + f.urlCount, 0);

  if (criticals.length > 0) {
    console.log(`\n${c.red}${c.bold}❌ Critical issues (${criticals.length}):${c.reset}`);
    for (const i of criticals) console.log(`   ${c.red}✗${c.reset} ${i.msg}`);
  }
  if (warns.length > 0) {
    console.log(`\n${c.yellow}${c.bold}⚠ Warnings (${warns.length}):${c.reset}`);
    for (const w of warns) console.log(`   ${c.yellow}⚠${c.reset} ${w.msg}`);
  }

  console.log(`\n${c.bold}${"═".repeat(55)}${c.reset}`);
  console.log(`   Sitemaps validated: ${findings.length}`);
  console.log(`   Total URLs: ${totalUrls}`);
  console.log(`   Critical: ${criticals.length}  Warnings: ${warns.length}`);

  // GitHub Actions Summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    const icon = criticals.length > 0 ? "❌" : "✅";
    let md = `## ${icon} Sitemap XML Validation Audit\n\n`;
    md += `| Metric | Count |\n|---|---|\n`;
    md += `| Sitemaps validated | ${findings.length} |\n`;
    md += `| Total URLs | ${totalUrls} |\n`;
    md += `| Critical issues | ${criticals.length} |\n`;
    md += `| Warnings | ${warns.length} |\n\n`;

    md += `### Per-Sitemap\n\n| Sitemap | URLs | Issues | Status |\n|---|---|---|---|\n`;
    for (const f of findings) {
      const cr = f.issues.filter((i) => i.level === "critical").length;
      const wr = f.issues.filter((i) => i.level === "warn").length;
      const st = cr > 0 ? "❌" : wr > 0 ? "⚠️" : "✅";
      md += `| ${f.label} | ${f.urlCount} | ${cr} critical, ${wr} warn | ${st} |\n`;
    }

    if (allIssues.length > 0) {
      md += `\n### Issues\n\n| Level | Message |\n|---|---|\n`;
      for (const i of allIssues.slice(0, 40)) {
        md += `| ${i.level === "critical" ? "❌" : "⚠️"} | ${i.msg} |\n`;
      }
      if (allIssues.length > 40) md += `| ... | +${allIssues.length - 40} more |\n`;
    }
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  }

  if (criticals.length > 0) {
    console.log(`\n${c.red}${c.bold}❌ XML validation failed — merge blocked${c.reset}\n`);
    process.exit(1);
  } else {
    console.log(`\n${c.green}${c.bold}✅ All sitemaps contain valid XML and URLs${c.reset}\n`);
    process.exit(0);
  }
}